import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, ilike } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CourseCatalogService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async browseCourses(orgId: string, filters: { difficulty?: string; format?: string; type?: string; search?: string }) {
    const conditions: any[] = [
      eq(schema.courses.orgId, orgId),
      eq(schema.courses.isActive, true),
    ];
    if (filters.difficulty) conditions.push(eq(schema.courses.difficulty, filters.difficulty));
    if (filters.format) conditions.push(eq(schema.courses.format, filters.format));
    if (filters.type) conditions.push(eq(schema.courses.type, filters.type));
    if (filters.search) conditions.push(ilike(schema.courses.title, `%${filters.search}%`));

    const rows = await this.db
      .select()
      .from(schema.courses)
      .where(and(...conditions))
      .orderBy(desc(schema.courses.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async getCourseDetail(orgId: string, userId: string, courseId: string) {
    const [course] = await this.db
      .select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, courseId),
          eq(schema.courses.orgId, orgId),
          eq(schema.courses.isActive, true),
        ),
      )
      .limit(1);

    if (!course) throw new NotFoundException('Course not found');

    // Check if user is enrolled
    const [enrollment] = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.courseId, courseId),
          eq(schema.courseEnrollments.employeeId, userId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      )
      .limit(1);

    // Get reviews for this course
    const reviews = await this.db
      .select({
        rating: schema.courseEnrollments.rating,
        review: schema.courseEnrollments.review,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.courseEnrollments.updatedAt,
      })
      .from(schema.courseEnrollments)
      .innerJoin(schema.users, eq(schema.courseEnrollments.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.courseId, courseId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      );

    const courseReviews = reviews
      .filter((r) => r.rating !== null)
      .map((r) => ({
        rating: r.rating,
        review: r.review,
        reviewerName: `${r.firstName} ${r.lastName}`,
        date: r.createdAt,
      }));

    return {
      ...course,
      isEnrolled: !!enrollment,
      enrollmentStatus: enrollment?.status ?? null,
      enrollmentProgress: enrollment?.progress ?? null,
      reviews: courseReviews,
    };
  }

  async selfEnroll(orgId: string, userId: string, courseId: string) {
    // Verify course exists
    const [course] = await this.db
      .select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, courseId),
          eq(schema.courses.orgId, orgId),
          eq(schema.courses.isActive, true),
        ),
      )
      .limit(1);

    if (!course) throw new NotFoundException('Course not found');

    // Check if already enrolled
    const [existing] = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.courseId, courseId),
          eq(schema.courseEnrollments.employeeId, userId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      )
      .limit(1);

    if (existing) {
      return { success: false, message: 'Already enrolled in this course', enrollment: existing };
    }

    const [enrollment] = await this.db
      .insert(schema.courseEnrollments)
      .values({
        orgId,
        courseId,
        employeeId: userId,
        assignmentType: 'self',
        status: 'enrolled',
      })
      .returning();

    // Update course enrollment count
    await this.db
      .update(schema.courses)
      .set({ totalEnrollments: (course.totalEnrollments ?? 0) + 1, updatedAt: new Date() })
      .where(eq(schema.courses.id, courseId));

    return { success: true, message: 'Enrolled successfully', enrollment };
  }

  async bookmarkCourse(orgId: string, userId: string, courseId: string) {
    // Verify course exists
    const [course] = await this.db
      .select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, courseId),
          eq(schema.courses.orgId, orgId),
          eq(schema.courses.isActive, true),
        ),
      )
      .limit(1);

    if (!course) throw new NotFoundException('Course not found');

    // Check for existing enrollment
    const [existing] = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.courseId, courseId),
          eq(schema.courseEnrollments.employeeId, userId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      )
      .limit(1);

    if (existing) {
      // Toggle bookmark in metadata
      const meta = (existing.metadata as Record<string, any>) ?? {};
      const isBookmarked = !meta.bookmarked;
      await this.db
        .update(schema.courseEnrollments)
        .set({ metadata: { ...meta, bookmarked: isBookmarked }, updatedAt: new Date() })
        .where(eq(schema.courseEnrollments.id, existing.id));

      return { success: true, bookmarked: isBookmarked };
    }

    // Create a wishlist enrollment
    const [enrollment] = await this.db
      .insert(schema.courseEnrollments)
      .values({
        orgId,
        courseId,
        employeeId: userId,
        assignmentType: 'self',
        status: 'enrolled',
        metadata: { bookmarked: true },
      })
      .returning();

    return { success: true, bookmarked: true, enrollment };
  }

  async rateCourse(orgId: string, userId: string, courseId: string, data: { rating: number; review?: string }) {
    const [enrollment] = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.courseId, courseId),
          eq(schema.courseEnrollments.employeeId, userId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      )
      .limit(1);

    if (!enrollment) throw new NotFoundException('You are not enrolled in this course');

    await this.db
      .update(schema.courseEnrollments)
      .set({
        rating: data.rating,
        review: data.review ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.courseEnrollments.id, enrollment.id));

    // Update course average rating
    const allRatings = await this.db
      .select({ rating: schema.courseEnrollments.rating })
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.courseId, courseId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      );

    const validRatings = allRatings.filter((r) => r.rating !== null).map((r) => r.rating!);
    const avgRating = validRatings.length > 0
      ? Math.round(validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length)
      : 0;

    await this.db
      .update(schema.courses)
      .set({ avgRating, updatedAt: new Date() })
      .where(eq(schema.courses.id, courseId));

    return { success: true, message: 'Rating submitted', avgRating };
  }
}

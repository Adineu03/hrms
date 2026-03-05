import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc, lte, gte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { documents } from '../../../../infrastructure/database/schema/documents';

@Injectable()
export class DocumentVaultService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listDocuments(orgId: string, userId: string) {
    const docs = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.orgId, orgId),
          eq(documents.employeeId, userId),
        ),
      )
      .orderBy(desc(documents.createdAt));

    // Group by category
    const grouped: Record<string, typeof docs> = {};
    for (const doc of docs) {
      const category = doc.category ?? 'other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(doc);
    }

    return {
      total: docs.length,
      categories: grouped,
    };
  }

  async getDocument(orgId: string, userId: string, docId: string) {
    const [doc] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, docId),
          eq(documents.orgId, orgId),
        ),
      )
      .limit(1);

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    if (doc.employeeId !== userId) {
      throw new ForbiddenException('You can only view your own documents');
    }

    return doc;
  }

  async createDocument(
    orgId: string,
    userId: string,
    data: {
      category: string;
      name: string;
      description?: string;
      expiryDate?: string;
      fileUrl?: string;
      fileSize?: string;
      mimeType?: string;
    },
  ) {
    const [doc] = await this.db
      .insert(documents)
      .values({
        orgId,
        employeeId: userId,
        category: data.category,
        name: data.name,
        description: data.description ?? null,
        expiryDate: data.expiryDate ?? null,
        fileUrl: data.fileUrl ?? null,
        fileSize: data.fileSize ?? null,
        mimeType: data.mimeType ?? null,
      })
      .returning();

    return doc;
  }

  async deleteDocument(orgId: string, userId: string, docId: string) {
    const [doc] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, docId),
          eq(documents.orgId, orgId),
        ),
      )
      .limit(1);

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    if (doc.employeeId !== userId) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    await this.db
      .delete(documents)
      .where(
        and(
          eq(documents.id, docId),
          eq(documents.orgId, orgId),
        ),
      );

    return { success: true, message: 'Document deleted' };
  }

  async getExpiringDocuments(orgId: string, userId: string) {
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const nowStr = now.toISOString().split('T')[0];
    const futureStr = ninetyDaysFromNow.toISOString().split('T')[0];

    const docs = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.orgId, orgId),
          eq(documents.employeeId, userId),
          gte(documents.expiryDate, nowStr),
          lte(documents.expiryDate, futureStr),
        ),
      )
      .orderBy(documents.expiryDate);

    return {
      total: docs.length,
      documents: docs,
    };
  }
}

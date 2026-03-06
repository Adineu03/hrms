import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DocumentSubmissionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Helper: Get onboarding record ───────────────────────────────────
  private async getOnboarding(orgId: string, employeeId: string) {
    const [onboarding] = await this.db
      .select()
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.orgId, orgId),
          eq(schema.employeeOnboardings.employeeId, employeeId),
          eq(schema.employeeOnboardings.isActive, true),
        ),
      )
      .orderBy(desc(schema.employeeOnboardings.createdAt))
      .limit(1);

    if (!onboarding) {
      throw new NotFoundException('No active onboarding found');
    }
    return onboarding;
  }

  // ── List Required Documents & Status ────────────────────────────────
  async listRequiredDocuments(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const docTasks = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.taskType, 'document_upload'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .orderBy(schema.employeeOnboardingTasks.createdAt);

    const uploadedDocs = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.orgId, orgId),
          eq(schema.documents.employeeId, employeeId),
        ),
      )
      .orderBy(desc(schema.documents.createdAt));

    return {
      onboardingId: onboarding.id,
      requiredDocuments: docTasks.map((t) => ({
        taskId: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        verificationStatus: t.verificationStatus,
        dueDate: t.dueDate,
        completedAt: t.completedAt?.toISOString() || null,
        attachments: t.attachments,
      })),
      uploadedDocuments: uploadedDocs.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        fileUrl: d.fileUrl,
        isVerified: d.isVerified,
        verifiedAt: d.verifiedAt?.toISOString() || null,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  // ── Upload Document for a Task ──────────────────────────────────────
  async uploadDocument(orgId: string, employeeId: string, taskId: string, data: Record<string, any>) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const [task] = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.id, taskId),
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .limit(1);

    if (!task) {
      throw new NotFoundException('Document task not found');
    }

    // Create document record
    const [doc] = await this.db
      .insert(schema.documents)
      .values({
        orgId,
        employeeId,
        category: data.category || 'identity',
        name: data.name || task.title,
        description: data.description || null,
        fileUrl: data.fileUrl || null,
        fileSize: data.fileSize || null,
        mimeType: data.mimeType || null,
        metadata: { onboardingTaskId: taskId },
      })
      .returning();

    // Update task with attachment info
    const currentAttachments = (task.attachments as Array<Record<string, any>>) || [];
    currentAttachments.push({
      documentId: doc.id,
      name: doc.name,
      fileUrl: doc.fileUrl,
      uploadedAt: new Date().toISOString(),
    });

    await this.db
      .update(schema.employeeOnboardingTasks)
      .set({
        attachments: currentAttachments,
        status: 'completed',
        completedAt: new Date(),
        completedBy: employeeId,
        verificationStatus: 'pending_verification',
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeOnboardingTasks.id, taskId));

    return {
      documentId: doc.id,
      taskId,
      name: doc.name,
      category: doc.category,
      fileUrl: doc.fileUrl,
      status: 'pending_verification',
      createdAt: doc.createdAt.toISOString(),
    };
  }

  // ── View Document Verification Status ───────────────────────────────
  async getDocumentStatus(orgId: string, employeeId: string, taskId: string) {
    const [task] = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.id, taskId),
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.employeeId, employeeId),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .limit(1);

    if (!task) {
      throw new NotFoundException('Document task not found');
    }

    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
      verificationStatus: task.verificationStatus,
      verifiedBy: task.verifiedBy,
      verifiedAt: task.verifiedAt?.toISOString() || null,
      attachments: task.attachments,
      notes: task.notes,
    };
  }

  // ── Download Offer Letter ───────────────────────────────────────────
  async getOfferLetter(orgId: string, employeeId: string) {
    const docs = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.orgId, orgId),
          eq(schema.documents.employeeId, employeeId),
          eq(schema.documents.category, 'letters'),
        ),
      )
      .orderBy(desc(schema.documents.createdAt))
      .limit(5);

    return {
      documents: docs.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        fileUrl: d.fileUrl,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  // ── Acknowledge Policy ──────────────────────────────────────────────
  async acknowledgePolicies(orgId: string, employeeId: string, data: Record<string, any>) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const policyTasks = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.taskType, 'policy_acknowledgement'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      );

    const acknowledged: string[] = [];
    for (const task of policyTasks) {
      if (task.status !== 'completed') {
        await this.db
          .update(schema.employeeOnboardingTasks)
          .set({
            status: 'completed',
            completedAt: new Date(),
            completedBy: employeeId,
            notes: data.signature || 'Digitally acknowledged',
            updatedAt: new Date(),
          })
          .where(eq(schema.employeeOnboardingTasks.id, task.id));
        acknowledged.push(task.id);
      }
    }

    return { acknowledged, total: acknowledged.length };
  }

  // ── Submit Tax Declaration ──────────────────────────────────────────
  async submitTaxDeclaration(orgId: string, employeeId: string, data: Record<string, any>) {
    const [doc] = await this.db
      .insert(schema.documents)
      .values({
        orgId,
        employeeId,
        category: 'financial',
        name: 'Tax Declaration',
        description: 'Employee tax declaration form',
        metadata: { formData: data, submittedAt: new Date().toISOString() },
      })
      .returning();

    return { documentId: doc.id, status: 'submitted', createdAt: doc.createdAt.toISOString() };
  }

  // ── Submit Bank Details ─────────────────────────────────────────────
  async submitBankDetails(orgId: string, employeeId: string, data: Record<string, any>) {
    const [doc] = await this.db
      .insert(schema.documents)
      .values({
        orgId,
        employeeId,
        category: 'financial',
        name: 'Bank Details',
        description: 'Employee bank account information',
        metadata: { formData: data, submittedAt: new Date().toISOString() },
      })
      .returning();

    return { documentId: doc.id, status: 'submitted', createdAt: doc.createdAt.toISOString() };
  }

  // ── Submit Emergency Contact ────────────────────────────────────────
  async submitEmergencyContact(orgId: string, employeeId: string, data: Record<string, any>) {
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, employeeId),
        ),
      )
      .limit(1);

    if (profile) {
      await this.db
        .update(schema.employeeProfiles)
        .set({
          emergencyContacts: data,
          updatedAt: new Date(),
        })
        .where(eq(schema.employeeProfiles.id, profile.id));
    }

    return { status: 'saved', message: 'Emergency contact information saved' };
  }

  // ── Upload Profile Photo ────────────────────────────────────────────
  async uploadProfilePhoto(orgId: string, employeeId: string, data: Record<string, any>) {
    if (!data.fileUrl) {
      throw new BadRequestException('Profile photo URL is required');
    }

    const [doc] = await this.db
      .insert(schema.documents)
      .values({
        orgId,
        employeeId,
        category: 'identity',
        name: 'Profile Photo',
        description: 'Employee profile photo',
        fileUrl: data.fileUrl,
        mimeType: data.mimeType || 'image/jpeg',
        fileSize: data.fileSize || null,
      })
      .returning();

    return { documentId: doc.id, fileUrl: doc.fileUrl, createdAt: doc.createdAt.toISOString() };
  }
}

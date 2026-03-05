import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { StringValue } from 'ms';
import type {
  SendInvitationData,
  InvitationData,
  AcceptInviteData,
  InviteValidationResult,
  LoginResponse,
  JwtPayload,
} from '@hrms/shared';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { invitationTokens } from '../../../../infrastructure/database/schema/invitation-tokens';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { orgs } from '../../../../infrastructure/database/schema/orgs';

const BCRYPT_ROUNDS = 10;
const INVITE_EXPIRY_DAYS = 7;

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async list(orgId: string): Promise<InvitationData[]> {
    const rows = await this.db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.orgId, orgId))
      .orderBy(invitationTokens.createdAt);

    return rows.map((row) => this.mapToInvitationData(row));
  }

  async send(
    orgId: string,
    invitedBy: string,
    data: SendInvitationData,
  ): Promise<InvitationData> {
    // Check if email already has an active user in this org
    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email), eq(users.orgId, orgId)))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Check if pending invitation exists for this email
    const [existingInvite] = await this.db
      .select({ id: invitationTokens.id })
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.email, data.email),
          eq(invitationTokens.orgId, orgId),
          eq(invitationTokens.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingInvite) {
      throw new ConflictException('Invitation already pending');
    }

    const token = randomUUID();
    const now = new Date();
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const [inserted] = await this.db
      .insert(invitationTokens)
      .values({
        orgId,
        email: data.email,
        token,
        role: data.role ?? 'employee',
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        departmentId: data.departmentId ?? null,
        designationId: data.designationId ?? null,
        locationId: data.locationId ?? null,
        managerId: data.managerId ?? null,
        invitedBy,
        status: 'pending',
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    console.log(
      `[INVITE] Accept URL: ${webUrl}/accept-invite?token=${token}`,
    );

    return this.mapToInvitationData(inserted);
  }

  async sendBulk(
    orgId: string,
    invitedBy: string,
    invitations: SendInvitationData[],
  ): Promise<{ sent: number; skipped: number; errors: string[] }> {
    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const inv of invitations) {
      try {
        await this.send(orgId, invitedBy, inv);
        sent++;
      } catch (e: any) {
        skipped++;
        errors.push(`${inv.email}: ${e.message}`);
      }
    }

    return { sent, skipped, errors };
  }

  async validateToken(token: string): Promise<InviteValidationResult> {
    const results = await this.db
      .select({
        invitation: invitationTokens,
        orgName: orgs.name,
      })
      .from(invitationTokens)
      .innerJoin(orgs, eq(invitationTokens.orgId, orgs.id))
      .where(eq(invitationTokens.token, token))
      .limit(1);

    if (results.length === 0) {
      return { valid: false };
    }

    const { invitation, orgName } = results[0];

    if (invitation.status === 'accepted') {
      return {
        valid: false,
        alreadyAccepted: true,
        email: invitation.email,
      };
    }

    if (invitation.status === 'revoked') {
      return { valid: false, email: invitation.email };
    }

    if (invitation.expiresAt < new Date()) {
      return { valid: false, expired: true, email: invitation.email };
    }

    return {
      valid: true,
      email: invitation.email,
      orgName,
      firstName: invitation.firstName ?? undefined,
      lastName: invitation.lastName ?? undefined,
    };
  }

  async accept(token: string, data: AcceptInviteData): Promise<LoginResponse> {
    return await this.db.transaction(async (tx) => {
      // Validate the token
      const results = await tx
        .select({
          invitation: invitationTokens,
          orgName: orgs.name,
        })
        .from(invitationTokens)
        .innerJoin(orgs, eq(invitationTokens.orgId, orgs.id))
        .where(eq(invitationTokens.token, token))
        .limit(1);

      if (results.length === 0) {
        throw new NotFoundException('Invitation not found');
      }

      const { invitation, orgName } = results[0];

      if (invitation.status === 'accepted') {
        throw new BadRequestException('Invitation already accepted');
      }

      if (invitation.status === 'revoked') {
        throw new BadRequestException('Invitation has been revoked');
      }

      if (invitation.expiresAt < new Date()) {
        throw new BadRequestException('Invitation has expired');
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

      // Create the user
      const [user] = await tx
        .insert(users)
        .values({
          orgId: invitation.orgId,
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          firstName: data.firstName,
          lastName: data.lastName ?? null,
        })
        .returning();

      // Create the employee profile
      await tx.insert(employeeProfiles).values({
        orgId: invitation.orgId,
        userId: user.id,
        departmentId: invitation.departmentId ?? null,
        designationId: invitation.designationId ?? null,
        locationId: invitation.locationId ?? null,
        managerId: invitation.managerId ?? null,
        phone: data.phone ?? null,
        onboardingStatus: 'in_progress',
      });

      // Update the invitation status
      const now = new Date();
      await tx
        .update(invitationTokens)
        .set({
          status: 'accepted',
          acceptedAt: now,
          updatedAt: now,
        })
        .where(eq(invitationTokens.id, invitation.id));

      // Generate JWT tokens
      const tokens = this.generateTokens(user, orgName);

      return {
        tokens,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName ?? '',
          role: user.role,
          orgId: user.orgId,
          orgName,
        },
      };
    });
  }

  async revoke(orgId: string, invitationId: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: invitationTokens.id })
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.id, invitationId),
          eq(invitationTokens.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Invitation not found');
    }

    const now = new Date();
    await this.db
      .update(invitationTokens)
      .set({ status: 'revoked', updatedAt: now })
      .where(
        and(
          eq(invitationTokens.id, invitationId),
          eq(invitationTokens.orgId, orgId),
        ),
      );
  }

  async resend(orgId: string, invitationId: string): Promise<InvitationData> {
    const [existing] = await this.db
      .select()
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.id, invitationId),
          eq(invitationTokens.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Invitation not found');
    }

    const newToken = randomUUID();
    const now = new Date();
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const [updated] = await this.db
      .update(invitationTokens)
      .set({
        token: newToken,
        expiresAt,
        status: 'pending',
        updatedAt: now,
      })
      .where(
        and(
          eq(invitationTokens.id, invitationId),
          eq(invitationTokens.orgId, orgId),
        ),
      )
      .returning();

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    console.log(
      `[INVITE] Accept URL: ${webUrl}/accept-invite?token=${newToken}`,
    );

    return this.mapToInvitationData(updated);
  }

  private generateTokens(
    user: typeof users.$inferSelect,
    _orgName: string,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(
      { ...payload },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRY', '15m') as StringValue,
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRY',
          '7d',
        ) as StringValue,
      },
    );

    return { accessToken, refreshToken };
  }

  private mapToInvitationData(
    row: typeof invitationTokens.$inferSelect,
  ): InvitationData {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName ?? undefined,
      lastName: row.lastName ?? undefined,
      role: row.role,
      departmentId: row.departmentId ?? undefined,
      designationId: row.designationId ?? undefined,
      locationId: row.locationId ?? undefined,
      managerId: row.managerId ?? undefined,
      status: row.status,
      expiresAt: row.expiresAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }
}

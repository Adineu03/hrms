import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, ilike } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { designations } from '../../../../infrastructure/database/schema/designations';

export interface OrgChartNode {
  userId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  departmentName: string | null;
  designationName: string | null;
  profilePhotoUrl: string | null;
  managerId: string | null;
  children: OrgChartNode[];
}

@Injectable()
export class OrgChartService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getOrgChart(orgId: string) {
    const allUsers = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.orgId, orgId), eq(users.isActive, true)));

    const { deptMap, desigMap, profileMap } = await this.loadLookups(orgId);

    // Build flat nodes
    const nodes: OrgChartNode[] = allUsers.map((u) => {
      const profile = profileMap.get(u.userId);
      return {
        userId: u.userId,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        departmentName: profile?.departmentId
          ? deptMap.get(profile.departmentId) ?? null
          : null,
        designationName: profile?.designationId
          ? desigMap.get(profile.designationId) ?? null
          : null,
        profilePhotoUrl: profile?.profilePhotoUrl ?? null,
        managerId: profile?.managerId ?? null,
        children: [],
      };
    });

    // Build tree
    const nodeMap = new Map(nodes.map((n) => [n.userId, n]));
    const roots: OrgChartNode[] = [];

    for (const node of nodes) {
      if (node.managerId && nodeMap.has(node.managerId)) {
        nodeMap.get(node.managerId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return { nodes: roots, totalEmployees: allUsers.length };
  }

  async searchOrgChart(orgId: string, query: string) {
    const searchPattern = `%${query}%`;

    // Get matching users by name/email
    const matchingUsers = await this.db
      .select({ userId: users.id })
      .from(users)
      .where(
        and(
          eq(users.orgId, orgId),
          eq(users.isActive, true),
          or(
            ilike(users.firstName, searchPattern),
            ilike(users.lastName, searchPattern),
            ilike(users.email, searchPattern),
          ),
        ),
      );

    // Get matching departments & designations
    const matchingDepts = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.orgId, orgId), ilike(departments.name, searchPattern)));

    const matchingDesigs = await this.db
      .select({ id: designations.id })
      .from(designations)
      .where(and(eq(designations.orgId, orgId), ilike(designations.name, searchPattern)));

    const deptIds = new Set(matchingDepts.map((d) => d.id));
    const desigIds = new Set(matchingDesigs.map((d) => d.id));

    // Collect all matched user IDs
    const matchedUserIds = new Set(matchingUsers.map((u) => u.userId));

    // Add users matching by department or designation
    if (deptIds.size > 0 || desigIds.size > 0) {
      const allProfiles = await this.db
        .select({
          userId: employeeProfiles.userId,
          departmentId: employeeProfiles.departmentId,
          designationId: employeeProfiles.designationId,
        })
        .from(employeeProfiles)
        .where(eq(employeeProfiles.orgId, orgId));

      for (const p of allProfiles) {
        if (p.departmentId && deptIds.has(p.departmentId)) {
          matchedUserIds.add(p.userId);
        }
        if (p.designationId && desigIds.has(p.designationId)) {
          matchedUserIds.add(p.userId);
        }
      }
    }

    // Enrich matched users with profile data
    const { deptMap, desigMap, profileMap } = await this.loadLookups(orgId);

    const allUsersInOrg = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.orgId, orgId), eq(users.isActive, true)));

    const results = allUsersInOrg
      .filter((u) => matchedUserIds.has(u.userId))
      .map((u) => {
        const profile = profileMap.get(u.userId);
        return {
          userId: u.userId,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          departmentName: profile?.departmentId
            ? deptMap.get(profile.departmentId) ?? null
            : null,
          designationName: profile?.designationId
            ? desigMap.get(profile.designationId) ?? null
            : null,
          profilePhotoUrl: profile?.profilePhotoUrl ?? null,
        };
      });

    return { results, total: results.length };
  }

  async getNode(orgId: string, userId: string) {
    const [user] = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found in organization');
    }

    const [profile] = await this.db
      .select()
      .from(employeeProfiles)
      .where(
        and(
          eq(employeeProfiles.userId, userId),
          eq(employeeProfiles.orgId, orgId),
        ),
      )
      .limit(1);

    const { deptMap, desigMap } = await this.loadLookups(orgId);

    const node = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      departmentName: profile?.departmentId
        ? deptMap.get(profile.departmentId) ?? null
        : null,
      designationName: profile?.designationId
        ? desigMap.get(profile.designationId) ?? null
        : null,
      profilePhotoUrl: profile?.profilePhotoUrl ?? null,
      managerId: profile?.managerId ?? null,
    };

    // Get manager (up)
    let manager: any = null;
    if (profile?.managerId) {
      const [mgrUser] = await this.db
        .select({
          userId: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, profile.managerId))
        .limit(1);

      if (mgrUser) {
        const [mgrProfile] = await this.db
          .select()
          .from(employeeProfiles)
          .where(
            and(
              eq(employeeProfiles.userId, profile.managerId),
              eq(employeeProfiles.orgId, orgId),
            ),
          )
          .limit(1);

        manager = {
          userId: mgrUser.userId,
          firstName: mgrUser.firstName,
          lastName: mgrUser.lastName,
          email: mgrUser.email,
          designationName: mgrProfile?.designationId
            ? desigMap.get(mgrProfile.designationId) ?? null
            : null,
          profilePhotoUrl: mgrProfile?.profilePhotoUrl ?? null,
        };
      }
    }

    // Get peers (same manager, excluding self)
    let peers: any[] = [];
    if (profile?.managerId) {
      const peerProfiles = await this.db
        .select()
        .from(employeeProfiles)
        .where(
          and(
            eq(employeeProfiles.orgId, orgId),
            eq(employeeProfiles.managerId, profile.managerId),
          ),
        );

      const peerUserIds = peerProfiles
        .filter((p) => p.userId !== userId)
        .map((p) => p.userId);

      if (peerUserIds.length > 0) {
        const peerUsers = await this.db
          .select({
            userId: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(and(eq(users.orgId, orgId), eq(users.isActive, true)));

        const peerProfileMap = new Map(peerProfiles.map((p) => [p.userId, p]));

        peers = peerUsers
          .filter((u) => peerUserIds.includes(u.userId))
          .map((u) => {
            const pp = peerProfileMap.get(u.userId);
            return {
              userId: u.userId,
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              designationName: pp?.designationId
                ? desigMap.get(pp.designationId) ?? null
                : null,
              profilePhotoUrl: pp?.profilePhotoUrl ?? null,
            };
          });
      }
    }

    // Get direct reports (down)
    const reportProfiles = await this.db
      .select()
      .from(employeeProfiles)
      .where(
        and(
          eq(employeeProfiles.orgId, orgId),
          eq(employeeProfiles.managerId, userId),
        ),
      );

    const reportUserIds = reportProfiles.map((p) => p.userId);
    let directReports: any[] = [];

    if (reportUserIds.length > 0) {
      const reportUsers = await this.db
        .select({
          userId: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(and(eq(users.orgId, orgId), eq(users.isActive, true)));

      const reportProfileMap = new Map(reportProfiles.map((p) => [p.userId, p]));

      directReports = reportUsers
        .filter((u) => reportUserIds.includes(u.userId))
        .map((u) => {
          const rp = reportProfileMap.get(u.userId);
          return {
            userId: u.userId,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            designationName: rp?.designationId
              ? desigMap.get(rp.designationId) ?? null
              : null,
            profilePhotoUrl: rp?.profilePhotoUrl ?? null,
          };
        });
    }

    return { node, manager, peers, directReports };
  }

  /** Load department, designation, and profile lookup maps for the org */
  private async loadLookups(orgId: string) {
    const allProfiles = await this.db
      .select()
      .from(employeeProfiles)
      .where(eq(employeeProfiles.orgId, orgId));

    const allDepts = await this.db
      .select()
      .from(departments)
      .where(eq(departments.orgId, orgId));

    const allDesigs = await this.db
      .select()
      .from(designations)
      .where(eq(designations.orgId, orgId));

    return {
      deptMap: new Map(allDepts.map((d) => [d.id, d.name])),
      desigMap: new Map(allDesigs.map((d) => [d.id, d.name])),
      profileMap: new Map(allProfiles.map((p) => [p.userId, p])),
    };
  }
}

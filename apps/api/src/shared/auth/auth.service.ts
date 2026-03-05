import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { StringValue } from 'ms';
import { AuthTokens, JwtPayload, LoginResponse } from '@hrms/shared';
import { MODULE_LIST } from '@hrms/shared';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { orgs } from '../../infrastructure/database/schema/orgs';
import { users } from '../../infrastructure/database/schema/users';
import { orgModules } from '../../infrastructure/database/schema/org-modules';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignUpDto): Promise<LoginResponse> {
    const slug = this.generateSlug(dto.orgName);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Check if slug already exists
    const existingOrg = await this.db
      .select({ id: orgs.id })
      .from(orgs)
      .where(eq(orgs.slug, slug))
      .limit(1);

    if (existingOrg.length > 0) {
      throw new ConflictException('An organization with a similar name already exists');
    }

    let createdOrg: typeof orgs.$inferSelect;
    let createdUser: typeof users.$inferSelect;

    await this.db.transaction(async (tx) => {
      // Create the organization
      const [org] = await tx
        .insert(orgs)
        .values({
          name: dto.orgName,
          slug,
          industry: dto.industry,
        })
        .returning();

      createdOrg = org;

      // Create the admin user
      const [user] = await tx
        .insert(users)
        .values({
          orgId: org.id,
          email: dto.email,
          passwordHash,
          role: 'super_admin',
          firstName: dto.firstName,
          lastName: dto.lastName,
        })
        .returning();

      createdUser = user;

      // Initialize all 19 modules for the org
      await tx.insert(orgModules).values(
        MODULE_LIST.map((m) => ({
          orgId: org.id,
          moduleId: m.id,
        })),
      );
    });

    const tokens = this.generateTokens(createdUser!, createdOrg!.name);

    return {
      tokens,
      user: {
        id: createdUser!.id,
        email: createdUser!.email,
        firstName: createdUser!.firstName,
        lastName: createdUser!.lastName ?? '',
        role: createdUser!.role,
        orgId: createdUser!.orgId,
        orgName: createdOrg!.name,
      },
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    // Find the first active user with this email
    const result = await this.db
      .select({
        user: users,
        orgName: orgs.name,
      })
      .from(users)
      .innerJoin(orgs, eq(users.orgId, orgs.id))
      .where(eq(users.email, dto.email))
      .limit(1);

    if (result.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { user, orgName } = result[0];

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

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
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify user still exists and is active
    const result = await this.db
      .select({
        user: users,
        orgName: orgs.name,
      })
      .from(users)
      .innerJoin(orgs, eq(users.orgId, orgs.id))
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (result.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const { user, orgName } = result[0];

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.generateTokens(user, orgName);
  }

  private generateTokens(
    user: typeof users.$inferSelect,
    _orgName: string,
  ): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
    };

    const accessToken = this.jwtService.sign({ ...payload }, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRY', '15m') as StringValue,
    });

    const refreshToken = this.jwtService.sign({ ...payload }, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRY', '7d') as StringValue,
    });

    return { accessToken, refreshToken };
  }

  private generateSlug(orgName: string): string {
    return orgName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}

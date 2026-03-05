export type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee';

export interface JwtPayload {
  sub: string;       // user id
  orgId: string;
  role: UserRole;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SignUpRequest {
  orgName: string;
  industry: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    orgId: string;
    orgName: string;
  };
}

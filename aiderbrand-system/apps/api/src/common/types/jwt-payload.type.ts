/**
 * JwtPayload — the decoded payload of the JWT access token.
 * Issued by AuthService, validated by JwtStrategy.
 *
 * Minimizes payload size: no roles (fetched fresh from DB per request),
 * no company (provided via X-Company-Id header).
 */
export interface JwtPayload {
  /** User UUID */
  sub: string
  /** User email */
  email: string
  /** Token type */
  type: 'access'
}

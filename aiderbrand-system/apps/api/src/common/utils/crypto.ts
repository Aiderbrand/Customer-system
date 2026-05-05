import { createHash } from 'crypto'

/** SHA-256 hash of a raw opaque token for secure DB storage */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

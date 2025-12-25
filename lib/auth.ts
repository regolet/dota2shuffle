import { cookies } from 'next/headers'
import { db, admins } from '@/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours
const LOCKOUT_THRESHOLD = 5 // Failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

// Secret for HMAC signing - in production, use environment variable
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-dev-secret-change-in-production'

export interface Session {
  adminId: string
  username: string
  mustChangePassword: boolean
  expiresAt: number
}

/**
 * Create HMAC signature for session data
 */
function signSession(data: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET)
  hmac.update(data)
  return hmac.digest('hex')
}

/**
 * Verify HMAC signature
 */
function verifySignature(data: string, signature: string): boolean {
  const expectedSignature = signSession(data)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

/**
 * Create admin session with signed cookie
 */
export async function createSession(adminId: string, username: string, mustChangePassword: boolean = false) {
  const session: Session = {
    adminId,
    username,
    mustChangePassword,
    expiresAt: Date.now() + SESSION_DURATION,
  }

  const sessionData = JSON.stringify(session)
  const signature = signSession(sessionData)
  const signedSession = `${sessionData}.${signature}`

  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, signedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  })

  return session
}

/**
 * Get current session (validates signature)
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    return null
  }

  try {
    const [sessionData, signature] = sessionCookie.value.split('.')

    if (!sessionData || !signature) {
      return null
    }

    // Verify signature
    if (!verifySignature(sessionData, signature)) {
      await destroySession()
      return null
    }

    const session: Session = JSON.parse(sessionData)

    // Check if expired
    if (Date.now() > session.expiresAt) {
      await destroySession()
      return null
    }

    return session
  } catch (error) {
    return null
  }
}

/**
 * Destroy session
 */
export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(adminId: string): Promise<boolean> {
  const [admin] = await db
    .select({ lockedUntil: admins.lockedUntil })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1)

  if (!admin?.lockedUntil) {
    return false
  }

  return admin.lockedUntil > new Date()
}

/**
 * Record failed login attempt and potentially lock account
 */
export async function recordFailedLogin(username: string): Promise<{ locked: boolean; remainingAttempts: number }> {
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1)

  if (!admin) {
    return { locked: false, remainingAttempts: 0 }
  }

  const newAttempts = admin.failedLoginAttempts + 1
  const shouldLock = newAttempts >= LOCKOUT_THRESHOLD

  await db
    .update(admins)
    .set({
      failedLoginAttempts: newAttempts,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null,
    })
    .where(eq(admins.id, admin.id))

  return {
    locked: shouldLock,
    remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - newAttempts),
  }
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedAttempts(adminId: string) {
  await db
    .update(admins)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(admins.id, adminId))
}

/**
 * Verify admin credentials with lockout check
 */
export async function verifyAdmin(username: string, password: string) {
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1)

  if (!admin) {
    return { success: false, error: 'invalid_credentials' as const }
  }

  // Check if account is locked
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    const remainingMs = admin.lockedUntil.getTime() - Date.now()
    const remainingMins = Math.ceil(remainingMs / 60000)
    return {
      success: false,
      error: 'account_locked' as const,
      remainingMinutes: remainingMins
    }
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash)

  if (!isValid) {
    return { success: false, error: 'invalid_credentials' as const }
  }

  // Reset failed attempts on success
  await resetFailedAttempts(admin.id)

  return {
    success: true,
    admin: {
      id: admin.id,
      username: admin.username,
      mustChangePassword: admin.mustChangePassword,
    },
  }
}

/**
 * Require authentication - use in server components/actions
 */
export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session
}

/**
 * Clear mustChangePassword flag
 */
export async function clearMustChangePassword(adminId: string) {
  await db
    .update(admins)
    .set({ mustChangePassword: false })
    .where(eq(admins.id, adminId))
}

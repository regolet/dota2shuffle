import { cookies } from 'next/headers'
import { db, admins } from '@/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export interface Session {
  adminId: string
  username: string
  expiresAt: number
}

/**
 * Create admin session
 */
export async function createSession(adminId: string, username: string) {
  const session: Session = {
    adminId,
    username,
    expiresAt: Date.now() + SESSION_DURATION,
  }

  const sessionString = JSON.stringify(session)
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, sessionString, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  })

  return session
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    return null
  }

  try {
    const session: Session = JSON.parse(sessionCookie.value)

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
 * Verify admin credentials
 */
export async function verifyAdmin(username: string, password: string) {
  // Check database
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1)

  if (!admin) {
    return null
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash)

  if (!isValid) {
    return null
  }

  return {
    id: admin.id,
    username: admin.username,
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

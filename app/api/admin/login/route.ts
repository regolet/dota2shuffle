import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/validators'
import { verifyAdmin, createSession, recordFailedLogin } from '@/lib/auth'
import { logSecurityEvent, getClientInfo } from '@/lib/audit-log'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  const { ipAddress, userAgent } = getClientInfo(request.headers)

  try {
    const body = await request.json()

    // Validate input
    const validated = loginSchema.parse(body)

    // Verify credentials (includes lockout check)
    const result = await verifyAdmin(validated.username, validated.password)

    if (!result.success) {
      // Handle account locked
      if (result.error === 'account_locked') {
        await logSecurityEvent({
          eventType: 'login_failure',
          ipAddress,
          userAgent,
          details: { username: validated.username, reason: 'account_locked' },
        })

        return NextResponse.json(
          { error: `Account is locked. Try again in ${result.remainingMinutes} minutes.` },
          { status: 423 }
        )
      }

      // Record failed attempt
      const { locked, remainingAttempts } = await recordFailedLogin(validated.username)

      await logSecurityEvent({
        eventType: 'login_failure',
        ipAddress,
        userAgent,
        details: { username: validated.username, accountLocked: locked },
      })

      if (locked) {
        await logSecurityEvent({
          eventType: 'account_locked',
          ipAddress,
          userAgent,
          details: { username: validated.username },
        })

        return NextResponse.json(
          { error: 'Too many failed attempts. Account locked for 15 minutes.' },
          { status: 423 }
        )
      }

      return NextResponse.json(
        {
          error: 'Invalid username or password',
          remainingAttempts: remainingAttempts > 0 ? remainingAttempts : undefined,
        },
        { status: 401 }
      )
    }

    const admin = result.admin!

    // Create session with mustChangePassword flag
    await createSession(admin.id, admin.username, admin.mustChangePassword)

    // Log successful login
    await logSecurityEvent({
      eventType: 'login_success',
      adminId: admin.id,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
      },
      mustChangePassword: admin.mustChangePassword,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

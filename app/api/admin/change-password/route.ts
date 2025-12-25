import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, clearMustChangePassword, createSession } from '@/lib/auth'
import { db, admins } from '@/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { changePasswordSchema } from '@/lib/validators'
import { logSecurityEvent, getClientInfo } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
    const { ipAddress, userAgent } = getClientInfo(request.headers)

    try {
        // Require authentication
        const session = await requireAuth()

        const body = await request.json()

        // Validate input
        const validated = changePasswordSchema.parse(body)

        // Get current admin
        const [admin] = await db
            .select()
            .from(admins)
            .where(eq(admins.id, session.adminId))
            .limit(1)

        if (!admin) {
            return NextResponse.json(
                { error: 'Admin not found' },
                { status: 404 }
            )
        }

        // Verify current password
        const isValid = await bcrypt.compare(
            validated.currentPassword,
            admin.passwordHash
        )

        if (!isValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            )
        }

        // Hash new password with consistent bcrypt cost factor
        const newPasswordHash = await bcrypt.hash(validated.newPassword, 12)

        // Update password and clear mustChangePassword flag
        await db
            .update(admins)
            .set({
                passwordHash: newPasswordHash,
                mustChangePassword: false,
            })
            .where(eq(admins.id, session.adminId))

        // Log password change
        await logSecurityEvent({
            eventType: 'password_change',
            adminId: session.adminId,
            ipAddress,
            userAgent,
        })

        // Refresh session without mustChangePassword flag
        await createSession(session.adminId, session.username, false)

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully',
        })
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            )
        }

        console.error('Change password error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

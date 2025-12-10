import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, admins } from '@/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
    try {
        // Require authentication
        const session = await requireAuth()

        const body = await request.json()

        // Validate input
        const validated = changePasswordSchema.parse(body)

        // Get current admin
        const admin = await db
            .select()
            .from(admins)
            .where(eq(admins.id, session.adminId))
            .limit(1)

        if (!admin.length) {
            return NextResponse.json(
                { error: 'Admin not found' },
                { status: 404 }
            )
        }

        // Verify current password
        const isValid = await bcrypt.compare(
            validated.currentPassword,
            admin[0].passwordHash
        )

        if (!isValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            )
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(validated.newPassword, 12)

        // Update password
        await db
            .update(admins)
            .set({ passwordHash: newPasswordHash })
            .where(eq(admins.id, session.adminId))

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

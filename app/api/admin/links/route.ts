import { NextRequest, NextResponse } from 'next/server'
import { db, registrationLinks } from '@/db'
import { eq } from 'drizzle-orm'
import { createLinkSchema } from '@/lib/validators'
import { requireAuth } from '@/lib/auth'
import { ZodError } from 'zod'
import { customAlphabet } from 'nanoid'

// Create URL-safe link codes
const generateLinkCode = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  32
)

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()

    const body = await request.json()

    // Validate input
    const validated = createLinkSchema.parse(body)

    // Calculate expiration time if provided
    let expiresAt: Date | null = null
    if (validated.expiresHours) {
      expiresAt = new Date(Date.now() + validated.expiresHours * 60 * 60 * 1000)
    }

    // Parse scheduled time if provided
    let scheduledTime: Date | null = null
    if (validated.scheduledTime) {
      scheduledTime = new Date(validated.scheduledTime)
    }

    // Generate unique link code
    const linkCode = generateLinkCode()

    // Create registration link
    const [newLink] = await db
      .insert(registrationLinks)
      .values({
        linkCode,
        title: validated.title,
        description: validated.description || null,
        maxPlayers: validated.maxPlayers,
        createdBy: session.adminId,
        expiresAt,
        scheduledTime,
        isActive: true,
      })
      .returning()

    return NextResponse.json(
      {
        success: true,
        link: newLink,
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/register/${linkCode}`,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()

    // Get all registration links for the logged-in admin
    const links = await db
      .select()
      .from(registrationLinks)
      .where(eq(registrationLinks.createdBy, session.adminId))
      .orderBy(registrationLinks.createdAt)

    return NextResponse.json({
      success: true,
      links,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Get links error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db, registrationLinks } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

// PATCH - Update link (status or full edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    await requireAuth()
    const { linkId } = await params
    const body = await request.json()

    // Build update object based on what fields are provided
    const updateData: any = {}

    // If only isActive is provided, it's a status toggle
    if (body.isActive !== undefined && Object.keys(body).length === 1) {
      updateData.isActive = body.isActive
    } else {
      // Full edit - update all provided fields
      if (body.title !== undefined) updateData.title = body.title
      if (body.description !== undefined) updateData.description = body.description
      if (body.maxPlayers !== undefined) updateData.maxPlayers = body.maxPlayers

      // Handle expiration
      if (body.expiresHours) {
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + body.expiresHours)
        updateData.expiresAt = expiresAt
      }

      // Handle scheduled time
      if (body.scheduledTime) {
        updateData.scheduledTime = new Date(body.scheduledTime)
      }

      updateData.updatedAt = new Date()
    }

    await db
      .update(registrationLinks)
      .set(updateData)
      .where(eq(registrationLinks.id, linkId))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Update link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    await requireAuth()
    const { linkId } = await params

    await db.delete(registrationLinks).where(eq(registrationLinks.id, linkId))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Delete link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

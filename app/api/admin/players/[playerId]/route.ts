import { NextRequest, NextResponse } from 'next/server'
import { db, players } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getAuthorizedPlayer } from '@/lib/db-helpers'
import { z } from 'zod'

// Validation schema for player updates
const updatePlayerSchema = z.object({
  playerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  mmr: z
    .number()
    .int('MMR must be a whole number')
    .min(0, 'MMR cannot be negative')
    .max(15000, 'MMR seems too high'),
  preferredRoles: z
    .array(z.enum(['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support']))
    .min(1, 'Select at least one preferred role')
    .max(2, 'Maximum 2 roles'),
})

// PATCH - Update player
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const session = await requireAuth()
    const { playerId } = await params
    const body = await request.json()

    // Validate ownership
    const player = await getAuthorizedPlayer(playerId, session.adminId)
    if (!player) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    // Validate input
    const validated = updatePlayerSchema.parse(body)

    await db
      .update(players)
      .set({
        playerName: validated.playerName,
        mmr: validated.mmr,
        preferredRoles: validated.preferredRoles,
      })
      .where(eq(players.id, playerId))

    return NextResponse.json({ success: true })
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

    console.error('Update player error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


// DELETE - Delete player
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const session = await requireAuth()
    const { playerId } = await params

    // Validate ownership
    const player = await getAuthorizedPlayer(playerId, session.adminId)
    if (!player) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    await db.delete(players).where(eq(players.id, playerId))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Delete player error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

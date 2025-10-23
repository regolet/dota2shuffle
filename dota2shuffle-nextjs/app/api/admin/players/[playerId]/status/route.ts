import { NextRequest, NextResponse } from 'next/server'
import { db, players } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    await requireAuth()
    const { playerId } = await params
    const body = await request.json()

    await db
      .update(players)
      .set({ status: body.status })
      .where(eq(players.id, playerId))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Update player status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

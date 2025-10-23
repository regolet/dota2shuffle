import { NextRequest, NextResponse } from 'next/server'
import { db, playerMasterlist } from '@/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const players = await db.select().from(playerMasterlist).orderBy(playerMasterlist.playerName)

    return NextResponse.json({
      success: true,
      players,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Get masterlist error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

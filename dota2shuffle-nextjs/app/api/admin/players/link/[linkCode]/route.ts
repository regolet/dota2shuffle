import { NextRequest, NextResponse } from 'next/server'
import { db, players, registrationLinks } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    // Require authentication
    await requireAuth()

    const { linkCode } = await params

    // Get registration link
    const [regLink] = await db
      .select()
      .from(registrationLinks)
      .where(eq(registrationLinks.linkCode, linkCode))
      .limit(1)

    if (!regLink) {
      return NextResponse.json(
        { error: 'Invalid registration link' },
        { status: 404 }
      )
    }

    // Get all players for this link
    const registeredPlayers = await db
      .select()
      .from(players)
      .where(eq(players.registrationLinkId, regLink.id))
      .orderBy(players.registeredAt)

    return NextResponse.json({
      success: true,
      players: registeredPlayers,
      link: regLink,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Get players error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

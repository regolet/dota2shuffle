import { NextRequest, NextResponse } from 'next/server'
import { db, players, registrationLinks, teams, shuffleHistory } from '@/db'
import { eq } from 'drizzle-orm'
import { performShuffle, performCaptainsShuffle } from '@/lib/shuffle'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
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

    // Get all registered players
    const registeredPlayers = await db
      .select()
      .from(players)
      .where(eq(players.registrationLinkId, regLink.id))

    if (registeredPlayers.length < 10) {
      return NextResponse.json(
        { error: 'Need at least 10 players to shuffle' },
        { status: 400 }
      )
    }

    // Filter present players
    const presentPlayers = registeredPlayers.filter((p) => p.status === 'Present')

    if (presentPlayers.length < 10) {
      return NextResponse.json(
        { error: 'Need at least 10 present players to shuffle' },
        { status: 400 }
      )
    }

    // Perform shuffle
    const result = performShuffle(
      presentPlayers.map((p) => ({
        id: p.id,
        playerName: p.playerName,
        mmr: p.mmr,
        preferredRoles: p.preferredRoles,
        status: p.status,
      })),
      {
        teamSize: 5,
        iterations: 1000,
      }
    )

    // Return shuffle result WITHOUT saving to database
    // Admin will manually save if they're satisfied with the shuffle
    return NextResponse.json({
      success: true,
      teams: result.teams,
      balance: result.balance,
      reservePlayers: result.reservePlayers,
      totalPlayers: presentPlayers.length,
      saved: false, // Indicate that this shuffle is not saved yet
      timestamp: new Date().toISOString(), // Add timestamp to prevent caching
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Shuffle error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for Captains Draft shuffle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const { linkCode } = await params
    const body = await request.json()
    const { captainIds } = body as { captainIds: string[] }

    if (!captainIds || !Array.isArray(captainIds) || captainIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 captains are required' },
        { status: 400 }
      )
    }

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

    // Get all registered players
    const registeredPlayers = await db
      .select()
      .from(players)
      .where(eq(players.registrationLinkId, regLink.id))

    // Perform captains shuffle
    const result = performCaptainsShuffle(
      registeredPlayers.map((p) => ({
        id: p.id,
        playerName: p.playerName,
        mmr: p.mmr,
        preferredRoles: p.preferredRoles,
        status: p.status,
      })),
      captainIds,
      {
        teamSize: 5,
        iterations: 1000,
      }
    )

    return NextResponse.json({
      success: true,
      teams: result.teams,
      balance: result.balance,
      reservePlayers: result.reservePlayers,
      captainIds: result.captainIds,
      totalPlayers: registeredPlayers.filter(p => p.status === 'Present').length,
      saved: false,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Captains shuffle error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

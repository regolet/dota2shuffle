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

    // Log player roles for debugging
    console.log('\n=== PLAYER ROLES ===')
    presentPlayers.forEach(p => {
      console.log(`${p.playerName} (${p.mmr}): ${p.preferredRoles.join(', ')}`)
    })

    // Log shuffle results for debugging
    console.log('\n=== SHUFFLE RESULTS ===')
    console.log(`- Total players: ${presentPlayers.length}`)
    console.log(`- Teams: ${result.teams.length}`)
    console.log(`- Reserve players: ${result.reservePlayers.length}`)
    console.log(`- Balance variance: ${result.balance.variance}`)
    console.log(`- MMR difference: ${result.balance.mmrDifference}`)

    // Log team compositions to verify role distribution
    result.teams.forEach((team, idx) => {
      console.log(`\nTeam ${idx + 1}:`)
      team.players.forEach(p => {
        console.log(`  - ${p.playerName} (${p.mmr}): ${p.preferredRoles.join(', ')}`)
      })

      const roleCounts: Record<string, number> = {
        'Hard Support': 0,
        'Soft Support': 0,
        'Carry': 0,
        'Mid': 0,
        'Offlane': 0,
      }
      team.players.forEach(player => {
        player.preferredRoles.forEach(role => {
          if (roleCounts[role] !== undefined) {
            roleCounts[role]++
          }
        })
      })
      console.log(`  Role counts:`, roleCounts)
    })

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

    console.log('\n=== CAPTAINS DRAFT RESULTS ===')
    console.log(`- Captains: ${captainIds.length}`)
    console.log(`- Teams: ${result.teams.length}`)
    console.log(`- Reserve players: ${result.reservePlayers.length}`)
    console.log(`- Balance variance: ${result.balance.variance}`)

    result.teams.forEach((team, idx) => {
      const captain = team.players.find(p => captainIds.includes(p.id))
      console.log(`\nTeam ${idx + 1} (Captain: ${captain?.playerName || 'N/A'}):`)
      team.players.forEach(p => {
        const isCaptain = captainIds.includes(p.id)
        console.log(`  ${isCaptain ? '👑' : '-'} ${p.playerName} (${p.mmr})`)
      })
    })

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

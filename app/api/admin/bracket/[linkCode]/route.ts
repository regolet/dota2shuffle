import { NextRequest, NextResponse } from 'next/server'
import { db, brackets, teams, registrationLinks, shuffleHistory, bracketHistory } from '@/db'
import { eq, desc, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getAuthorizedLink } from '@/lib/db-helpers'
import { generateSingleEliminationBracket } from '@/lib/bracket'

// GET - Fetch bracket for event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const session = await requireAuth()
    const { linkCode } = await params

    // Get registration link with authorization
    const regLink = await getAuthorizedLink(linkCode, session.adminId)

    if (!regLink) {
      return NextResponse.json(
        { error: 'Not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get bracket for this event
    const [bracket] = await db
      .select()
      .from(brackets)
      .where(eq(brackets.registrationLinkId, regLink.id))
      .limit(1)

    if (!bracket) {
      return NextResponse.json({ bracket: null })
    }

    // Parse bracket rounds to extract team IDs
    const rounds = bracket.rounds ? JSON.parse(bracket.rounds as unknown as string) : []
    const teamIds = new Set<string>()

    // Extract all team IDs from bracket matches
    rounds.forEach((round: any) => {
      round.matches?.forEach((match: any) => {
        if (match.team1Id) teamIds.add(match.team1Id)
        if (match.team2Id) teamIds.add(match.team2Id)
      })
    })

    // Get teams that are actually in the bracket
    const bracketTeams = teamIds.size > 0
      ? await db
        .select()
        .from(teams)
        .where(inArray(teams.id, Array.from(teamIds)))
      : []

    return NextResponse.json({
      bracket: {
        ...bracket,
        teams: bracketTeams,
        rounds: rounds,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Get bracket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create bracket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const session = await requireAuth()
    const { linkCode } = await params
    const body = await request.json()

    // Get registration link with authorization
    const regLink = await getAuthorizedLink(linkCode, session.adminId)

    if (!regLink) {
      return NextResponse.json(
        { error: 'Not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if bracket already exists
    const [existingBracket] = await db
      .select()
      .from(brackets)
      .where(eq(brackets.registrationLinkId, regLink.id))
      .limit(1)

    if (existingBracket) {
      // If recreate flag is set, delete the existing bracket
      if (body.recreate) {
        // First delete all bracket history records for this bracket
        await db.delete(bracketHistory).where(eq(bracketHistory.bracketId, existingBracket.id))
        // Then delete the bracket itself
        await db.delete(brackets).where(eq(brackets.id, existingBracket.id))
      } else {
        return NextResponse.json(
          { error: 'Bracket already exists for this event' },
          { status: 400 }
        )
      }
    }

    // Get the shuffle history to use (either specified or most recent)
    let shuffleToUse
    if (body.shuffleHistoryId) {
      // Use the specified shuffle history
      const [specificShuffle] = await db
        .select()
        .from(shuffleHistory)
        .where(eq(shuffleHistory.id, body.shuffleHistoryId))
        .limit(1)
      shuffleToUse = specificShuffle
    } else {
      // Use the most recent shuffle history
      const [latestShuffle] = await db
        .select()
        .from(shuffleHistory)
        .where(eq(shuffleHistory.registrationLinkId, regLink.id))
        .orderBy(desc(shuffleHistory.shuffledAt))
        .limit(1)
      shuffleToUse = latestShuffle
    }

    if (!shuffleToUse) {
      return NextResponse.json(
        { error: 'No saved shuffle found. Please shuffle and save teams first.' },
        { status: 400 }
      )
    }

    // Get teams from the selected shuffle
    const eventTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.shuffleHistoryId, shuffleToUse.id))

    if (eventTeams.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 teams to create a bracket' },
        { status: 400 }
      )
    }

    // Generate bracket
    let bracketTeams = eventTeams.map((t) => ({
      id: t.id,
      teamNumber: t.teamNumber,
      teamName: t.teamName,
      averageMmr: t.averageMmr,
      playerIds: t.playerIds as string[],
    }))

    if (body.randomizeSeeds) {
      for (let i = bracketTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bracketTeams[i], bracketTeams[j]] = [bracketTeams[j], bracketTeams[i]];
      }
    }

    const rounds = generateSingleEliminationBracket(bracketTeams)

    // Create bracket in database
    const [newBracket] = await db
      .insert(brackets)
      .values({
        registrationLinkId: regLink.id,
        name: body.name || 'Tournament Bracket',
        bracketType: body.bracketType || 'single_elimination',
        status: 'active',
        rounds: JSON.stringify(rounds) as any,
      })
      .returning()

    // Automatically save initial bracket state to history
    await db.insert(bracketHistory).values({
      bracketId: newBracket.id,
      registrationLinkId: regLink.id,
      name: newBracket.name,
      bracketType: newBracket.bracketType,
      status: newBracket.status,
      rounds: JSON.stringify(rounds) as any,
      snapshot: JSON.stringify({ bracket: newBracket, teams: eventTeams }) as any,
      description: 'Initial bracket creation',
    })

    return NextResponse.json(
      {
        success: true,
        bracket: {
          ...newBracket,
          teams: eventTeams,
          rounds,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Create bracket error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete bracket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const session = await requireAuth()
    const { linkCode } = await params

    // Get registration link with authorization
    const regLink = await getAuthorizedLink(linkCode, session.adminId)

    if (!regLink) {
      return NextResponse.json(
        { error: 'Not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get the bracket first
    const [bracket] = await db
      .select()
      .from(brackets)
      .where(eq(brackets.registrationLinkId, regLink.id))
      .limit(1)

    if (!bracket) {
      return NextResponse.json(
        { error: 'Bracket not found' },
        { status: 404 }
      )
    }

    // Delete bracket history first to avoid foreign key constraint
    await db.delete(bracketHistory).where(eq(bracketHistory.bracketId, bracket.id))

    // Then delete the bracket
    await db.delete(brackets).where(eq(brackets.id, bracket.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Delete bracket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

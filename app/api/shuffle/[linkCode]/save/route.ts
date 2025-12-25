import { NextRequest, NextResponse } from 'next/server'
import { db, registrationLinks, teams, shuffleHistory } from '@/db'
import { eq } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const { linkCode } = await params
    const body = await request.json()
    const { teams: shuffledTeams, balance, totalPlayers, reservePlayers, captainIds } = body

    if (!shuffledTeams || !Array.isArray(shuffledTeams) || shuffledTeams.length === 0) {
      return NextResponse.json(
        { error: 'Invalid teams data' },
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

    // Create shuffle history entry
    const reservePlayerIds = reservePlayers?.map((p: any) => p.id) || []
    const [history] = await db
      .insert(shuffleHistory)
      .values({
        registrationLinkId: regLink.id,
        playerCount: totalPlayers,
        teamCount: shuffledTeams.length,
        balanceScore: Math.round((balance?.variance || 0) * 1000),
        reservePlayerIds: reservePlayerIds,
        captainIds: captainIds || [],
      })
      .returning()

    // NOTE: We no longer delete old teams - we keep all historical teams
    // Each shuffle history has its own set of teams linked by shuffleHistoryId
    // This allows viewing any previously saved shuffle

    // Save teams to database with shuffle history link
    const savedTeams = []
    for (let i = 0; i < shuffledTeams.length; i++) {
      const team = shuffledTeams[i]
      const [savedTeam] = await db
        .insert(teams)
        .values({
          registrationLinkId: regLink.id,
          shuffleHistoryId: history.id,
          teamNumber: team.teamNumber,
          teamName: team.teamName || null,
          averageMmr: Math.round(team.averageMmr),
          playerIds: team.players.map((p: any) => p.id),
        })
        .returning()

      savedTeams.push(savedTeam)
    }

    return NextResponse.json({
      success: true,
      message: 'Teams saved successfully',
      historyId: history.id,
      savedTeams: savedTeams,
    })
  } catch (error) {
    console.error('Save teams error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

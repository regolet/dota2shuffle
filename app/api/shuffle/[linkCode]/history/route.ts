import { NextRequest, NextResponse } from 'next/server'
import { db, shuffleHistory, teams, players, registrationLinks } from '@/db'
import { eq, desc } from 'drizzle-orm'

// GET - Fetch all shuffle history for a link code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const { linkCode } = await params
    const { searchParams } = new URL(request.url)
    const historyId = searchParams.get('historyId')

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

    // If historyId is provided, fetch specific shuffle
    if (historyId) {
      const [history] = await db
        .select()
        .from(shuffleHistory)
        .where(eq(shuffleHistory.id, historyId))
        .limit(1)

      if (!history) {
        return NextResponse.json(
          { error: 'Shuffle history not found' },
          { status: 404 }
        )
      }

      // Get teams for this shuffle
      const shuffleTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.shuffleHistoryId, historyId))

      // Get all players for this link to map player details
      const allPlayers = await db
        .select()
        .from(players)
        .where(eq(players.registrationLinkId, regLink.id))

      // Map player IDs to player details
      const teamsWithPlayers = shuffleTeams.map((team) => {
        const teamPlayers = (team.playerIds as string[]).map((playerId) => {
          const player = allPlayers.find((p) => p.id === playerId)
          return player
            ? {
                id: player.id,
                playerName: player.playerName,
                mmr: player.mmr,
                preferredRoles: player.preferredRoles as string[],
              }
            : null
        }).filter(Boolean)

        return {
          teamNumber: team.teamNumber,
          teamName: team.teamName,
          averageMmr: team.averageMmr,
          players: teamPlayers,
          totalMmr: teamPlayers.reduce((sum: number, p: any) => sum + p.mmr, 0),
        }
      })

      // Map reserve player IDs to player details
      const reservePlayerIds = (history.reservePlayerIds as string[]) || []
      const reservePlayersWithDetails = reservePlayerIds.map((playerId) => {
        const player = allPlayers.find((p) => p.id === playerId)
        return player
          ? {
              id: player.id,
              playerName: player.playerName,
              mmr: player.mmr,
              preferredRoles: player.preferredRoles as string[],
            }
          : null
      }).filter(Boolean)

      return NextResponse.json({
        success: true,
        history,
        teams: teamsWithPlayers,
        reservePlayers: reservePlayersWithDetails,
      })
    }

    // Fetch all shuffle history for this link
    const histories = await db
      .select()
      .from(shuffleHistory)
      .where(eq(shuffleHistory.registrationLinkId, regLink.id))
      .orderBy(desc(shuffleHistory.shuffledAt))

    return NextResponse.json({
      success: true,
      histories,
    })
  } catch (error) {
    console.error('Fetch shuffle history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a specific shuffle history entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const { linkCode } = await params
    const { searchParams } = new URL(request.url)
    const historyId = searchParams.get('historyId')

    if (!historyId) {
      return NextResponse.json(
        { error: 'History ID is required' },
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

    // Verify the shuffle history belongs to this link
    const [history] = await db
      .select()
      .from(shuffleHistory)
      .where(eq(shuffleHistory.id, historyId))
      .limit(1)

    if (!history) {
      return NextResponse.json(
        { error: 'Shuffle history not found' },
        { status: 404 }
      )
    }

    if (history.registrationLinkId !== regLink.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete teams associated with this shuffle history
    await db.delete(teams).where(eq(teams.shuffleHistoryId, historyId))

    // Delete shuffle history entry
    await db.delete(shuffleHistory).where(eq(shuffleHistory.id, historyId))

    return NextResponse.json({
      success: true,
      message: 'Shuffle history deleted successfully',
    })
  } catch (error) {
    console.error('Delete shuffle history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

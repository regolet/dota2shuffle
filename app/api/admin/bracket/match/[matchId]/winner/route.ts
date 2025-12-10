import { NextRequest, NextResponse } from 'next/server'
import { db, brackets } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { setMatchWinner } from '@/lib/bracket'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await requireAuth()
    const { matchId } = await params
    const body = await request.json()

    // Find bracket containing this match
    const allBrackets = await db.select().from(brackets)

    let targetBracket: any = null
    for (const bracket of allBrackets) {
      const rounds = JSON.parse(bracket.rounds as unknown as string)
      for (const round of rounds) {
        const match = round.matches.find((m: any) => m.id === matchId)
        if (match) {
          targetBracket = bracket
          break
        }
      }
      if (targetBracket) break
    }

    if (!targetBracket) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Update bracket with winner
    const rounds = JSON.parse(targetBracket.rounds as unknown as string)
    const updatedRounds = setMatchWinner(rounds, matchId, body.winnerId)

    // Save updated bracket
    await db
      .update(brackets)
      .set({
        rounds: JSON.stringify(updatedRounds) as any,
      })
      .where(eq(brackets.id, targetBracket.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Set winner error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

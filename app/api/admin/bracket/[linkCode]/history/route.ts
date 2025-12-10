import { NextRequest, NextResponse } from 'next/server'
import { db, brackets, bracketHistory, registrationLinks } from '@/db'
import { eq, desc, and } from 'drizzle-orm'

// GET - Fetch all bracket history for a link code
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

    // If historyId is provided, fetch specific bracket snapshot
    if (historyId) {
      const [history] = await db
        .select()
        .from(bracketHistory)
        .where(eq(bracketHistory.id, historyId))
        .limit(1)

      if (!history) {
        return NextResponse.json(
          { error: 'Bracket history not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        history,
      })
    }

    // Fetch all bracket history for this link
    const histories = await db
      .select()
      .from(bracketHistory)
      .where(eq(bracketHistory.registrationLinkId, regLink.id))
      .orderBy(desc(bracketHistory.savedAt))

    return NextResponse.json({
      success: true,
      histories,
    })
  } catch (error) {
    console.error('Fetch bracket history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save current bracket state to history
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const { linkCode } = await params
    const body = await request.json()
    const { bracketId, description } = body

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

    // Get current bracket
    const [bracket] = await db
      .select()
      .from(brackets)
      .where(
        and(
          eq(brackets.id, bracketId),
          eq(brackets.registrationLinkId, regLink.id)
        )
      )
      .limit(1)

    if (!bracket) {
      return NextResponse.json(
        { error: 'Bracket not found' },
        { status: 404 }
      )
    }

    // Save bracket snapshot
    const [history] = await db
      .insert(bracketHistory)
      .values({
        bracketId: bracket.id,
        registrationLinkId: regLink.id,
        name: bracket.name,
        bracketType: bracket.bracketType,
        status: bracket.status,
        rounds: bracket.rounds,
        snapshot: bracket.rounds, // Store complete state
        description: description || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      history,
    })
  } catch (error) {
    console.error('Save bracket history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

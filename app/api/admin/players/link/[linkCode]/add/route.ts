import { NextRequest, NextResponse } from 'next/server'
import { db, players, registrationLinks, playerMasterlist } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { ZodError } from 'zod'
import { registrationSchema } from '@/lib/validators'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    await requireAuth()
    const { linkCode } = await params
    const body = await request.json()

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

    // Create player
    const [newPlayer] = await db
      .insert(players)
      .values({
        playerName: body.playerName,
        mmr: body.mmr,
        preferredRoles: body.preferredRoles,
        registrationLinkId: regLink.id,
        status: 'Present',
      })
      .returning()

    // Update or create masterlist entry
    const [masterlistEntry] = await db
      .select()
      .from(playerMasterlist)
      .where(eq(playerMasterlist.playerName, body.playerName))
      .limit(1)

    if (masterlistEntry) {
      await db
        .update(playerMasterlist)
        .set({
          defaultMmr: body.mmr,
          updatedAt: new Date(),
        })
        .where(eq(playerMasterlist.id, masterlistEntry.id))
    } else {
      await db.insert(playerMasterlist).values({
        playerName: body.playerName,
        defaultMmr: body.mmr,
      })
    }

    return NextResponse.json({ success: true, player: newPlayer }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Add player error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

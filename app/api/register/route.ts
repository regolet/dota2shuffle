import { NextRequest, NextResponse } from 'next/server'
import { db, players, registrationLinks, playerMasterlist } from '@/db'
import { registrationSchema } from '@/lib/validators'
import { eq, and } from 'drizzle-orm'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validated = registrationSchema.parse(body)

    // Check if registration link exists and is valid
    const [regLink] = await db
      .select()
      .from(registrationLinks)
      .where(eq(registrationLinks.linkCode, validated.linkCode))
      .limit(1)

    if (!regLink) {
      return NextResponse.json(
        { error: 'Invalid registration link' },
        { status: 404 }
      )
    }

    // Check if link is active
    if (!regLink.isActive) {
      return NextResponse.json(
        { error: 'This registration link has been deactivated' },
        { status: 403 }
      )
    }

    // Check if link has expired
    if (regLink.expiresAt && regLink.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This registration link has expired' },
        { status: 403 }
      )
    }

    // Check if max players reached
    const existingPlayers = await db
      .select()
      .from(players)
      .where(eq(players.registrationLinkId, regLink.id))

    if (existingPlayers.length >= regLink.maxPlayers) {
      return NextResponse.json(
        { error: 'Maximum number of players reached' },
        { status: 403 }
      )
    }

    // Check for duplicate registration
    const duplicate = existingPlayers.find(
      (p) => p.playerName.toLowerCase() === validated.playerName.toLowerCase()
    )

    if (duplicate) {
      return NextResponse.json(
        { error: 'A player with this name has already registered' },
        { status: 409 }
      )
    }

    // Check if player is banned in masterlist
    const [masterlistEntry] = await db
      .select()
      .from(playerMasterlist)
      .where(eq(playerMasterlist.playerName, validated.playerName))
      .limit(1)

    if (masterlistEntry?.isBanned) {
      return NextResponse.json(
        {
          error: 'You are banned from registering',
          reason: masterlistEntry.banReason,
        },
        { status: 403 }
      )
    }

    // Create player registration
    const [newPlayer] = await db
      .insert(players)
      .values({
        playerName: validated.playerName,
        mmr: validated.mmr,
        preferredRoles: validated.preferredRoles,
        registrationLinkId: regLink.id,
        status: 'Present',
      })
      .returning()

    // Update or create masterlist entry
    if (masterlistEntry) {
      await db
        .update(playerMasterlist)
        .set({
          defaultMmr: validated.mmr,
          updatedAt: new Date(),
        })
        .where(eq(playerMasterlist.id, masterlistEntry.id))
    } else {
      await db.insert(playerMasterlist).values({
        playerName: validated.playerName,
        defaultMmr: validated.mmr,
      })
    }

    return NextResponse.json(
      {
        success: true,
        player: newPlayer,
        message: 'Registration successful!',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check registration link validity
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const linkCode = searchParams.get('linkCode')

  if (!linkCode) {
    return NextResponse.json({ error: 'Link code required' }, { status: 400 })
  }

  try {
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

    const playerCount = await db
      .select()
      .from(players)
      .where(eq(players.registrationLinkId, regLink.id))

    const isValid =
      regLink.isActive &&
      (!regLink.expiresAt || regLink.expiresAt > new Date()) &&
      playerCount.length < regLink.maxPlayers

    return NextResponse.json({
      valid: isValid,
      link: {
        title: regLink.title,
        description: regLink.description,
        maxPlayers: regLink.maxPlayers,
        currentPlayers: playerCount.length,
        expiresAt: regLink.expiresAt,
      },
    })
  } catch (error) {
    console.error('Link check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { db, registrationLinks, players } from '@/db'
import { eq, and } from 'drizzle-orm'

/**
 * Validates if the given admin owns the registration link
 * @param identifier The link ID or linkCode
 * @param adminId The ID of the authenticated admin
 * @param isId Whether the identifier is an ID (true) or a linkCode (false, default)
 * @returns The link object if authorized, null otherwise
 */
export async function getAuthorizedLink(identifier: string, adminId: string, isId: boolean = false) {
    const [link] = await db
        .select()
        .from(registrationLinks)
        .where(
            and(
                isId
                    ? eq(registrationLinks.id, identifier)
                    : eq(registrationLinks.linkCode, identifier),
                eq(registrationLinks.createdBy, adminId)
            )
        )
        .limit(1)

    return link || null
}

/**
 * Validates if the given admin has access to the given player
 * @param playerId The player ID
 * @param adminId The ID of the authenticated admin
 * @returns The player object if authorized, null otherwise
 */
export async function getAuthorizedPlayer(playerId: string, adminId: string) {
    const [result] = await db
        .select({ player: players })
        .from(players)
        .innerJoin(registrationLinks, eq(players.registrationLinkId, registrationLinks.id))
        .where(
            and(
                eq(players.id, playerId),
                eq(registrationLinks.createdBy, adminId)
            )
        )
        .limit(1)

    return result?.player || null
}

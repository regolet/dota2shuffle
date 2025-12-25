import { db, auditLogs } from '@/db'

export type AuditEventType =
    | 'login_success'
    | 'login_failure'
    | 'password_change'
    | 'account_locked'
    | 'admin_action'

interface AuditLogParams {
    eventType: AuditEventType
    adminId?: string
    ipAddress?: string
    userAgent?: string
    details?: Record<string, any>
}

/**
 * Log a security-relevant event
 */
export async function logSecurityEvent({
    eventType,
    adminId,
    ipAddress,
    userAgent,
    details,
}: AuditLogParams) {
    try {
        await db.insert(auditLogs).values({
            eventType,
            adminId: adminId || null,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: details || null,
        })
    } catch (error) {
        // Fail silently - logging should never break the application
        console.error('Audit log error:', error)
    }
}

/**
 * Extract client info from request headers
 */
export function getClientInfo(headers: Headers) {
    const forwarded = headers.get('x-forwarded-for')
    const ipAddress = forwarded
        ? forwarded.split(',')[0].trim()
        : headers.get('x-real-ip') || 'unknown'

    const userAgent = headers.get('user-agent') || 'unknown'

    return { ipAddress, userAgent }
}

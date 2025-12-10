import { NextRequest, NextResponse } from 'next/server'

// In-memory store for rate limiting
// In production, use Redis or similar for distributed systems
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in ms
const RATE_LIMIT_MAX_REQUESTS = 5 // 5 attempts per minute for login

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }
    return request.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const record = rateLimitStore.get(ip)

    if (!record) {
        rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
        return false
    }

    if (now > record.resetTime) {
        // Window expired, reset
        rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
        return false
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return true
    }

    record.count++
    return false
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Only rate limit the login endpoint
    if (pathname === '/api/admin/login' && request.method === 'POST') {
        const ip = getClientIP(request)

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again in 1 minute.' },
                { status: 429 }
            )
        }
    }

    return NextResponse.next()
}

// Configure which paths should run the middleware
export const config = {
    matcher: [
        '/api/admin/login',
        '/api/admin/change-password',
    ],
}

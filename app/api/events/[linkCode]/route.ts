import { NextRequest } from 'next/server'

// Store active SSE connections by linkCode
const connections = new Map<string, Set<ReadableStreamDefaultController>>()

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ linkCode: string }> }
) {
    const { linkCode } = await params

    // Create SSE response
    const stream = new ReadableStream({
        start(controller) {
            // Add this connection to the pool
            if (!connections.has(linkCode)) {
                connections.set(linkCode, new Set())
            }
            connections.get(linkCode)!.add(controller)

            // Send initial connection event
            const event = {
                type: 'connection_established',
                data: { linkCode },
                timestamp: Date.now(),
            }
            controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)

            // Keep connection alive with heartbeat
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(`: heartbeat\n\n`)
                } catch {
                    clearInterval(heartbeat)
                }
            }, 30000)

            // Cleanup on close
            request.signal.addEventListener('abort', () => {
                clearInterval(heartbeat)
                connections.get(linkCode)?.delete(controller)
                try {
                    controller.close()
                } catch { }
            })
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    })
}

// Broadcast an event to all connected clients for a given linkCode
export function broadcastEvent(linkCode: string, type: string, data: any) {
    const clients = connections.get(linkCode)
    if (!clients || clients.size === 0) return

    const event = {
        type,
        data,
        timestamp: Date.now(),
    }
    const message = `data: ${JSON.stringify(event)}\n\n`

    clients.forEach((controller) => {
        try {
            controller.enqueue(message)
        } catch {
            // Client disconnected, will be cleaned up
            clients.delete(controller)
        }
    })
}

// Export for use in other API routes
export { connections }

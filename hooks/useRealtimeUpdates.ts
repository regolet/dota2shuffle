'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type RealtimeEventType =
    | 'player_registered'
    | 'player_updated'
    | 'shuffle_completed'
    | 'teams_saved'
    | 'connection_established'

export interface RealtimeEvent {
    type: RealtimeEventType
    data: any
    timestamp: number
}

interface UseRealtimeUpdatesOptions {
    linkCode: string
    onEvent?: (event: RealtimeEvent) => void
    enabled?: boolean
}

export function useRealtimeUpdates({
    linkCode,
    onEvent,
    enabled = true
}: UseRealtimeUpdatesOptions) {
    const [connected, setConnected] = useState(false)
    const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
    const eventSourceRef = useRef<EventSource | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const reconnectAttemptsRef = useRef(0)

    const connect = useCallback(() => {
        if (!enabled || !linkCode) return

        // Clean up existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close()
        }

        try {
            const eventSource = new EventSource(`/api/events/${linkCode}`)
            eventSourceRef.current = eventSource

            eventSource.onopen = () => {
                setConnected(true)
                reconnectAttemptsRef.current = 0
            }

            eventSource.onmessage = (event) => {
                try {
                    const data: RealtimeEvent = JSON.parse(event.data)
                    setLastEvent(data)
                    onEvent?.(data)
                } catch (err) {
                    console.error('Failed to parse SSE event:', err)
                }
            }

            eventSource.onerror = () => {
                setConnected(false)
                eventSource.close()

                // Exponential backoff reconnection
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
                reconnectAttemptsRef.current++

                reconnectTimeoutRef.current = setTimeout(connect, delay)
            }
        } catch (err) {
            console.error('Failed to create EventSource:', err)
        }
    }, [linkCode, onEvent, enabled])

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
        }

        setConnected(false)
    }, [])

    useEffect(() => {
        if (enabled) {
            connect()
        }

        return () => {
            disconnect()
        }
    }, [connect, disconnect, enabled])

    return {
        connected,
        lastEvent,
        reconnect: connect,
        disconnect,
    }
}

// Connection status indicator component
export function ConnectionStatus({ connected }: { connected: boolean }) {
    return (
        <div className= "flex items-center gap-2 text-sm" >
        <div
        className={
        `w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`
    }
      />
        < span className = "text-gray-400" >
            { connected? 'Live': 'Reconnecting...' }
            </span>
            </div>
  )
}

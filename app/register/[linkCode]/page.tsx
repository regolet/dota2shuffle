'use client'

import { useState, useEffect, use } from 'react'
import { DOTA_ROLES } from '@/lib/validators'
import { RegistrationLink } from '@/types'

export default function RegisterPage({ params }: { params: Promise<{ linkCode: string }> }) {
  const { linkCode } = use(params)
  const [playerName, setPlayerName] = useState('')
  const [mmr, setMmr] = useState<number | ''>('')
  const [preferredRoles, setPreferredRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [linkInfo, setLinkInfo] = useState<Partial<RegistrationLink> | null>(null)
  const [linkValid, setLinkValid] = useState(true)

  useEffect(() => {
    // Check if already registered in localStorage
    const registeredKey = `registered_${linkCode}`
    const alreadyRegistered = localStorage.getItem(registeredKey)

    if (alreadyRegistered) {
      setSuccess(true)
      setLinkInfo({ title: 'Event' }) // Set a default title
      return
    }

    checkLinkValidity()
  }, [linkCode])

  const checkLinkValidity = async () => {
    try {
      const res = await fetch(`/api/register?linkCode=${linkCode}`)
      const data = await res.json()

      if (!res.ok || !data.valid) {
        setLinkValid(false)
        setError(data.error || 'This registration link is invalid or expired')
        return
      }

      setLinkInfo(data.link)
    } catch (err) {
      setLinkValid(false)
      setError('Failed to check link validity')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (preferredRoles.length === 0) {
      setError('Please select at least one preferred role')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkCode,
          playerName,
          mmr: Number(mmr),
          preferredRoles,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      // Save to localStorage to prevent duplicate registration
      const registeredKey = `registered_${linkCode}`
      localStorage.setItem(registeredKey, JSON.stringify({
        playerName,
        registeredAt: new Date().toISOString()
      }))

      setSuccess(true)
    } catch (err) {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const toggleRole = (role: string) => {
    if (preferredRoles.includes(role)) {
      setPreferredRoles(preferredRoles.filter((r) => r !== role))
    } else {
      // Limit to 2 roles maximum
      if (preferredRoles.length >= 2) {
        setError('Maximum 2 roles allowed')
        setTimeout(() => setError(''), 2000)
        return
      }
      setPreferredRoles([...preferredRoles, role])
    }
  }

  if (!linkValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dota-bg to-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-dota-card p-8 rounded-lg border border-red-500 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
              <p className="text-gray-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dota-bg to-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-dota-card p-8 rounded-lg border border-dota-radiant shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✓</div>
              <h1 className="text-2xl font-bold mb-4">Registration Successful!</h1>
              <p className="text-gray-300 mb-6">
                You have been registered for <strong>{linkInfo?.title}</strong>
              </p>
              <p className="text-sm text-gray-400">
                Please wait for the event organizer to shuffle teams
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dota-bg to-gray-900 p-4 safe-top safe-bottom">
      <div className="max-w-2xl w-full">
        <div className="bg-dota-card p-8 rounded-lg border border-gray-700 shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">Player Registration</h1>

          {linkInfo && (
            <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
              <h2 className="text-xl font-semibold mb-1">{linkInfo.title}</h2>
              {linkInfo.description && (
                <p className="text-sm text-gray-400 mb-2">{linkInfo.description}</p>
              )}
              <p className="text-sm text-gray-400">
                Players: {linkInfo.currentPlayers} / {linkInfo.maxPlayers}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Player Name *
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-dota-radiant touch-target"
                required
                disabled={loading}
                placeholder="Enter your in-game name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">MMR *</label>
              <input
                type="number"
                value={mmr}
                onChange={(e) => setMmr(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-dota-radiant touch-target"
                required
                disabled={loading}
                min="0"
                max="15000"
                placeholder="Enter your current MMR"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Preferred Roles * (select 1-2 roles)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DOTA_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-4 py-3 rounded border-2 transition-all ${preferredRoles.includes(role)
                      ? 'bg-dota-radiant border-dota-radiant text-white'
                      : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                      }`}
                    disabled={loading}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dota-radiant hover:bg-opacity-80 text-white font-semibold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-target text-lg"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

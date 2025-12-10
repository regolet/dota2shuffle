'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BUTTON_STYLES } from '@/lib/button-styles'

interface MasterlistPlayer {
  id: string
  playerName: string
  steamId: string | null
  discordId: string | null
  defaultMmr: number | null
  isBanned: boolean
  banReason: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export default function MasterlistPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<MasterlistPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchMasterlist()
  }, [])

  const fetchMasterlist = async () => {
    try {
      const res = await fetch('/api/admin/masterlist')
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error)
      }

      setPlayers(data.players)
    } catch (err) {
      console.error('Failed to fetch masterlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleBan = async (playerId: string, isBanned: boolean, playerName: string) => {
    if (!isBanned) {
      const reason = prompt(`Enter ban reason for ${playerName}:`)
      if (!reason) return

      try {
        const res = await fetch(`/api/admin/masterlist/${playerId}/ban`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ banReason: reason }),
        })

        if (res.ok) {
          fetchMasterlist()
        } else {
          alert('Failed to ban player')
        }
      } catch (err) {
        alert('Error banning player')
      }
    } else {
      // Unban
      try {
        const res = await fetch(`/api/admin/masterlist/${playerId}/unban`, {
          method: 'PATCH',
        })

        if (res.ok) {
          fetchMasterlist()
        } else {
          alert('Failed to unban player')
        }
      } catch (err) {
        alert('Error unbanning player')
      }
    }
  }

  const filteredPlayers = players.filter((player) =>
    player.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Players Masterlist</h1>
          <div className="flex gap-3">
            <Link
              href="/admin/dashboard"
              className={BUTTON_STYLES.secondary + ' inline-flex items-center gap-2'}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-dota-card border border-gray-700 rounded focus:outline-none focus:border-dota-radiant"
          />
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-dota-card p-6 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Total Players</p>
            <p className="text-3xl font-bold">{players.length}</p>
          </div>
          <div className="bg-dota-card p-6 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Active Players</p>
            <p className="text-3xl font-bold text-green-400">
              {players.filter((p) => !p.isBanned).length}
            </p>
          </div>
          <div className="bg-dota-card p-6 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Banned Players</p>
            <p className="text-3xl font-bold text-red-400">
              {players.filter((p) => p.isBanned).length}
            </p>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-dota-card p-6 rounded-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">All Players</h2>

          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : filteredPlayers.length === 0 ? (
            <p className="text-gray-400">
              {searchTerm ? 'No players found matching your search.' : 'No players in masterlist yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Player Name</th>
                    <th className="text-left py-3 px-4">Default MMR</th>
                    <th className="text-left py-3 px-4">Steam ID</th>
                    <th className="text-left py-3 px-4">Discord ID</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Last Updated</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className={`border-b border-gray-800 hover:bg-gray-800 transition-colors ${player.isBanned ? 'opacity-60' : ''
                        }`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold">{player.playerName}</p>
                          {player.notes && (
                            <p className="text-xs text-gray-400 mt-1">
                              Note: {player.notes}
                            </p>
                          )}
                          {player.isBanned && player.banReason && (
                            <p className="text-xs text-red-400 mt-1">
                              Ban reason: {player.banReason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-dota-radiant font-bold">
                          {player.defaultMmr || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {player.steamId || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {player.discordId || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded text-sm ${player.isBanned
                              ? 'bg-red-500 bg-opacity-20 text-red-300'
                              : 'bg-green-500 bg-opacity-20 text-green-300'
                            }`}
                        >
                          {player.isBanned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {new Date(player.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleBan(player.id, player.isBanned, player.playerName)}
                          className={`px-3 py-1 rounded text-xs transition-colors ${player.isBanned
                              ? 'bg-green-600 hover:bg-green-500'
                              : 'bg-red-600 hover:bg-red-500'
                            }`}
                        >
                          {player.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Home, Users, Settings, Ban, CheckCircle } from 'lucide-react'
import { MobileNav } from '@/components/MobileNav'
import { useNotification } from '@/hooks/useNotification'

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
  const notification = useNotification()
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
      const reason = prompt(`Ban reason for ${playerName}:`)
      if (!reason) return
      try {
        const res = await fetch(`/api/admin/masterlist/${playerId}/ban`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ banReason: reason }),
        })
        if (res.ok) {
          fetchMasterlist()
          notification.success(`${playerName} banned`)
        } else notification.error('Failed to ban')
      } catch (err) {
        notification.error('Error banning')
      }
    } else {
      try {
        const res = await fetch(`/api/admin/masterlist/${playerId}/unban`, { method: 'PATCH' })
        if (res.ok) {
          fetchMasterlist()
          notification.success(`${playerName} unbanned`)
        } else notification.error('Failed to unban')
      } catch (err) {
        notification.error('Error unbanning')
      }
    }
  }

  const filteredPlayers = players.filter((p) =>
    p.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { href: '/admin/masterlist', label: 'Masterlist', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ]

  const activeCount = players.filter((p) => !p.isBanned).length
  const bannedCount = players.filter((p) => p.isBanned).length

  return (
    <>
      <notification.NotificationContainer />
      <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-4 lg:p-6 safe-top safe-bottom">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <MobileNav items={navItems} />
              <h1 className="text-xl lg:text-3xl font-bold">Masterlist</h1>
            </div>
            <Link href="/admin/dashboard" className="desktop-only bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{players.length}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{activeCount}</div>
              <div className="text-xs text-green-300">Active</div>
            </div>
            <div className="bg-red-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{bannedCount}</div>
              <div className="text-xs text-red-300">Banned</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-dota-card border border-gray-700 rounded-lg focus:outline-none focus:border-dota-radiant touch-target"
            />
          </div>

          {/* Players List */}
          <div className="bg-dota-card p-4 lg:p-6 rounded-lg border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Players ({filteredPlayers.length})</h2>

            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : filteredPlayers.length === 0 ? (
              <p className="text-gray-400">
                {searchTerm ? 'No players found.' : 'No players in masterlist yet.'}
              </p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">Player</th>
                        <th className="text-left py-3 px-4">MMR</th>
                        <th className="text-left py-3 px-4">Steam ID</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlayers.map((player) => (
                        <tr key={player.id} className={`border-b border-gray-800 hover:bg-gray-800 ${player.isBanned ? 'opacity-60' : ''}`}>
                          <td className="py-3 px-4">
                            <p className="font-semibold">{player.playerName}</p>
                            {player.notes && <p className="text-xs text-gray-400">Note: {player.notes}</p>}
                            {player.isBanned && player.banReason && (
                              <p className="text-xs text-red-400">Ban: {player.banReason}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-dota-radiant font-bold">{player.defaultMmr || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-400 text-sm">{player.steamId || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${player.isBanned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                              {player.isBanned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleBan(player.id, player.isBanned, player.playerName)}
                              className={`px-3 py-1 rounded text-xs ${player.isBanned ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                            >
                              {player.isBanned ? 'Unban' : 'Ban'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className={`mobile-card ${player.isBanned ? 'opacity-70 border-red-500/30' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{player.playerName}</h3>
                          {player.defaultMmr && (
                            <span className="text-sm text-dota-radiant">{player.defaultMmr} MMR</span>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${player.isBanned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                          {player.isBanned ? 'Banned' : 'Active'}
                        </span>
                      </div>

                      {player.notes && <p className="text-xs text-gray-400 mb-2">Note: {player.notes}</p>}
                      {player.isBanned && player.banReason && (
                        <p className="text-xs text-red-400 mb-2">Ban: {player.banReason}</p>
                      )}

                      <button
                        onClick={() => toggleBan(player.id, player.isBanned, player.playerName)}
                        className={`w-full py-2 rounded text-center touch-target flex items-center justify-center gap-2 ${player.isBanned
                            ? 'bg-green-600/20 text-green-300'
                            : 'bg-red-600/20 text-red-300'
                          }`}
                      >
                        {player.isBanned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        {player.isBanned ? 'Unban' : 'Ban Player'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

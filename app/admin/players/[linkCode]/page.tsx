'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DOTA_ROLES } from '@/lib/validators'
import { useNotification } from '@/hooks/useNotification'
import { UserPlus, Shuffle, ExternalLink, X, Edit, Trash2, Save, ArrowLeft, Home, Users, Settings } from 'lucide-react'
import { MobileNav } from '@/components/MobileNav'
import { BUTTON_STYLES } from '@/lib/styles/button'

interface Player {
  id: string
  playerName: string
  mmr: number
  preferredRoles: string[]
  status: string
  registeredAt: Date
}

export default function PlayersPage({ params }: { params: Promise<{ linkCode: string }> }) {
  const { linkCode } = use(params)
  const notification = useNotification()
  const [players, setPlayers] = useState<Player[]>([])
  const [linkInfo, setLinkInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerMmr, setNewPlayerMmr] = useState<number | ''>('')
  const [newPlayerRoles, setNewPlayerRoles] = useState<string[]>([])
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editMmr, setEditMmr] = useState<number | ''>('')
  const [editRoles, setEditRoles] = useState<string[]>([])

  useEffect(() => {
    fetchPlayers()
  }, [linkCode])

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`/api/admin/players/link/${linkCode}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlayers(data.players)
      setLinkInfo(data.link)
    } catch (err) {
      console.error('Failed to fetch players:', err)
    } finally {
      setLoading(false)
    }
  }

  const togglePlayerStatus = async (playerId: string, currentStatus: string) => {
    const statusCycle = { 'Present': 'Absent', 'Absent': 'Reserve', 'Reserve': 'Present' }
    const newStatus = statusCycle[currentStatus as keyof typeof statusCycle]
    try {
      const res = await fetch(`/api/admin/players/${playerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchPlayers()
      else notification.error('Failed to update status')
    } catch (err) {
      notification.error('Error updating status')
    }
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/admin/players/link/${linkCode}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: newPlayerName,
          mmr: Number(newPlayerMmr),
          preferredRoles: newPlayerRoles,
        }),
      })
      if (res.ok) {
        setNewPlayerName('')
        setNewPlayerMmr('')
        setNewPlayerRoles([])
        setShowAddForm(false)
        fetchPlayers()
        notification.success('Player added!')
      } else {
        const data = await res.json()
        notification.error(data.error || 'Failed to add player')
      }
    } catch (err) {
      notification.error('Error adding player')
    }
  }

  const startEdit = (player: Player) => {
    setEditingPlayer(player.id)
    setEditName(player.playerName)
    setEditMmr(player.mmr)
    setEditRoles(player.preferredRoles)
  }

  const cancelEdit = () => {
    setEditingPlayer(null)
    setEditName('')
    setEditMmr('')
    setEditRoles([])
  }

  const saveEdit = async (playerId: string) => {
    try {
      const res = await fetch(`/api/admin/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: editName,
          mmr: Number(editMmr),
          preferredRoles: editRoles,
        }),
      })
      if (res.ok) {
        cancelEdit()
        fetchPlayers()
        notification.success('Player updated!')
      } else notification.error('Failed to update')
    } catch (err) {
      notification.error('Error updating')
    }
  }

  const deletePlayer = async (playerId: string, playerName: string) => {
    notification.confirm(`Delete ${playerName}?`, async () => {
      try {
        const res = await fetch(`/api/admin/players/${playerId}`, { method: 'DELETE' })
        if (res.ok) {
          fetchPlayers()
          notification.success('Deleted')
        } else notification.error('Failed to delete')
      } catch (err) {
        notification.error('Error deleting')
      }
    })
  }

  const toggleRole = (role: string, isEdit: boolean = false) => {
    const roles = isEdit ? editRoles : newPlayerRoles
    const setRoles = isEdit ? setEditRoles : setNewPlayerRoles
    if (roles.includes(role)) {
      setRoles(roles.filter((r) => r !== role))
    } else {
      if (roles.length >= 2) {
        notification.error('Max 2 roles')
        return
      }
      setRoles([...roles, role])
    }
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { href: '/admin/masterlist', label: 'Masterlist', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ]

  const presentCount = players.filter(p => p.status === 'Present').length
  const absentCount = players.filter(p => p.status === 'Absent').length
  const reserveCount = players.filter(p => p.status === 'Reserve').length

  return (
    <>
      <notification.NotificationContainer />
      <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-4 lg:p-6 safe-top safe-bottom">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <MobileNav items={navItems} />
              <div>
                <h1 className="text-xl lg:text-3xl font-bold">Players</h1>
                {linkInfo && <p className="text-gray-400 text-sm">{linkInfo.title}</p>}
              </div>
            </div>
            <Link href="/admin/dashboard" className="desktop-only bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{presentCount}</div>
              <div className="text-xs text-green-300">Present</div>
            </div>
            <div className="bg-red-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{absentCount}</div>
              <div className="text-xs text-red-300">Absent</div>
            </div>
            <div className="bg-yellow-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{reserveCount}</div>
              <div className="text-xs text-yellow-300">Reserve</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded transition-colors font-semibold inline-flex items-center gap-2 touch-target"
            >
              {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span className="hidden sm:inline">{showAddForm ? 'Cancel' : 'Add Player'}</span>
            </button>
            <Link
              href={`/shuffle/${linkCode}`}
              className="bg-dota-radiant hover:bg-opacity-80 px-4 py-2 rounded transition-colors font-semibold inline-flex items-center gap-2 touch-target"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Shuffle</span>
            </Link>
            <Link
              href={`/register/${linkCode}`}
              target="_blank"
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded transition-colors font-semibold inline-flex items-center gap-2 touch-target"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">View Page</span>
            </Link>
          </div>

          {/* Add Player Form */}
          {showAddForm && (
            <form onSubmit={handleAddPlayer} className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Add Player</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm mb-2">Name *</label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded touch-target"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">MMR *</label>
                  <input
                    type="number"
                    value={newPlayerMmr}
                    onChange={(e) => setNewPlayerMmr(Number(e.target.value))}
                    className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded touch-target"
                    min="0"
                    max="15000"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2">Roles * (1-2)</label>
                <div className="flex gap-2 flex-wrap">
                  {DOTA_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-2 rounded text-sm transition-colors touch-target ${newPlayerRoles.includes(role) ? 'bg-dota-radiant text-white' : 'bg-gray-700'
                        }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded touch-target">
                Add
              </button>
            </form>
          )}

          {/* Players List */}
          <div className="bg-dota-card p-4 rounded-lg border border-gray-700">
            <h2 className="text-lg font-semibold mb-3">Registered ({players.length})</h2>

            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : players.length === 0 ? (
              <p className="text-gray-400">No players yet.</p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-2">#</th>
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-left py-2 px-2">MMR</th>
                        <th className="text-left py-2 px-2">Roles</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-left py-2 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player, index) => (
                        <tr key={player.id} className="border-b border-gray-800 hover:bg-gray-800">
                          <td className="py-2 px-2">{index + 1}</td>
                          <td className="py-2 px-2 font-semibold">{player.playerName}</td>
                          <td className="py-2 px-2 text-dota-radiant font-bold">{player.mmr}</td>
                          <td className="py-2 px-2 text-gray-400">{player.preferredRoles.join(', ')}</td>
                          <td className="py-2 px-2">
                            <button
                              onClick={() => togglePlayerStatus(player.id, player.status)}
                              className={`px-2 py-1 rounded text-xs ${player.status === 'Present' ? 'bg-green-500/20 text-green-300' :
                                  player.status === 'Absent' ? 'bg-red-500/20 text-red-300' :
                                    'bg-yellow-500/20 text-yellow-300'
                                }`}
                            >
                              {player.status}
                            </button>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(player)} className="bg-blue-600 p-1.5 rounded">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deletePlayer(player.id, player.playerName)} className="bg-red-600 p-1.5 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {players.map((player, index) => (
                    <div key={player.id} className="mobile-card">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-gray-500 text-xs">#{index + 1}</span>
                          <h3 className="font-semibold">{player.playerName}</h3>
                        </div>
                        <button
                          onClick={() => togglePlayerStatus(player.id, player.status)}
                          className={`px-2 py-1 rounded text-xs ${player.status === 'Present' ? 'bg-green-500/20 text-green-300' :
                              player.status === 'Absent' ? 'bg-red-500/20 text-red-300' :
                                'bg-yellow-500/20 text-yellow-300'
                            }`}
                        >
                          {player.status}
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <span className="text-dota-radiant font-bold">{player.mmr} MMR</span>
                        <span className="text-gray-400">{player.preferredRoles.join(', ')}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(player)}
                          className="flex-1 bg-blue-600/20 text-blue-300 py-2 rounded text-center touch-target"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePlayer(player.id, player.playerName)}
                          className="flex-1 bg-red-600/20 text-red-300 py-2 rounded text-center touch-target"
                        >
                          Delete
                        </button>
                      </div>
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

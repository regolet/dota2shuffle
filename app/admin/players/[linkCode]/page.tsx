'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DOTA_ROLES } from '@/lib/validators'
import { useNotification } from '@/lib/useNotification'
import { UserPlus, Shuffle, ExternalLink, X, Edit, Trash2, Save } from 'lucide-react'

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

  // Add player form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerMmr, setNewPlayerMmr] = useState<number | ''>('')
  const [newPlayerRoles, setNewPlayerRoles] = useState<string[]>([])

  // Edit player state
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

      if (!res.ok) {
        throw new Error(data.error)
      }

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

      if (res.ok) {
        fetchPlayers()
      } else {
        notification.error('Failed to update player status')
      }
    } catch (err) {
      notification.error('Error updating player status')
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
        notification.success('Player added successfully!')
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
        notification.success('Player updated successfully!')
      } else {
        notification.error('Failed to update player')
      }
    } catch (err) {
      notification.error('Error updating player')
    }
  }

  const deletePlayer = async (playerId: string, playerName: string) => {
    notification.confirm(
      `Delete ${playerName}? This cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/players/${playerId}`, {
            method: 'DELETE',
          })

          if (res.ok) {
            fetchPlayers()
            notification.success('Player deleted successfully')
          } else {
            notification.error('Failed to delete player')
          }
        } catch (err) {
          notification.error('Error deleting player')
        }
      }
    )
  }

  const toggleRole = (role: string, isEdit: boolean = false) => {
    const roles = isEdit ? editRoles : newPlayerRoles
    const setRoles = isEdit ? setEditRoles : setNewPlayerRoles

    if (roles.includes(role)) {
      setRoles(roles.filter((r) => r !== role))
    } else {
      if (roles.length >= 2) {
        notification.error('Maximum 2 roles allowed')
        return
      }
      setRoles([...roles, role])
    }
  }

  return (
    <>
      <notification.NotificationContainer />
      <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Player Management</h1>
            {linkInfo && (
              <p className="text-gray-400 text-lg">{linkInfo.title}</p>
            )}
          </div>
          <Link
            href="/admin/dashboard"
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Actions */}
        <div className="bg-dota-card p-6 rounded-lg border border-gray-700 mb-8">
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded transition-colors font-semibold inline-flex items-center gap-2"
            >
              {showAddForm ? (
                <>
                  <X className="w-5 h-5" />
                  Cancel
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Add Player Manually
                </>
              )}
            </button>
            <Link
              href={`/shuffle/${linkCode}`}
              className="bg-dota-radiant hover:bg-opacity-80 px-6 py-3 rounded transition-colors font-semibold inline-flex items-center gap-2"
            >
              <Shuffle className="w-5 h-5" />
              Shuffle Teams
            </Link>
            <Link
              href={`/register/${linkCode}`}
              target="_blank"
              className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded transition-colors font-semibold inline-flex items-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              View Registration Page
            </Link>
          </div>

          {/* Add Player Form */}
          {showAddForm && (
            <form onSubmit={handleAddPlayer} className="mt-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4">Add Player</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm mb-2">Player Name *</label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">MMR *</label>
                  <input
                    type="number"
                    value={newPlayerMmr}
                    onChange={(e) => setNewPlayerMmr(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    min="0"
                    max="15000"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2">Preferred Roles * (select 1-2)</label>
                <div className="flex gap-2 flex-wrap">
                  {DOTA_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role, false)}
                      className={`px-3 py-2 rounded text-sm transition-colors ${
                        newPlayerRoles.includes(role)
                          ? 'bg-dota-radiant text-white'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded transition-colors"
              >
                Add Player
              </button>
            </form>
          )}
        </div>

        {/* Players List */}
        <div className="bg-dota-card p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-3">Registered Players</h2>

          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : players.length === 0 ? (
            <p className="text-gray-400 text-sm">No players registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-2 text-xs">#</th>
                    <th className="text-left py-2 px-2 text-xs">Player Name</th>
                    <th className="text-left py-2 px-2 text-xs">MMR</th>
                    <th className="text-left py-2 px-2 text-xs">Preferred Roles</th>
                    <th className="text-left py-2 px-2 text-xs">Status</th>
                    <th className="text-left py-2 px-2 text-xs">Registered</th>
                    <th className="text-left py-2 px-2 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr
                      key={player.id}
                      className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
                    >
                      {editingPlayer === player.id ? (
                        // Edit Mode
                        <>
                          <td className="py-2 px-2 text-xs">{index + 1}</td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={editMmr}
                              onChange={(e) => setEditMmr(Number(e.target.value))}
                              className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs"
                              min="0"
                              max="15000"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1 flex-wrap">
                              {DOTA_ROLES.map((role) => (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => toggleRole(role, true)}
                                  className={`px-1.5 py-0.5 rounded text-xs ${
                                    editRoles.includes(role)
                                      ? 'bg-dota-radiant text-white'
                                      : 'bg-gray-700'
                                  }`}
                                >
                                  {role}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-xs text-gray-400">{player.status}</span>
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-xs text-gray-400">
                              {new Date(player.registeredAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit(player.id)}
                                className="bg-green-600 hover:bg-green-500 p-1.5 rounded inline-flex items-center"
                                title="Save"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="bg-gray-600 hover:bg-gray-500 p-1.5 rounded inline-flex items-center"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // View Mode
                        <>
                          <td className="py-2 px-2 text-xs">{index + 1}</td>
                          <td className="py-2 px-2 font-semibold text-sm">
                            {player.playerName}
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-dota-radiant font-bold text-sm">
                              {player.mmr}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-xs text-gray-400">
                            {player.preferredRoles.join(', ')}
                          </td>
                          <td className="py-2 px-2">
                            <button
                              onClick={() => togglePlayerStatus(player.id, player.status)}
                              className={`px-2 py-0.5 rounded text-xs cursor-pointer transition-colors ${
                                player.status === 'Present'
                                  ? 'bg-green-500 bg-opacity-20 text-green-300 hover:bg-opacity-30'
                                  : player.status === 'Absent'
                                  ? 'bg-red-500 bg-opacity-20 text-red-300 hover:bg-opacity-30'
                                  : 'bg-yellow-500 bg-opacity-20 text-yellow-300 hover:bg-opacity-30'
                              }`}
                              title="Click to cycle status"
                            >
                              {player.status}
                            </button>
                          </td>
                          <td className="py-2 px-2 text-xs text-gray-400">
                            {new Date(player.registeredAt).toLocaleString()}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEdit(player)}
                                className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded inline-flex items-center"
                                title="Edit player"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deletePlayer(player.id, player.playerName)}
                                className="bg-red-600 hover:bg-red-500 p-1.5 rounded inline-flex items-center"
                                title="Delete player"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  )
}

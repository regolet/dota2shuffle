'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DOTA_ROLES } from '@/lib/validators'
import { UserPlus, Save, Trash2 } from 'lucide-react'
import { useNotification } from '@/lib/useNotification'
import { BUTTON_STYLES, buttonClass } from '@/lib/button-styles'

interface Player {
  id: string
  playerName: string
  mmr: number
  preferredRoles: string[]
  status: string
  registeredAt: Date
}

interface Team {
  teamNumber: number
  players: Array<{
    id: string
    playerName: string
    mmr: number
    preferredRoles: string[]
  }>
  averageMmr: number
  totalMmr: number
}

interface Balance {
  averageMmr: number
  variance: number
  minTeamMmr: number
  maxTeamMmr: number
  mmrDifference: number
}

interface ShuffleHistory {
  id: string
  playerCount: number
  teamCount: number
  balanceScore: number
  shuffledAt: Date
}

export default function ShufflePage({ params }: { params: Promise<{ linkCode: string }> }) {
  const { linkCode } = use(params)
  const notification = useNotification()
  const [players, setPlayers] = useState<Player[]>([])
  const [linkInfo, setLinkInfo] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [reservePlayers, setReservePlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shuffled, setShuffled] = useState(false)
  const [shuffleHistories, setShuffleHistories] = useState<ShuffleHistory[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('')
  const [teamsSaved, setTeamsSaved] = useState(false)
  const [savingTeams, setSavingTeams] = useState(false)

  // Add player form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerMmr, setNewPlayerMmr] = useState<number | ''>('')
  const [newPlayerRoles, setNewPlayerRoles] = useState<string[]>([])

  useEffect(() => {
    fetchPlayers()
    fetchShuffleHistory()
  }, [linkCode])

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`/api/admin/players/link/${linkCode}`)
      const data = await res.json()

      if (res.ok) {
        setPlayers(data.players)
        setLinkInfo(data.link)
      }
    } catch (err) {
      console.error('Failed to fetch players:', err)
    }
  }

  const fetchShuffleHistory = async () => {
    try {
      const res = await fetch(`/api/shuffle/${linkCode}/history`)
      const data = await res.json()

      if (res.ok) {
        setShuffleHistories(data.histories || [])
      }
    } catch (err) {
      console.error('Failed to fetch shuffle history:', err)
    }
  }

  const loadSavedShuffle = async (historyId: string) => {
    if (!historyId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/shuffle/${linkCode}/history?historyId=${historyId}`)
      const data = await res.json()

      if (res.ok) {
        setTeams(data.teams)
        setBalance({
          averageMmr: data.teams.reduce((sum: number, t: Team) => sum + t.averageMmr, 0) / data.teams.length,
          variance: data.history.balanceScore / 1000,
          minTeamMmr: Math.min(...data.teams.map((t: Team) => t.totalMmr)),
          maxTeamMmr: Math.max(...data.teams.map((t: Team) => t.totalMmr)),
          mmrDifference: Math.max(...data.teams.map((t: Team) => t.totalMmr)) - Math.min(...data.teams.map((t: Team) => t.totalMmr)),
        })
        setReservePlayers(data.reservePlayers || [])
        setShuffled(true)
        setTeamsSaved(true) // Loaded teams are already saved
        notification.success('Loaded saved shuffle successfully!')
      } else {
        notification.error(data.error || 'Failed to load saved shuffle')
      }
    } catch (err) {
      notification.error('Error loading saved shuffle')
    } finally {
      setLoading(false)
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

  const toggleRole = (role: string) => {
    if (newPlayerRoles.includes(role)) {
      setNewPlayerRoles(newPlayerRoles.filter((r) => r !== role))
    } else {
      if (newPlayerRoles.length >= 2) {
        notification.error('Maximum 2 roles allowed')
        return
      }
      setNewPlayerRoles([...newPlayerRoles, role])
    }
  }

  const handleShuffle = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/shuffle/${linkCode}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Shuffle failed')
        setLoading(false)
        return
      }

      setTeams(data.teams)
      setBalance(data.balance)
      setReservePlayers(data.reservePlayers || [])
      setShuffled(true)
      setTeamsSaved(false) // New shuffle is not saved yet
      setSelectedHistoryId('') // Clear selection
      notification.success('Teams shuffled! Click "Save Teams" to save this shuffle.')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTeams = async () => {
    setSavingTeams(true)
    try {
      const res = await fetch(`/api/shuffle/${linkCode}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams,
          balance,
          totalPlayers: presentPlayers.length,
          reservePlayers,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setTeamsSaved(true)
        setSelectedHistoryId(data.historyId) // Set the newly saved history as selected
        fetchShuffleHistory() // Refresh history list
        notification.success('Teams saved successfully!')
      } else {
        notification.error(data.error || 'Failed to save teams')
      }
    } catch (err) {
      notification.error('Error saving teams')
    } finally {
      setSavingTeams(false)
    }
  }

  const handleDeleteShuffle = async (historyId: string) => {
    if (!confirm('Are you sure you want to delete this shuffle? This cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/shuffle/${linkCode}/history?historyId=${historyId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        // If the deleted shuffle is currently selected, clear it
        if (selectedHistoryId === historyId) {
          setTeams([])
          setBalance(null)
          setReservePlayers([])
          setShuffled(false)
          setTeamsSaved(false)
          setSelectedHistoryId('')
        }
        fetchShuffleHistory() // Refresh history list
        notification.success('Shuffle deleted successfully!')
      } else {
        notification.error(data.error || 'Failed to delete shuffle')
      }
    } catch (err) {
      notification.error('Error deleting shuffle')
    }
  }

  const getBalanceColor = (variance: number) => {
    if (variance < 1000) return 'text-green-400'
    if (variance < 5000) return 'text-yellow-400'
    return 'text-red-400'
  }

  const presentPlayers = players.filter((p) => p.status === 'Present')
  const absentPlayers = players.filter((p) => p.status === 'Absent')
  const reservePlayersFromList = players.filter((p) => p.status === 'Reserve')

  const avgMmr =
    presentPlayers.length > 0
      ? Math.round(
          presentPlayers.reduce((sum, p) => sum + p.mmr, 0) / presentPlayers.length
        )
      : 0

  return (
    <>
      <notification.NotificationContainer />
      <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Team Shuffle</h1>
            {linkInfo && (
              <p className="text-gray-400 text-lg">{linkInfo.title}</p>
            )}
          </div>
          <div className="flex gap-4">
            {shuffled && teamsSaved && (
              <Link
                href={`/admin/bracket/${linkCode}${selectedHistoryId ? `?shuffleHistoryId=${selectedHistoryId}` : ''}`}
                className={BUTTON_STYLES.warning}
              >
                🏆 Create Tournament Bracket
              </Link>
            )}
            <Link
              href={`/admin/players/${linkCode}`}
              className={BUTTON_STYLES.purple}
            >
              Manage Players
            </Link>
            <Link
              href="/admin/dashboard"
              className={BUTTON_STYLES.secondary}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Add Player Button and Shuffle Button */}
        {!shuffled && (
          <div className="bg-dota-card p-4 rounded-lg border border-gray-700 mb-8">
            <h2 className="text-lg font-semibold mb-3 text-gray-200">Actions</h2>
            <div className="flex gap-3 flex-wrap items-center">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={buttonClass(BUTTON_STYLES.purple, 'text-sm px-4 py-2')}
              >
                <UserPlus className="w-4 h-4 inline-block mr-2" />
                {showAddForm ? 'Cancel' : 'Add Player Manually'}
              </button>
              <button
                onClick={handleShuffle}
                disabled={loading}
                className={buttonClass(BUTTON_STYLES.primaryLarge, 'text-sm px-5 py-2')}
              >
                {loading ? 'Shuffling...' : 'Shuffle Teams'}
              </button>

              {/* Load Saved Shuffle Dropdown */}
              {shuffleHistories.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">or</span>
                  <select
                    value={selectedHistoryId}
                    onChange={(e) => {
                      setSelectedHistoryId(e.target.value)
                      if (e.target.value) {
                        loadSavedShuffle(e.target.value)
                      }
                    }}
                    className="bg-gray-700 border border-gray-600 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-dota-radiant"
                  >
                    <option value="">Load Saved Shuffle...</option>
                    {shuffleHistories.map((history) => (
                      <option key={history.id} value={history.id}>
                        {new Date(history.shuffledAt).toLocaleString()} - {history.teamCount} teams ({history.playerCount} players)
                      </option>
                    ))}
                  </select>
                  {selectedHistoryId && (
                    <button
                      onClick={() => handleDeleteShuffle(selectedHistoryId)}
                      className={buttonClass(BUTTON_STYLES.iconLarge, 'bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-1 px-2 py-2')}
                      title="Delete selected shuffle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}

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
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">MMR *</label>
                    <input
                      type="number"
                      value={newPlayerMmr}
                      onChange={(e) => setNewPlayerMmr(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
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
                        onClick={() => toggleRole(role)}
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
                  className={BUTTON_STYLES.success}
                >
                  Add Player
                </button>
              </form>
            )}
          </div>
        )}

        {/* Players List */}
        {players.length > 0 && !shuffled && (
          <div className="bg-dota-card p-6 rounded-lg border border-gray-700 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Registered Players</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">Player Name</th>
                    <th className="text-left py-3 px-4">MMR</th>
                    <th className="text-left py-3 px-4">Preferred Roles</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr
                      key={player.id}
                      className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
                    >
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4 font-semibold">
                        {player.playerName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-dota-radiant font-bold">
                          {player.mmr}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {player.preferredRoles.join(', ')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded text-sm ${
                            player.status === 'Present'
                              ? 'bg-green-500 bg-opacity-20 text-green-300'
                              : player.status === 'Absent'
                              ? 'bg-red-500 bg-opacity-20 text-red-300'
                              : 'bg-yellow-500 bg-opacity-20 text-yellow-300'
                          }`}
                        >
                          {player.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Re-shuffle Button for after teams are generated */}
        {shuffled && (
          <div className="bg-dota-card p-6 rounded-lg border border-gray-700 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Shuffle Controls</h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {!teamsSaved && (
                  <button
                    onClick={handleSaveTeams}
                    disabled={savingTeams}
                    className={buttonClass(BUTTON_STYLES.successLarge, 'text-sm px-5 py-2')}
                  >
                    <Save className="w-4 h-4 inline-block mr-2" />
                    {savingTeams ? 'Saving...' : 'Save Teams'}
                  </button>
                )}
                <button
                  onClick={handleShuffle}
                  disabled={loading}
                  className={buttonClass(BUTTON_STYLES.primaryLarge, 'text-sm px-5 py-2')}
                >
                  {loading ? 'Shuffling...' : 'Re-shuffle Teams'}
                </button>

                {/* Load Saved Shuffle Dropdown */}
                {shuffleHistories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">or</span>
                    <select
                      value={selectedHistoryId}
                      onChange={(e) => {
                        setSelectedHistoryId(e.target.value)
                        if (e.target.value) {
                          loadSavedShuffle(e.target.value)
                        }
                      }}
                      className="bg-gray-700 border border-gray-600 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-dota-radiant"
                    >
                      <option value="">Load Different Shuffle...</option>
                      {shuffleHistories.map((history) => (
                        <option key={history.id} value={history.id}>
                          {new Date(history.shuffledAt).toLocaleString()} - {history.teamCount} teams ({history.playerCount} players)
                        </option>
                      ))}
                    </select>
                    {selectedHistoryId && (
                      <button
                        onClick={() => handleDeleteShuffle(selectedHistoryId)}
                        className={buttonClass(BUTTON_STYLES.iconLarge, 'bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-1 px-2 py-2')}
                        title="Delete selected shuffle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Teams */}
        {teams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {teams.map((team) => (
              <div
                key={team.teamNumber}
                className="bg-dota-card p-4 rounded-lg border border-gray-700"
              >
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
                  <h3 className="text-xl font-bold">Team {team.teamNumber}</h3>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Avg: </span>
                    <span className="text-lg font-bold text-dota-radiant">
                      {team.averageMmr}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  {team.players.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate">{player.playerName}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {player.preferredRoles.join(', ')}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-dota-radiant ml-2 flex-shrink-0">
                        {player.mmr}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Total MMR</span>
                    <span className="font-semibold">{team.totalMmr}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reserve Players */}
        {reservePlayers.length > 0 && (
          <div className="bg-dota-card p-4 rounded-lg border border-yellow-600">
            <h2 className="text-xl font-semibold mb-2">Reserve Players</h2>
            <p className="text-gray-400 text-sm mb-3">
              These players will be on standby in case of no-shows
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {reservePlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-gray-800 p-3 rounded border border-gray-700"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-sm">{player.playerName}</p>
                    <p className="text-dota-radiant font-bold text-sm">{player.mmr}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!shuffled && players.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl">No players registered yet</p>
            <p className="text-sm mt-2">Players need to register before shuffling teams</p>
          </div>
        )}
        </div>
      </div>
    </>
  )
}

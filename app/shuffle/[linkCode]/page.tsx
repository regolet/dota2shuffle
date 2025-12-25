'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DOTA_ROLES } from '@/lib/validators'
import { UserPlus, Save, Trash2, ArrowLeft, Home, Users, Settings, Trophy, Crown, X } from 'lucide-react'
import { useNotification } from '@/hooks/useNotification'
import { BUTTON_STYLES, buttonClass } from '@/lib/styles/button'
import { RegistrationLink } from '@/types'
import { MobileNav } from '@/components/MobileNav'

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
  teamName?: string
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
  const [linkInfo, setLinkInfo] = useState<RegistrationLink | null>(null)
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

  // Captains Draft state
  const [showCaptainsModal, setShowCaptainsModal] = useState(false)
  const [selectedCaptains, setSelectedCaptains] = useState<string[]>([])
  const [captainIds, setCaptainIds] = useState<string[]>([])

  // Drag-drop state
  const [draggedPlayer, setDraggedPlayer] = useState<{ playerId: string; fromTeam: number | 'reserve' } | null>(null)
  const [editingTeamName, setEditingTeamName] = useState<number | null>(null)

  // Delete confirm state
  const [showDeleteModal, setShowDeleteModal] = useState(false)

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
        setCaptainIds(data.history.captainIds || []) // Restore captain data
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
      setCaptainIds([]) // Clear captains on regular shuffle
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

  // Captains Draft shuffle
  const handleCaptainsShuffle = async () => {
    if (selectedCaptains.length < 2) {
      notification.error('Select at least 2 captains')
      return
    }

    setError('')
    setLoading(true)
    setShowCaptainsModal(false)

    try {
      const res = await fetch(`/api/shuffle/${linkCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captainIds: selectedCaptains }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Captains shuffle failed')
        setLoading(false)
        return
      }

      setTeams(data.teams)
      setBalance(data.balance)
      setReservePlayers(data.reservePlayers || [])
      setCaptainIds(data.captainIds || selectedCaptains)
      setShuffled(true)
      setTeamsSaved(false)
      setSelectedHistoryId('')
      notification.success(`Captains Draft complete! ${selectedCaptains.length} teams created.`)
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCaptain = (playerId: string) => {
    const maxCaptains = Math.floor(players.filter(p => p.status === 'Present').length / 5)
    if (selectedCaptains.includes(playerId)) {
      setSelectedCaptains(selectedCaptains.filter(id => id !== playerId))
    } else {
      if (selectedCaptains.length >= maxCaptains) {
        notification.error(`Maximum ${maxCaptains} captains allowed`)
        return
      }
      setSelectedCaptains([...selectedCaptains, playerId])
    }
  }

  // Move player between teams or to/from reserve
  const movePlayer = (playerId: string, fromTeam: number | 'reserve', toTeam: number | 'reserve') => {
    if (fromTeam === toTeam) return

    // Find the player first
    let player: any = null

    if (fromTeam === 'reserve') {
      player = reservePlayers.find((p: any) => p.id === playerId)
      if (!player) return

      // Remove from reserve, add to team - atomic update
      const newReserve = reservePlayers.filter((p: any) => p.id !== playerId)
      setReservePlayers(newReserve)

      if (toTeam !== 'reserve') {
        setTeams(prevTeams => prevTeams.map(t => {
          if (t.teamNumber !== toTeam) return t
          const newPlayers = [...t.players, player]
          const newTotalMmr = newPlayers.reduce((sum, p) => sum + p.mmr, 0)
          return {
            ...t,
            players: newPlayers,
            totalMmr: newTotalMmr,
            averageMmr: Math.round(newTotalMmr / newPlayers.length),
          }
        }))
      }
    } else {
      // Moving from a team
      const team = teams.find(t => t.teamNumber === fromTeam)
      if (!team) return
      player = team.players.find(p => p.id === playerId)
      if (!player) return

      if (toTeam === 'reserve') {
        // Move to reserve - atomic update
        setTeams(prevTeams => prevTeams.map(t => {
          if (t.teamNumber !== fromTeam) return t
          const newPlayers = t.players.filter(p => p.id !== playerId)
          const newTotalMmr = newPlayers.reduce((sum, p) => sum + p.mmr, 0)
          return {
            ...t,
            players: newPlayers,
            totalMmr: newTotalMmr,
            averageMmr: newPlayers.length > 0 ? Math.round(newTotalMmr / newPlayers.length) : 0,
          }
        }))
        setReservePlayers(prev => [...prev, player])
      } else {
        // Move between teams - single atomic update
        setTeams(prevTeams => prevTeams.map(t => {
          if (t.teamNumber === fromTeam) {
            // Remove from source team
            const newPlayers = t.players.filter(p => p.id !== playerId)
            const newTotalMmr = newPlayers.reduce((sum, p) => sum + p.mmr, 0)
            return {
              ...t,
              players: newPlayers,
              totalMmr: newTotalMmr,
              averageMmr: newPlayers.length > 0 ? Math.round(newTotalMmr / newPlayers.length) : 0,
            }
          }
          if (t.teamNumber === toTeam) {
            // Add to destination team
            const newPlayers = [...t.players, player]
            const newTotalMmr = newPlayers.reduce((sum, p) => sum + p.mmr, 0)
            return {
              ...t,
              players: newPlayers,
              totalMmr: newTotalMmr,
              averageMmr: Math.round(newTotalMmr / newPlayers.length),
            }
          }
          return t
        }))
      }
    }

    setTeamsSaved(false) // Mark as unsaved
    notification.success(`Moved ${player.playerName}`)
  }

  // Update team name
  const updateTeamName = (teamNumber: number, newName: string) => {
    setTeams(teams.map(t =>
      t.teamNumber === teamNumber ? { ...t, teamName: newName } : t
    ))
    setTeamsSaved(false)
    setEditingTeamName(null)
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
          captainIds,
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

  const handleDeleteShuffle = async () => {
    const historyId = selectedHistoryId
    if (!historyId) return

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
        setShowDeleteModal(false)
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

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { href: '/admin/masterlist', label: 'Masterlist', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ]

  return (
    <>
      <notification.NotificationContainer />

      {/* Captains Selection Modal */}
      {showCaptainsModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Select Captains
                </h2>
                <p className="text-sm text-gray-400">Each captain leads a team</p>
              </div>
              <button onClick={() => setShowCaptainsModal(false)} className="text-gray-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
              {presentPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => toggleCaptain(player.id)}
                  className={`w-full flex justify-between items-center p-3 rounded-lg transition-colors ${selectedCaptains.includes(player.id)
                    ? 'bg-yellow-600/30 border-2 border-yellow-500'
                    : 'bg-gray-800 border-2 border-transparent hover:border-gray-600'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedCaptains.includes(player.id) && <Crown className="w-4 h-4 text-yellow-500" />}
                    <span className="font-semibold">{player.playerName}</span>
                  </div>
                  <span className="text-dota-radiant font-bold">{player.mmr}</span>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-400">
                {selectedCaptains.length} / {Math.floor(presentPlayers.length / 5)} captains
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCaptainsModal(false)}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCaptainsShuffle}
                  disabled={selectedCaptains.length < 2 || loading}
                  className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Shuffle with {selectedCaptains.length} Captains
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-4 lg:p-6 safe-top safe-bottom">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <MobileNav items={navItems} />
              <div>
                <h1 className="text-xl lg:text-3xl font-bold">Shuffle</h1>
                {linkInfo && <p className="text-gray-400 text-sm">{linkInfo.title}</p>}
              </div>
            </div>
            <div className="desktop-only gap-3">
              {shuffled && teamsSaved && (
                <Link
                  href={`/admin/bracket/${linkCode}${selectedHistoryId ? `?shuffleHistoryId=${selectedHistoryId}` : ''}`}
                  className={BUTTON_STYLES.warning + ' inline-flex items-center gap-2'}
                >
                  <Trophy className="w-4 h-4" /> Bracket
                </Link>
              )}
              <Link href={`/admin/players/${linkCode}`} className={BUTTON_STYLES.purple + ' inline-flex items-center gap-2'}>
                <Users className="w-4 h-4" /> Players
              </Link>
              <Link href="/admin/dashboard" className={BUTTON_STYLES.secondary + ' inline-flex items-center gap-2'}>
                <ArrowLeft className="w-4 h-4" /> Back
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
                <button
                  onClick={() => {
                    setSelectedCaptains([])
                    setShowCaptainsModal(true)
                  }}
                  disabled={loading || presentPlayers.length < 10}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-5 py-2 rounded font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  Captains Draft
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
                        onClick={() => setShowDeleteModal(true)}
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
                          className={`px-3 py-2 rounded text-sm transition-colors ${newPlayerRoles.includes(role)
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
                            className={`px-3 py-1 rounded text-sm ${player.status === 'Present'
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
                    {loading ? 'Shuffling...' : 'Re-shuffle (Random)'}
                  </button>

                  {/* Re-shuffle with same captains */}
                  {captainIds.length >= 2 && (
                    <button
                      onClick={async () => {
                        setSelectedCaptains(captainIds)
                        setError('')
                        setLoading(true)
                        try {
                          const res = await fetch(`/api/shuffle/${linkCode}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ captainIds }),
                          })
                          const data = await res.json()
                          if (!res.ok) {
                            setError(data.error || 'Captains shuffle failed')
                            setLoading(false)
                            return
                          }
                          setTeams(data.teams)
                          setBalance(data.balance)
                          setReservePlayers(data.reservePlayers || [])
                          setCaptainIds(data.captainIds || captainIds)
                          setTeamsSaved(false)
                          notification.success('Reshuffled with same captains!')
                        } catch (err) {
                          setError('Network error. Please try again.')
                        } finally {
                          setLoading(false)
                        }
                      }}
                      disabled={loading}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white px-5 py-2 rounded font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <Crown className="w-4 h-4" />
                      {loading ? 'Shuffling...' : 'Re-shuffle (Keep Captains)'}
                    </button>
                  )}

                  {/* Edit Captains button */}
                  <button
                    onClick={() => {
                      setSelectedCaptains(captainIds)
                      setShowCaptainsModal(true)
                    }}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded font-semibold transition-colors inline-flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    {captainIds.length > 0 ? 'Edit Captains' : 'Select Captains'}
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
                          onClick={() => setShowDeleteModal(true)}
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
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedPlayer) {
                      movePlayer(draggedPlayer.playerId, draggedPlayer.fromTeam, team.teamNumber)
                      setDraggedPlayer(null)
                    }
                  }}
                >
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
                    {editingTeamName === team.teamNumber ? (
                      <input
                        type="text"
                        defaultValue={team.teamName || `Team ${team.teamNumber}`}
                        className="bg-gray-800 text-white px-2 py-1 rounded text-xl font-bold w-32"
                        autoFocus
                        onBlur={(e) => updateTeamName(team.teamNumber, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateTeamName(team.teamNumber, e.currentTarget.value)
                          if (e.key === 'Escape') setEditingTeamName(null)
                        }}
                      />
                    ) : (
                      <h3
                        className="text-xl font-bold cursor-pointer hover:text-blue-400"
                        onClick={() => setEditingTeamName(team.teamNumber)}
                        title="Click to rename"
                      >
                        {team.teamName || `Team ${team.teamNumber}`}
                      </h3>
                    )}
                    <div className="text-right">
                      <span className="text-xs text-gray-400">Avg: </span>
                      <span className="text-lg font-bold text-dota-radiant">
                        {team.averageMmr}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {team.players.map((player) => (
                      <div
                        key={player.id}
                        draggable
                        onDragStart={() => setDraggedPlayer({ playerId: player.id, fromTeam: team.teamNumber })}
                        onDragEnd={() => setDraggedPlayer(null)}
                        className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0 cursor-grab active:cursor-grabbing hover:bg-gray-800/50 rounded px-1"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {captainIds.includes(player.id) && (
                            <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          )}
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
          {(reservePlayers.length > 0 || shuffled) && (
            <div
              className="bg-dota-card p-4 rounded-lg border border-yellow-600"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (draggedPlayer && draggedPlayer.fromTeam !== 'reserve') {
                  movePlayer(draggedPlayer.playerId, draggedPlayer.fromTeam, 'reserve')
                  setDraggedPlayer(null)
                }
              }}
            >
              <h2 className="text-xl font-semibold mb-2">Reserve Players</h2>
              <p className="text-gray-400 text-sm mb-3">
                Drag players here to bench them, or drag from here to add to a team
              </p>
              {reservePlayers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {reservePlayers.map((player: any) => (
                    <div
                      key={player.id}
                      draggable
                      onDragStart={() => setDraggedPlayer({ playerId: player.id, fromTeam: 'reserve' })}
                      onDragEnd={() => setDraggedPlayer(null)}
                      className="bg-gray-800 p-3 rounded border border-gray-700 cursor-grab active:cursor-grabbing hover:bg-gray-700"
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-sm">{player.playerName}</p>
                        <p className="text-dota-radiant font-bold text-sm">{player.mmr}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Drop players here to bench them</p>
              )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-dota-card border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-white">Delete Shuffle?</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this saved shuffle? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteShuffle}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

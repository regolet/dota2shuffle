'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useNotification } from '@/lib/useNotification'
import { BUTTON_STYLES, buttonClass } from '@/lib/button-styles'

interface Team {
  id: string
  teamNumber: number
  teamName: string | null
  averageMmr: number
  playerIds: string[]
}

interface Player {
  id: string
  playerName: string
  mmr: number
}

interface Match {
  id: string
  roundNumber: number
  matchNumber: number
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  status: string
}

interface Round {
  roundNumber: number
  roundName: string
  matches: Match[]
}

interface Bracket {
  id: string
  name: string
  bracketType: string
  status: string
  rounds: Round[]
  teams: Team[]
}

export default function BracketPage({ params }: { params: Promise<{ linkCode: string }> }) {
  const { linkCode } = use(params)
  const notification = useNotification()
  const [bracket, setBracket] = useState<Bracket | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [shuffleHistoryId, setShuffleHistoryId] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    // Read shuffleHistoryId from URL query params
    const urlParams = new URLSearchParams(window.location.search)
    const historyId = urlParams.get('shuffleHistoryId')
    if (historyId) {
      setShuffleHistoryId(historyId)
    }

    fetchBracket()
    fetchPlayers()
  }, [linkCode])

  const fetchBracket = async () => {
    try {
      const res = await fetch(`/api/admin/bracket/${linkCode}`)
      const data = await res.json()

      if (res.ok && data.bracket) {
        setBracket(data.bracket)
      }
    } catch (err) {
      console.error('Failed to fetch bracket:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`/api/admin/players/link/${linkCode}`)
      const data = await res.json()

      if (res.ok && data.players) {
        setPlayers(data.players)
      }
    } catch (err) {
      console.error('Failed to fetch players:', err)
    }
  }

  const getPlayerById = (playerId: string) => {
    return players.find((p) => p.id === playerId)
  }

  const createBracket = async () => {
    notification.confirm(
      'Create tournament bracket from shuffled teams?',
      async () => {
        setCreating(true)
        try {
          const res = await fetch(`/api/admin/bracket/${linkCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Tournament Bracket',
              bracketType: 'single_elimination',
              shuffleHistoryId: shuffleHistoryId || undefined,
            }),
          })

          if (res.ok) {
            fetchBracket()
            notification.success('Bracket created successfully!')
          } else {
            const data = await res.json()
            notification.error(data.error || 'Failed to create bracket')
          }
        } catch (err) {
          notification.error('Error creating bracket')
        } finally {
          setCreating(false)
        }
      }
    )
  }

  const setWinner = async (matchId: string, winnerId: string) => {
    try {
      const res = await fetch(`/api/admin/bracket/match/${matchId}/winner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId }),
      })

      if (res.ok) {
        fetchBracket()
        notification.success('Winner set successfully!')
      } else {
        const data = await res.json()
        notification.error(data.error || 'Failed to set winner')
      }
    } catch (err) {
      notification.error('Error setting winner')
    }
  }

  const resetMatch = async (matchId: string) => {
    notification.confirm(
      'Reset this match? Winner will be removed.',
      async () => {
        try {
          const res = await fetch(`/api/admin/bracket/match/${matchId}/reset`, {
            method: 'PATCH',
          })

          if (res.ok) {
            fetchBracket()
            notification.success('Match reset successfully!')
          } else {
            const data = await res.json()
            notification.error(data.error || 'Failed to reset match')
          }
        } catch (err) {
          notification.error('Error resetting match')
        }
      }
    )
  }

  const recreateBracket = async () => {
    notification.confirm(
      'Recreate tournament bracket from selected shuffle? This will replace the current bracket.',
      async () => {
        setCreating(true)
        try {
          const res = await fetch(`/api/admin/bracket/${linkCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Tournament Bracket',
              bracketType: 'single_elimination',
              shuffleHistoryId: shuffleHistoryId || undefined,
              recreate: true,
            }),
          })

          if (res.ok) {
            fetchBracket()
            notification.success('Bracket recreated successfully!')
          } else {
            const data = await res.json()
            notification.error(data.error || 'Failed to recreate bracket')
          }
        } catch (err) {
          notification.error('Error recreating bracket')
        } finally {
          setCreating(false)
        }
      }
    )
  }

  const deleteBracket = async () => {
    notification.confirm(
      'Delete this bracket? This cannot be undone.',
      async () => {
        try {
          const res = await fetch(`/api/admin/bracket/${linkCode}`, {
            method: 'DELETE',
          })

          if (res.ok) {
            setBracket(null)
            notification.success('Bracket deleted successfully!')
          } else {
            const data = await res.json()
            notification.error(data.error || 'Failed to delete bracket')
          }
        } catch (err) {
          notification.error('Error deleting bracket')
        }
      }
    )
  }

  const getTeamById = (teamId: string | null) => {
    if (!teamId || !bracket) return null
    return bracket.teams.find((t) => t.id === teamId)
  }

  const champion = bracket?.rounds.length && bracket.rounds[bracket.rounds.length - 1].matches?.length
    ? bracket.rounds[bracket.rounds.length - 1].matches[0].winnerId
    : null

  const championTeam = getTeamById(champion)

  return (
    <>
      <notification.NotificationContainer />
      <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Tournament Bracket</h1>
            {bracket && (
              <p className="text-gray-400 text-lg">{bracket.name}</p>
            )}
          </div>
          <div className="space-x-4">
            <Link
              href={`/shuffle/${linkCode}`}
              className={BUTTON_STYLES.secondary}
            >
              Back to Shuffle
            </Link>
            <Link
              href="/admin/dashboard"
              className={BUTTON_STYLES.secondary}
            >
              Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">Loading...</p>
          </div>
        ) : !bracket ? (
          <div className="text-center py-12">
            <div className="bg-dota-card p-8 rounded-lg border border-gray-700 max-w-md mx-auto">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold mb-4">No Bracket Created</h2>
              <p className="text-gray-400 mb-6">
                Create a tournament bracket from your shuffled teams
              </p>
              <button
                onClick={createBracket}
                disabled={creating}
                className={BUTTON_STYLES.primaryLarge}
              >
                {creating ? 'Creating...' : 'Create Tournament Bracket'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Champion Banner */}
            {championTeam && (
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg mb-8">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🏆</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">CHAMPION</h2>
                  <p className="text-2xl font-bold text-gray-900">
                    Team {championTeam.teamNumber}
                    {championTeam.teamName && ` - ${championTeam.teamName}`}
                  </p>
                  <p className="text-lg text-gray-800 mt-1">
                    Average MMR: {championTeam.averageMmr}
                  </p>
                </div>

                {/* Team Members */}
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Team Members</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {championTeam.playerIds.map((playerId) => {
                      const player = getPlayerById(playerId)
                      return player ? (
                        <div key={player.id} className="bg-white bg-opacity-30 rounded-lg p-3 text-center">
                          <p className="font-bold text-gray-900">{player.playerName}</p>
                          <p className="text-sm text-gray-800">MMR: {player.mmr}</p>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bracket Actions */}
            <div className="bg-dota-card p-6 rounded-lg border border-gray-700 mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Bracket Status</h3>
                  <p className="text-gray-400">
                    Type: <span className="text-white capitalize">{bracket.bracketType.replace('_', ' ')}</span>
                    {' • '}
                    Status: <span className="text-white capitalize">{bracket.status}</span>
                    {' • '}
                    Teams: <span className="text-white">{bracket.teams.length}</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={recreateBracket}
                    disabled={creating}
                    className={BUTTON_STYLES.warning}
                  >
                    {creating ? 'Recreating...' : 'Recreate Bracket'}
                  </button>
                  <button
                    onClick={deleteBracket}
                    className={BUTTON_STYLES.danger}
                  >
                    Delete Bracket
                  </button>
                </div>
              </div>
            </div>

            {/* Bracket Visualization */}
            <div className="bg-dota-card p-6 rounded-lg border border-gray-700">
              <div className="overflow-x-auto">
                <div className="inline-flex gap-8 min-w-full">
                  {bracket.rounds.map((round) => (
                    <div key={round.roundNumber} className="flex-shrink-0" style={{ width: '300px' }}>
                      <h3 className="text-xl font-bold mb-4 text-center sticky top-0 bg-dota-card py-2">
                        {round.roundName}
                      </h3>
                      <div className="space-y-4">
                        {round.matches.map((match) => {
                          const team1 = getTeamById(match.team1Id)
                          const team2 = getTeamById(match.team2Id)
                          const hasWinner = match.winnerId !== null

                          return (
                            <div
                              key={match.id}
                              className={`border-2 rounded-lg p-4 ${
                                hasWinner
                                  ? 'border-green-500 bg-green-500 bg-opacity-10'
                                  : 'border-gray-700'
                              }`}
                            >
                              <div className="text-sm text-gray-400 mb-2">
                                Match {match.matchNumber}
                              </div>

                              {/* Team 1 */}
                              <div
                                className={`p-3 rounded mb-2 cursor-pointer transition-colors ${
                                  match.winnerId === team1?.id
                                    ? 'bg-green-600 font-bold'
                                    : team1
                                    ? 'bg-gray-700 hover:bg-gray-600'
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => {
                                  if (team1 && team2 && !hasWinner) {
                                    setWinner(match.id, team1.id)
                                  }
                                }}
                              >
                                {team1 ? (
                                  <div className="font-semibold">
                                    Team {team1.teamNumber}
                                    {team1.teamName && ` - ${team1.teamName}`}
                                  </div>
                                ) : (
                                  <div className="text-gray-500 italic">TBD</div>
                                )}
                              </div>

                              {/* VS */}
                              <div className="text-center text-xs text-gray-500 my-1">VS</div>

                              {/* Team 2 */}
                              <div
                                className={`p-3 rounded mb-2 cursor-pointer transition-colors ${
                                  match.winnerId === team2?.id
                                    ? 'bg-green-600 font-bold'
                                    : team2
                                    ? 'bg-gray-700 hover:bg-gray-600'
                                    : 'bg-gray-800'
                                }`}
                                onClick={() => {
                                  if (team1 && team2 && !hasWinner) {
                                    setWinner(match.id, team2.id)
                                  }
                                }}
                              >
                                {team2 ? (
                                  <div className="font-semibold">
                                    Team {team2.teamNumber}
                                    {team2.teamName && ` - ${team2.teamName}`}
                                  </div>
                                ) : (
                                  <div className="text-gray-500 italic">TBD</div>
                                )}
                              </div>

                              {/* Reset Button */}
                              {hasWinner && (
                                <button
                                  onClick={() => resetMatch(match.id)}
                                  className={buttonClass(BUTTON_STYLES.compact, 'bg-gray-600 hover:bg-gray-500 text-white w-full mt-2')}
                                >
                                  Reset Match
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-blue-500 bg-opacity-10 border border-blue-500 rounded">
                <p className="text-sm text-blue-200">
                  <strong>How to use:</strong> Click on a team to set them as the winner.
                  Winners automatically advance to the next round.
                  Click "Reset Match" to undo.
                </p>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </>
  )
}

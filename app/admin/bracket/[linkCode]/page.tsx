'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useNotification } from '@/hooks/useNotification'
import { BUTTON_STYLES, buttonClass } from '@/lib/styles/button'

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

const BracketNode = ({
  roundIndex,
  matchIndex,
  bracket,
  handleMatchClick,
  getTeamById
}: {
  roundIndex: number,
  matchIndex: number,
  bracket: Bracket,
  handleMatchClick: (m: Match, t: string | null) => void,
  getTeamById: (id: string | null) => any
}) => {
  if (roundIndex < 0 || !bracket.rounds[roundIndex]) return null

  const match = bracket.rounds[roundIndex].matches[matchIndex]
  if (!match) return null

  const team1 = getTeamById(match.team1Id)
  const team2 = getTeamById(match.team2Id)
  const hasChildren = roundIndex > 0

  // Determine path highlighting
  let topPathColor = 'border-gray-600'
  let bottomPathColor = 'border-gray-600'

  if (hasChildren) {
    const child1Match = bracket.rounds[roundIndex - 1].matches[matchIndex * 2]
    const child2Match = bracket.rounds[roundIndex - 1].matches[matchIndex * 2 + 1]

    if (child1Match?.winnerId && match.team1Id === child1Match.winnerId) {
      topPathColor = 'border-green-500'
    }
    if (child2Match?.winnerId && match.team2Id === child2Match.winnerId) {
      bottomPathColor = 'border-green-500'
    }
  }

  return (
    <div className="flex flex-row items-center">
      {/* Children (Left Side) */}
      {hasChildren && (
        <div className="flex flex-row items-center">
          <div className="flex flex-col justify-center gap-8">
            <BracketNode
              roundIndex={roundIndex - 1}
              matchIndex={matchIndex * 2}
              bracket={bracket}
              handleMatchClick={handleMatchClick}
              getTeamById={getTeamById}
            />
            <BracketNode
              roundIndex={roundIndex - 1}
              matchIndex={matchIndex * 2 + 1}
              bracket={bracket}
              handleMatchClick={handleMatchClick}
              getTeamById={getTeamById}
            />
          </div>
          {/* Connector Lines (Soft Arc Divs) */}
          <div className="flex flex-col h-full justify-center w-8 relative">
            {/* Top Connector: Curves from 25% down to Team 1 Slot */}
            <div
              className={`absolute left-0 w-full border-l-2 border-b-2 rounded-bl-3xl ${topPathColor}`}
              style={{ top: '25%', height: 'calc(25% - 1.25rem)' }}
            ></div>

            {/* Bottom Connector: Curves from 75% up to Team 2 Slot */}
            <div
              className={`absolute left-0 w-full border-l-2 border-t-2 rounded-tl-3xl ${bottomPathColor}`}
              style={{ bottom: '25%', height: 'calc(25% - 1.25rem)' }}
            ></div>
          </div>
        </div>
      )}

      {/* Match Card (Me) */}
      <div className={`
              w-48 bg-gray-800 border rounded shadow-lg relative z-10 flex flex-col
              ${match.winnerId ? 'border-green-600/50' : 'border-gray-700'}
           `}>
        <div className="absolute -top-6 left-0 w-full text-center text-xs text-gray-500 font-bold uppercase">
          {hasChildren ? '' : bracket.rounds[roundIndex].roundName}
        </div>
        {/* Team 1 */}
        <div
          onClick={() => handleMatchClick(match, team1?.id || null)}
          className={`
              px-3 py-2 border-b border-gray-700/50 cursor-pointer transition-colors flex justify-between items-center first:rounded-t
              ${match.winnerId === team1?.id ? 'bg-green-900/40 text-white' : 'hover:bg-gray-700 text-gray-300'}
              ${!team1 ? 'cursor-default opacity-50' : ''}
          `}
        >
          <span className={`text-sm font-semibold truncate ${match.winnerId === team1?.id ? 'text-green-300' : ''}`}>
            {team1 ? (team1.teamName || `Team ${team1.teamNumber}`) : 'TBD'}
          </span>
          {team1 && <span className="text-xs text-gray-500 ml-2">{team1.averageMmr}</span>}
        </div>

        {/* Team 2 */}
        <div
          onClick={() => handleMatchClick(match, team2?.id || null)}
          className={`
              px-3 py-2 cursor-pointer transition-colors flex justify-between items-center last:rounded-b
              ${match.winnerId === team2?.id ? 'bg-green-900/40 text-white' : 'hover:bg-gray-700 text-gray-300'}
              ${!team2 ? 'cursor-default opacity-50' : ''}
          `}
        >
          <span className={`text-sm font-semibold truncate ${match.winnerId === team2?.id ? 'text-green-300' : ''}`}>
            {team2 ? (team2.teamName || `Team ${team2.teamNumber}`) : 'TBD'}
          </span>
          {team2 && <span className="text-xs text-gray-500 ml-2">{team2.averageMmr}</span>}
        </div>
      </div>
    </div>
  )
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

  /* New Bracket Logic */

  const setWinner = async (matchId: string, winnerId: string) => {
    try {
      const res = await fetch(`/api/admin/bracket/match/${matchId}/winner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId }),
      })
      if (res.ok) {
        fetchBracket()
        notification.success('Winner set!')
      } else {
        const data = await res.json()
        notification.error(data.error || 'Failed to set winner')
      }
    } catch (err) {
      notification.error('Error setting winner')
    }
  }

  // Update resetMatch to accept skipConfirm
  const resetMatch = async (matchId: string, skipConfirm = false) => {
    const doReset = async () => {
      try {
        const res = await fetch(`/api/admin/bracket/match/${matchId}/reset`, {
          method: 'PATCH',
        })
        if (res.ok) {
          fetchBracket()
          notification.success('Match reset')
        } else {
          const data = await res.json()
          notification.error(data.error || 'Failed to reset match')
        }
      } catch (err) {
        notification.error('Error resetting match')
      }
    }

    if (skipConfirm) {
      doReset()
    } else {
      notification.confirm('Reset this match?', doReset)
    }
  }

  const recreateBracket = async () => {
    notification.confirm(
      'Recreate bracket? This will replace the current one.',
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
            notification.success('Bracket recreated')
          } else {
            notification.error('Failed to recreate bracket')
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
      'Delete this bracket?',
      async () => {
        try {
          const res = await fetch(`/api/admin/bracket/${linkCode}`, {
            method: 'DELETE',
          })
          if (res.ok) {
            setBracket(null)
            notification.success('Bracket deleted')
          } else {
            notification.error('Failed to delete bracket')
          }
        } catch (err) {
          notification.error('Error deleting bracket')
        }
      }
    )
  }

  const reshuffleBracket = async () => {
    notification.confirm(
      'Reshuffle all matchups? This will reset the tournament.',
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
              randomizeSeeds: true,
            }),
          })
          if (res.ok) {
            fetchBracket()
            notification.success('Matchups reshuffled')
          } else {
            notification.error('Failed to reshuffle')
          }
        } catch (err) {
          notification.error('Error reshuffling')
        } finally {
          setCreating(false)
        }
      }
    )
  }

  // Toggle winner logic
  const handleMatchClick = (match: Match, teamId: string | null) => {
    if (!teamId) return // TBD click

    // Check if opponent is TBD? 
    // If one team is TBD, can we set the other as winner? 
    // Usually no, but let's check current logic: "if (team1 && team2 && !hasWinner)"
    // The user complained about TBD. 
    // Let's allow setting winner even if opponent is TBD? 
    // No, that breaks the bracket logic usually.
    // I will stick to "Must have both teams" but suppress the "Reset" button UI and use toggle.

    // Finding the teams in the match
    const team1 = getTeamById(match.team1Id)
    const team2 = getTeamById(match.team2Id)

    if (match.winnerId === teamId) {
      // Toggle off (Reset)
      // No confirmation for smooth UX, or simple one? User said "reset match as clicking again".
      // I'll assume direct action or simple confirm. I'll stick to direct for "toggle" feel.
      resetMatch(match.id, true) // Pass true to skip confirm? Need to update resetMatch sig or logic.
    } else {
      // Set winner
      // Strict check removed to allow advancing against TBD

      setWinner(match.id, teamId)
    }
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
      <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-4 md:p-8 overflow-x-auto">
        <div className="max-w-none mx-auto min-w-max">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 sticky left-0">
            <div>
              <h1 className="text-3xl font-bold mb-1">Tournament Bracket</h1>
              {bracket && <p className="text-gray-400 text-sm">{bracket.name} ({bracket.bracketType.replace('_', ' ')})</p>}
            </div>
            <div className="flex gap-2">
              {bracket && (
                <>
                  <button onClick={reshuffleBracket} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded shadow transition-colors font-semibold mr-2">Reshuffle</button>
                  <button onClick={deleteBracket} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded shadow transition-colors font-semibold">Delete</button>
                </>
              )}
              <Link href={`/shuffle/${linkCode}`} className={BUTTON_STYLES.secondary}>Back</Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : !bracket ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-dota-card p-8 rounded-lg border border-gray-700 text-center max-w-lg">
                <h2 className="text-2xl font-bold mb-4">No Bracket Found</h2>
                <button onClick={createBracket} disabled={creating} className={BUTTON_STYLES.primaryLarge}>
                  {creating ? 'Creating...' : 'Generate Bracket'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              {/* Champion Banner */}
              {championTeam && (
                <div className="flex flex-col items-center mb-12 animate-fade-in pt-8">
                  <div className="text-yellow-500 font-bold tracking-widest uppercase mb-2">Champion</div>
                  <div className="bg-gradient-to-b from-yellow-900/40 to-black border-2 border-yellow-600 p-6 rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.3)] text-center min-w-[200px]">
                    <div className="text-2xl font-bold text-white mb-1">{championTeam.teamName || `Team ${championTeam.teamNumber}`}</div>
                    <div className="text-yellow-500/80 text-sm mb-4">MMR: {championTeam.averageMmr}</div>

                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {championTeam.playerIds.map(pid => {
                        const p = getPlayerById(pid)
                        if (!p) return null
                        return (
                          <span key={pid} className="bg-yellow-900/30 text-yellow-100 px-2 py-1 rounded text-xs border border-yellow-700/50">
                            {p.playerName}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Recursive Tree Layout */}
              <div className="w-full overflow-auto pb-12 px-8 flex justify-center">
                <BracketNode
                  roundIndex={bracket.rounds.length - 1}
                  matchIndex={0}
                  bracket={bracket}
                  handleMatchClick={handleMatchClick}
                  getTeamById={getTeamById}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

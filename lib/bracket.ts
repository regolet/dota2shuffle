// Tournament Bracket Generation - Ported from Flask

export interface BracketTeam {
  id: string
  teamNumber: number
  teamName: string | null
  averageMmr: number
  playerIds: string[]
}

export interface BracketMatch {
  id: string
  roundNumber: number
  matchNumber: number
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  status: 'pending' | 'in_progress' | 'completed'
  nextMatchId: string | null
}

export interface BracketRound {
  roundNumber: number
  roundName: string
  matches: BracketMatch[]
}

export interface Bracket {
  id: string
  type: 'single_elimination' | 'double_elimination' | 'round_robin'
  rounds: BracketRound[]
  teams: BracketTeam[]
}

/**
 * Generate single elimination bracket matches
 */
export function generateSingleEliminationBracket(teams: BracketTeam[]): BracketRound[] {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams for a bracket')
  }

  // Find next power of 2
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(teams.length)))
  const totalRounds = Math.log2(nextPowerOf2)

  const rounds: BracketRound[] = []
  const allMatches: BracketMatch[] = []

  // Generate all rounds
  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const matchesInRound = Math.pow(2, totalRounds - roundNum)
    const roundMatches: BracketMatch[] = []

    for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
      const matchId = `r${roundNum}m${matchNum}`

      roundMatches.push({
        id: matchId,
        roundNumber: roundNum,
        matchNumber: matchNum,
        team1Id: null,
        team2Id: null,
        winnerId: null,
        status: 'pending',
        nextMatchId: null,
      })
    }

    rounds.push({
      roundNumber: roundNum,
      roundName: getRoundName(roundNum, totalRounds),
      matches: roundMatches,
    })

    allMatches.push(...roundMatches)
  }

  // Set next match IDs
  for (let roundNum = 1; roundNum < totalRounds; roundNum++) {
    const currentRound = rounds[roundNum - 1]
    const nextRound = rounds[roundNum]

    currentRound.matches.forEach((match, index) => {
      const nextMatchIndex = Math.floor(index / 2)
      match.nextMatchId = nextRound.matches[nextMatchIndex].id
    })
  }

  // Seed teams into first round
  seedTeamsIntoFirstRound(rounds[0], teams)

  return rounds
}

/**
 * Seed teams into first round matches using standard seeding
 */
function seedTeamsIntoFirstRound(firstRound: BracketRound, teams: BracketTeam[]) {
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(teams.length)))
  const byes = nextPowerOf2 - teams.length

  // Standard tournament seeding
  const seededTeams = [...teams]

  // For simplicity, we'll do sequential seeding
  // In a real tournament, you'd use bracket seeding (1 vs 8, 2 vs 7, etc.)
  let teamIndex = 0

  for (const match of firstRound.matches) {
    if (teamIndex < seededTeams.length) {
      match.team1Id = seededTeams[teamIndex].id
      teamIndex++
    }

    if (teamIndex < seededTeams.length) {
      match.team2Id = seededTeams[teamIndex].id
      teamIndex++
    }

    // If only one team, they get a bye
    if (match.team1Id && !match.team2Id) {
      match.winnerId = match.team1Id
      match.status = 'completed'
    }
  }
}

/**
 * Get round name based on round number and total rounds
 */
function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - roundNumber

  if (roundsFromEnd === 0) return 'Finals'
  if (roundsFromEnd === 1) return 'Semi-Finals'
  if (roundsFromEnd === 2) return 'Quarter-Finals'
  return `Round ${roundNumber}`
}

/**
 * Set match winner and update bracket progression
 */
/**
 * Set match winner and update bracket progression
 */
export function setMatchWinner(
  rounds: BracketRound[],
  matchId: string,
  winnerId: string
): BracketRound[] {
  const updatedRounds = JSON.parse(JSON.stringify(rounds)) as BracketRound[]

  // Find the match and update it
  let currentMatch: BracketMatch | null = null

  for (const round of updatedRounds) {
    const match = round.matches.find((m) => m.id === matchId)
    if (match) {
      match.winnerId = winnerId
      match.status = 'completed'
      currentMatch = match
      break
    }
  }

  if (!currentMatch) {
    throw new Error('Match not found')
  }

  // Progress winner to next match
  if (currentMatch.nextMatchId) {
    const nextMatch = findMatchInRounds(updatedRounds, currentMatch.nextMatchId)
    if (nextMatch) {
      // Determine target slot based on match number (Odd = Slot 1, Even = Slot 2)
      // matchNumber is 1-based.
      // Match 1 (Index 0) -> Slot 1
      // Match 2 (Index 1) -> Slot 2
      const isSlot1 = currentMatch.matchNumber % 2 !== 0

      if (isSlot1) {
        nextMatch.team1Id = winnerId
      } else {
        nextMatch.team2Id = winnerId
      }

      // If both teams are set, mark match as ready
      if (nextMatch.team1Id && nextMatch.team2Id) {
        nextMatch.status = 'pending'
      }
    }
  }

  return updatedRounds
}

/**
 * Reset a match (remove winner) and cascade changes
 */
export function resetMatch(rounds: BracketRound[], matchId: string): BracketRound[] {
  const updatedRounds = JSON.parse(JSON.stringify(rounds)) as BracketRound[]
  resetMatchRecursive(updatedRounds, matchId)
  return updatedRounds
}

function resetMatchRecursive(rounds: BracketRound[], matchId: string) {
  const match = findMatchInRounds(rounds, matchId)
  if (!match) return

  // 1. Reset current match
  match.winnerId = null
  match.status = (match.team1Id && match.team2Id) ? 'pending' : 'pending'

  // 2. Cascade to next match
  if (match.nextMatchId) {
    const nextMatch = findMatchInRounds(rounds, match.nextMatchId)
    if (nextMatch) {
      // Determine which slot to clear
      const isSlot1 = match.matchNumber % 2 !== 0

      if (isSlot1) {
        nextMatch.team1Id = null
      } else {
        nextMatch.team2Id = null
      }

      // If next match was already completed (had a winner), we must reset it too
      if (nextMatch.winnerId) {
        resetMatchRecursive(rounds, nextMatch.id)
      } else {
        // Just ensure it's pending (or holding if empty? status logic is simple here)
        nextMatch.status = 'pending'
      }
    }
  }
}

function findMatchInRounds(rounds: BracketRound[], matchId: string): BracketMatch | null {
  for (const round of rounds) {
    const match = round.matches.find((m) => m.id === matchId)
    if (match) return match
  }
  return null
}

/**
 * Get bracket champion (winner of finals)
 */
export function getChampion(rounds: BracketRound[]): string | null {
  if (rounds.length === 0) return null

  const finals = rounds[rounds.length - 1]
  const finalsMatch = finals.matches[0]

  return finalsMatch.winnerId
}

/**
 * Check if bracket is complete
 */
export function isBracketComplete(rounds: BracketRound[]): boolean {
  if (rounds.length === 0) return false

  const finals = rounds[rounds.length - 1]
  const finalsMatch = finals.matches[0]

  return finalsMatch.status === 'completed' && finalsMatch.winnerId !== null
}

/**
 * Get match by ID
 */
export function getMatchById(rounds: BracketRound[], matchId: string): BracketMatch | null {
  for (const round of rounds) {
    const match = round.matches.find((m) => m.id === matchId)
    if (match) return match
  }
  return null
}

/**
 * Calculate standings based on bracket results
 */
export function calculateStandings(rounds: BracketRound[], teams: BracketTeam[]) {
  const standings = teams.map((team) => ({
    teamId: team.id,
    teamNumber: team.teamNumber,
    teamName: team.teamName,
    wins: 0,
    losses: 0,
    placing: 0,
  }))

  // Count wins and losses
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.status === 'completed' && match.winnerId) {
        const winner = standings.find((s) => s.teamId === match.winnerId)
        if (winner) winner.wins++

        const loserId = match.team1Id === match.winnerId ? match.team2Id : match.team1Id
        if (loserId) {
          const loser = standings.find((s) => s.teamId === loserId)
          if (loser) loser.losses++
        }
      }
    }
  }

  // Determine placing based on when teams were eliminated
  const champion = getChampion(rounds)
  if (champion) {
    const championTeam = standings.find((s) => s.teamId === champion)
    if (championTeam) championTeam.placing = 1
  }

  // Sort by wins descending
  standings.sort((a, b) => b.wins - a.wins)

  return standings
}



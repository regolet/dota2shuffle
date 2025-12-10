// Dota 2 Team Shuffle Algorithm - Ported from Python

export interface Player {
  id: string
  playerName: string
  mmr: number
  preferredRoles: string[]
  status: string
}

export interface Team {
  teamNumber: number
  players: Player[]
  averageMmr: number
  totalMmr: number
}

export interface ShuffleConfig {
  teamSize: number
  iterations: number
  minPlayersForShuffle: number
}

export interface ShuffleResult {
  teams: Team[]
  reservePlayers: Player[]
  balance: {
    averageMmr: number
    variance: number
    minTeamMmr: number
    maxTeamMmr: number
    mmrDifference: number
  }
}

const DEFAULT_CONFIG: ShuffleConfig = {
  teamSize: 5,
  iterations: 1000,
  minPlayersForShuffle: 10,
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Calculate team statistics
 */
function calculateTeamStats(teamPlayers: Player[][]): Team[] {
  return teamPlayers.map((players, index) => {
    const totalMmr = players.reduce((sum, p) => sum + p.mmr, 0)
    const averageMmr = players.length > 0 ? Math.round(totalMmr / players.length) : 0

    return {
      teamNumber: index + 1,
      players,
      totalMmr,
      averageMmr,
    }
  })
}

/**
 * Calculate variance of team MMRs
 */
function calculateVariance(teams: Team[]): number {
  if (teams.length === 0) return 0

  const avgMmrs = teams.map((t) => t.averageMmr)
  const mean = avgMmrs.reduce((sum, mmr) => sum + mmr, 0) / avgMmrs.length
  const variance = avgMmrs.reduce((sum, mmr) => sum + Math.pow(mmr - mean, 2), 0) / avgMmrs.length

  return variance
}

/**
 * Calculate balance statistics for teams
 */
export function calculateBalance(teams: Team[]) {
  if (teams.length === 0) {
    return {
      averageMmr: 0,
      variance: 0,
      minTeamMmr: 0,
      maxTeamMmr: 0,
      mmrDifference: 0,
    }
  }

  const avgMmrs = teams.map((t) => t.averageMmr)
  const mean = avgMmrs.reduce((sum, mmr) => sum + mmr, 0) / avgMmrs.length
  const variance = calculateVariance(teams)
  const minTeamMmr = Math.min(...avgMmrs)
  const maxTeamMmr = Math.max(...avgMmrs)

  return {
    averageMmr: Math.round(mean),
    variance: Math.round(variance),
    minTeamMmr,
    maxTeamMmr,
    mmrDifference: maxTeamMmr - minTeamMmr,
  }
}

/**
 * Check if a team has valid role distribution
 * Requirements: At least 2 supports, 1 carry, 1 mid, 1 offlane
 */
function hasValidRoles(team: Player[]): boolean {
  const roleCounts = {
    'Hard Support': 0,
    'Soft Support': 0,
    'Carry': 0,
    'Mid': 0,
    'Offlane': 0,
  }

  // Count roles (a player can have multiple preferred roles)
  team.forEach(player => {
    player.preferredRoles.forEach(role => {
      if (roleCounts[role as keyof typeof roleCounts] !== undefined) {
        roleCounts[role as keyof typeof roleCounts]++
      }
    })
  })

  // At least 2 support players (Hard or Soft)
  const totalSupports = roleCounts['Hard Support'] + roleCounts['Soft Support']

  // Check requirements
  return (
    totalSupports >= 2 &&
    roleCounts['Carry'] >= 1 &&
    roleCounts['Mid'] >= 1 &&
    roleCounts['Offlane'] >= 1
  )
}

/**
 * Calculate role balance score for all teams (lower is better)
 */
function calculateRoleScore(teams: Player[][]): number {
  let totalScore = 0

  teams.forEach(team => {
    const roleCounts = {
      'Hard Support': 0,
      'Soft Support': 0,
      'Carry': 0,
      'Mid': 0,
      'Offlane': 0,
    }

    team.forEach(player => {
      player.preferredRoles.forEach(role => {
        if (roleCounts[role as keyof typeof roleCounts] !== undefined) {
          roleCounts[role as keyof typeof roleCounts]++
        }
      })
    })

    const totalSupports = roleCounts['Hard Support'] + roleCounts['Soft Support']

    // HEAVY penalties for not meeting minimum role requirements (must have these roles!)
    if (totalSupports < 2) totalScore += 1000 // MUST have at least 2 supports
    if (roleCounts['Carry'] < 1) totalScore += 1000 // MUST have at least 1 carry
    if (roleCounts['Mid'] < 1) totalScore += 1000 // MUST have at least 1 mid
    if (roleCounts['Offlane'] < 1) totalScore += 1000 // MUST have at least 1 offlane

    // Minor penalty for deviation from ideal distribution
    totalScore += Math.abs(2 - totalSupports) * 5
    totalScore += Math.abs(1 - roleCounts['Carry']) * 5
    totalScore += Math.abs(1 - roleCounts['Mid']) * 5
    totalScore += Math.abs(1 - roleCounts['Offlane']) * 5
  })

  return totalScore
}

/**
 * Main shuffle algorithm using iterative balancing with snake draft and role consideration
 */
export function shuffleTeams(
  players: Player[],
  config: Partial<ShuffleConfig> = {}
): Team[] {
  const { teamSize, iterations, minPlayersForShuffle } = {
    ...DEFAULT_CONFIG,
    ...config,
  }

  // Filter present players only
  const presentPlayers = players.filter((p) => p.status === 'Present')

  // Check minimum players
  if (presentPlayers.length < minPlayersForShuffle) {
    throw new Error(
      `Not enough players. Minimum ${minPlayersForShuffle} required, got ${presentPlayers.length}`
    )
  }

  const numTeams = Math.floor(presentPlayers.length / teamSize)

  if (numTeams < 2) {
    throw new Error('Not enough players to form at least 2 teams')
  }

  let bestTeams: Player[][] = []
  let bestVariance = Infinity
  let bestRoleScore = Infinity

  console.log(`Starting shuffle with ${presentPlayers.length} players, ${numTeams} teams, ${iterations} iterations`)

  // Iterative balancing
  for (let iter = 0; iter < iterations; iter++) {
    // Shuffle players completely randomly (DO NOT SORT to allow variation)
    const shuffled = shuffleArray([...presentPlayers])

    // Take only enough players for complete teams
    const playersForTeams = shuffled.slice(0, numTeams * teamSize)

    // Simple round-robin distribution (allows more variation than snake draft)
    const teams: Player[][] = Array.from({ length: numTeams }, () => [])

    for (let i = 0; i < playersForTeams.length; i++) {
      const teamIndex = i % numTeams
      teams[teamIndex].push(playersForTeams[i])
    }

    // Calculate variance and role score for this iteration
    const teamStats = calculateTeamStats(teams)
    const variance = calculateVariance(teamStats)
    const roleScore = calculateRoleScore(teams)

    // Combined score: PRIORITIZE role balance (1st), then MMR balance (2nd)
    // Role balance is weighted much higher to ensure proper role distribution
    const combinedScore = roleScore * 100 + variance

    const bestCombinedScore = bestRoleScore * 100 + bestVariance

    // Keep if better
    if (combinedScore < bestCombinedScore) {
      bestVariance = variance
      bestRoleScore = roleScore
      bestTeams = teams

      // Log improvements (only log first 10 and every 100th after that)
      if (iter < 10 || iter % 100 === 0) {
        console.log(`Iteration ${iter}: New best - roleScore: ${roleScore}, variance: ${variance}, combined: ${combinedScore}`)
      }
    }
  }

  console.log(`Final result - Best roleScore: ${bestRoleScore}, Best variance: ${bestVariance}`)
  console.log(`Shuffle ID: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  return calculateTeamStats(bestTeams)
}

/**
 * Get reserve (bench) players who won't be in teams
 */
export function getReservePlayers(players: Player[], teams: Team[], teamSize: number = 5): Player[] {
  const presentPlayers = players.filter((p) => p.status === 'Present')

  // Get IDs of players who are in teams
  const playersInTeams = new Set<string>()
  teams.forEach(team => {
    team.players.forEach(player => {
      playersInTeams.add(player.id)
    })
  })

  // Return players who are present but not in any team
  return presentPlayers.filter(p => !playersInTeams.has(p.id))
}

/**
 * Complete shuffle operation returning teams, reserves, and balance info
 */
export function performShuffle(
  players: Player[],
  config: Partial<ShuffleConfig> = {}
): ShuffleResult {
  const teams = shuffleTeams(players, config)
  const reservePlayers = getReservePlayers(players, teams, config.teamSize || 5)
  const balance = calculateBalance(teams)

  return {
    teams,
    reservePlayers,
    balance,
  }
}

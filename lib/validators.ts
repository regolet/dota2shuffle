import { z } from 'zod'

// Dota 2 Roles
export const DOTA_ROLES = ['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support'] as const

// Player Registration Schema
export const registrationSchema = z.object({
  linkCode: z.string().length(32, 'Invalid registration link'),
  playerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  mmr: z
    .number()
    .int('MMR must be a whole number')
    .min(0, 'MMR cannot be negative')
    .max(15000, 'MMR seems too high'),
  preferredRoles: z
    .array(z.enum(DOTA_ROLES))
    .min(1, 'Select at least one preferred role')
    .max(2, 'Maximum 2 roles'),
})

// Admin Login Schema
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Create Registration Link Schema
export const createLinkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  maxPlayers: z.number().int().min(10).max(1000).default(100),
  expiresHours: z.number().int().min(1).max(168).optional(), // 1 hour to 1 week
  scheduledTime: z.string().optional(), // ISO date string
})

// Update Player Status Schema
export const updatePlayerStatusSchema = z.object({
  playerId: z.string(),
  status: z.enum(['Present', 'Absent', 'Reserve']),
})

// Create Team Schema
export const createTeamSchema = z.object({
  registrationLinkId: z.string(),
  teamNumber: z.number().int().min(1),
  teamName: z.string().max(100).optional(),
  playerIds: z.array(z.string()).min(1).max(10),
})

// Masterlist Player Schema
export const masterlistPlayerSchema = z.object({
  playerName: z.string().min(2).max(100).trim(),
  steamId: z.string().optional(),
  discordId: z.string().optional(),
  defaultMmr: z.number().int().min(0).max(15000).optional(),
  notes: z.string().max(1000).optional(),
})

// Ban Player Schema
export const banPlayerSchema = z.object({
  playerName: z.string().min(1),
  banReason: z.string().min(1).max(500),
})

// Types derived from schemas
export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateLinkInput = z.infer<typeof createLinkSchema>
export type UpdatePlayerStatusInput = z.infer<typeof updatePlayerStatusSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type MasterlistPlayerInput = z.infer<typeof masterlistPlayerSchema>
export type BanPlayerInput = z.infer<typeof banPlayerSchema>

'use client'

import { useState } from 'react'
import { DOTA_ROLES } from '@/lib/validators'
import { BUTTON_STYLES } from '@/lib/styles/button'

interface AddPlayerFormProps {
    onSubmit: (player: { playerName: string; mmr: number; preferredRoles: string[] }) => Promise<void>
    onCancel: () => void
}

export function AddPlayerForm({ onSubmit, onCancel }: AddPlayerFormProps) {
    const [playerName, setPlayerName] = useState('')
    const [mmr, setMmr] = useState<number | ''>('')
    const [preferredRoles, setPreferredRoles] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const toggleRole = (role: string) => {
        if (preferredRoles.includes(role)) {
            setPreferredRoles(preferredRoles.filter((r) => r !== role))
        } else {
            if (preferredRoles.length >= 2) {
                setError('Maximum 2 roles allowed')
                setTimeout(() => setError(''), 2000)
                return
            }
            setPreferredRoles([...preferredRoles, role])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (preferredRoles.length === 0) {
            setError('Please select at least one role')
            return
        }

        setSubmitting(true)
        try {
            await onSubmit({
                playerName,
                mmr: Number(mmr),
                preferredRoles,
            })
            // Reset form on success
            setPlayerName('')
            setMmr('')
            setPreferredRoles([])
        } catch (err) {
            setError('Failed to add player')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Add Player</h3>

            {error && (
                <div className="mb-4 bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-2 rounded text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm mb-2">Player Name *</label>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                        required
                        disabled={submitting}
                    />
                </div>
                <div>
                    <label className="block text-sm mb-2">MMR *</label>
                    <input
                        type="number"
                        value={mmr}
                        onChange={(e) => setMmr(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                        min="0"
                        max="15000"
                        required
                        disabled={submitting}
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
                            className={`px-3 py-2 rounded text-sm transition-colors ${preferredRoles.includes(role)
                                    ? 'bg-dota-radiant text-white'
                                    : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            disabled={submitting}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    type="submit"
                    disabled={submitting}
                    className={BUTTON_STYLES.success}
                >
                    {submitting ? 'Adding...' : 'Add Player'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className={BUTTON_STYLES.secondary}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}

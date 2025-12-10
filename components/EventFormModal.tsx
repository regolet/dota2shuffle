'use client'

import { BUTTON_STYLES } from '@/lib/button-styles'

interface EventFormData {
    title: string
    description: string
    maxPlayers: number
    expiresHours: number | ''
    scheduledDate: string
    scheduledTime: string
}

interface EventFormModalProps {
    mode: 'create' | 'edit'
    formData: EventFormData
    onChange: (data: Partial<EventFormData>) => void
    onSubmit: (e: React.FormEvent) => void
    onCancel: () => void
    isSubmitting: boolean
}

export function EventFormModal({
    mode,
    formData,
    onChange,
    onSubmit,
    onCancel,
    isSubmitting,
}: EventFormModalProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Event Title *
                    </label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                        required
                        disabled={isSubmitting}
                        placeholder="e.g., Weekly Dota 2 Tournament"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Max Players
                    </label>
                    <input
                        type="number"
                        value={formData.maxPlayers}
                        onChange={(e) => onChange({ maxPlayers: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                        min="10"
                        max="1000"
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                    rows={3}
                    disabled={isSubmitting}
                    placeholder="Event details, rules, etc."
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Expires In (hours, optional)
                    </label>
                    <input
                        type="number"
                        value={formData.expiresHours}
                        onChange={(e) =>
                            onChange({ expiresHours: e.target.value ? Number(e.target.value) : '' })
                        }
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                        min="1"
                        max="168"
                        disabled={isSubmitting}
                        placeholder="Never expires"
                    />
                </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold mb-3">Schedule Event (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Event Date
                        </label>
                        <input
                            type="date"
                            value={formData.scheduledDate}
                            onChange={(e) => onChange({ scheduledDate: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Event Time
                        </label>
                        <input
                            type="time"
                            value={formData.scheduledTime}
                            onChange={(e) => onChange({ scheduledTime: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Set a scheduled time to display when the event will take place
                </p>
            </div>

            <div className="flex gap-4 justify-end pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className={BUTTON_STYLES.secondary}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={BUTTON_STYLES.primary}
                >
                    {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Update Event'}
                </button>
            </div>
        </form>
    )
}

export type { EventFormData }

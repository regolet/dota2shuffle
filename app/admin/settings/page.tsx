'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { useNotification } from '@/lib/useNotification'
import { BUTTON_STYLES } from '@/lib/button-styles'

export default function SettingsPage() {
    const router = useRouter()
    const notification = useNotification()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            notification.error('New passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            notification.error('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            const res = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                if (res.status === 401 && data.error === 'Unauthorized') {
                    router.push('/admin/login')
                    return
                }
                notification.error(data.error || 'Failed to change password')
                setLoading(false)
                return
            }

            notification.success('Password changed successfully!')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            notification.error('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <notification.NotificationContainer />
            <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-6">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-4xl font-bold">Settings</h1>
                        <Link
                            href="/admin/dashboard"
                            className={BUTTON_STYLES.secondary + ' inline-flex items-center gap-2'}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                    </div>

                    {/* Change Password Card */}
                    <div className="bg-dota-card p-8 rounded-lg border border-gray-700 shadow-2xl">
                        <h2 className="text-2xl font-semibold mb-6">Change Password</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                                    required
                                    disabled={loading}
                                    minLength={6}
                                />
                                <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                                    required
                                    disabled={loading}
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={BUTTON_STYLES.primary + ' w-full'}
                            >
                                {loading ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </form>
                    </div>

                    {/* Security Notice */}
                    <div className="mt-6 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-200">
                            Make sure to remember your new password. If you forget it, you'll need to reset via the database seed command.
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}

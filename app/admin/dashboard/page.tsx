'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit2, Copy, Eye, Users, Shuffle, Trophy, Trash2, Settings, Home, LogOut, Plus } from 'lucide-react'
import { useNotification } from '@/lib/useNotification'
import { BUTTON_STYLES, COMPACT_COLORS, buttonClass } from '@/lib/button-styles'

interface RegistrationLink {
  id: string
  linkCode: string
  title: string
  description: string | null
  maxPlayers: number
  createdAt: Date
  updatedAt: Date | null
  expiresAt: Date | null
  scheduledTime: Date | null
  isActive: boolean
}

export default function AdminDashboard() {
  const router = useRouter()
  const notification = useNotification()
  const [links, setLinks] = useState<RegistrationLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(100)
  const [expiresHours, setExpiresHours] = useState<number | ''>('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  useEffect(() => {
    fetchLinks()
  }, [])

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/admin/links')
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error)
      }

      setLinks(data.links)
    } catch (err) {
      console.error('Failed to fetch links:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setMaxPlayers(100)
    setExpiresHours('')
    setScheduledDate('')
    setScheduledTime('')
    setEditing(null)
  }

  const openCreateModal = () => {
    resetForm()
    setModalMode('create')
    setShowModal(true)
  }

  const openEditModal = (link: RegistrationLink) => {
    setTitle(link.title)
    setDescription(link.description || '')
    setMaxPlayers(link.maxPlayers)
    setExpiresHours('')

    // Populate scheduled date and time if available
    if (link.scheduledTime) {
      const scheduled = new Date(link.scheduledTime)
      const dateStr = scheduled.toISOString().split('T')[0]
      const timeStr = scheduled.toTimeString().slice(0, 5)
      setScheduledDate(dateStr)
      setScheduledTime(timeStr)
    } else {
      setScheduledDate('')
      setScheduledTime('')
    }

    setEditing(link.id)
    setModalMode('edit')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      // Prepare request body
      const bodyData: any = {
        title,
        description: description || undefined,
        maxPlayers,
        expiresHours: expiresHours || undefined,
      }

      // Only add scheduledTime if both date and time are provided
      if (scheduledDate && scheduledTime) {
        bodyData.scheduledTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const url = editing ? `/api/admin/links/${editing}` : '/api/admin/links'
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error)
      }

      // Refresh links and close modal
      await fetchLinks()
      closeModal()

      if (editing) {
        notification.success('Registration link updated successfully!')
      } else {
        notification.success(`Registration link created!\n\nURL: ${data.url}`)
      }
    } catch (err) {
      notification.error(`Failed to ${editing ? 'update' : 'create'} link: ${err}`)
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = (linkCode: string) => {
    const url = `${window.location.origin}/register/${linkCode}`
    navigator.clipboard.writeText(url)
    notification.success('Registration URL copied to clipboard!')
  }

  const toggleLinkStatus = async (linkId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (res.ok) {
        fetchLinks()
      } else {
        notification.error('Failed to update link status')
      }
    } catch (err) {
      notification.error('Error updating link status')
    }
  }

  const deleteLink = async (linkId: string, title: string) => {
    notification.confirm(
      `Delete "${title}"? This cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/links/${linkId}`, {
            method: 'DELETE',
          })

          if (res.ok) {
            fetchLinks()
            notification.success('Link deleted successfully')
          } else {
            notification.error('Failed to delete link')
          }
        } catch (err) {
          notification.error('Error deleting link')
        }
      }
    )
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <>
      <notification.NotificationContainer />
      <div className="min-h-screen bg-gradient-to-br from-dota-bg to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <div className="flex gap-3">
              <button
                onClick={openCreateModal}
                className={BUTTON_STYLES.primary + ' inline-flex items-center gap-2'}
              >
                <Plus className="w-4 h-4" />
                Create Event
              </button>
              <Link
                href="/admin/masterlist"
                className={BUTTON_STYLES.purple + ' inline-flex items-center gap-2'}
              >
                <Users className="w-4 h-4" />
                Players Masterlist
              </Link>
              <Link
                href="/admin/settings"
                className={BUTTON_STYLES.secondary + ' inline-flex items-center gap-2'}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <Link
                href="/"
                className={BUTTON_STYLES.secondary + ' inline-flex items-center gap-2'}
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <button
                onClick={handleLogout}
                className={BUTTON_STYLES.danger + ' inline-flex items-center gap-2'}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Modal for Create/Edit */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">
                      {modalMode === 'create' ? 'Create Registration Link' : 'Edit Registration Link'}
                    </h2>
                    <button
                      onClick={closeModal}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                        required
                        disabled={creating}
                        placeholder="e.g., Weekly Dota 2 Tournament"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Max Players
                      </label>
                      <input
                        type="number"
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                        min="10"
                        max="1000"
                        disabled={creating}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                      rows={3}
                      disabled={creating}
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
                        value={expiresHours}
                        onChange={(e) =>
                          setExpiresHours(e.target.value ? Number(e.target.value) : '')
                        }
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                        min="1"
                        max="168"
                        disabled={creating}
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
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                          disabled={creating}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Event Time
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-dota-radiant"
                          disabled={creating}
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
                      onClick={closeModal}
                      disabled={creating}
                      className={BUTTON_STYLES.secondary}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className={BUTTON_STYLES.primary}
                    >
                      {creating ? 'Saving...' : modalMode === 'create' ? 'Create Event' : 'Update Event'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Registration Links Table */}
          <div className="bg-dota-card p-6 rounded-lg border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Registration Links</h2>

            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : links.length === 0 ? (
              <p className="text-gray-400">No registration links created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4">Title</th>
                      <th className="text-left py-3 px-4">Max Players</th>
                      <th className="text-left py-3 px-4">Scheduled</th>
                      <th className="text-left py-3 px-4">Expires</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => (
                      <tr
                        key={link.id}
                        className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold">{link.title}</p>
                            {link.description && (
                              <p className="text-xs text-gray-400 mt-1">
                                {link.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{link.maxPlayers}</td>
                        <td className="py-3 px-4 text-sm">
                          {link.scheduledTime ? (
                            <div>
                              <div className="font-semibold text-yellow-400">
                                {new Date(link.scheduledTime).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(link.scheduledTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">Not scheduled</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {link.expiresAt
                            ? new Date(link.expiresAt).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleLinkStatus(link.id, link.isActive)}
                            className={`px-3 py-1 rounded text-sm cursor-pointer transition-colors ${link.isActive
                              ? 'bg-green-500 bg-opacity-20 text-green-300 hover:bg-opacity-30'
                              : 'bg-red-500 bg-opacity-20 text-red-300 hover:bg-opacity-30'
                              }`}
                          >
                            {link.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1 flex-wrap">
                            <button
                              onClick={() => openEditModal(link)}
                              className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded inline-flex items-center transition-colors"
                              title="Edit event"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(link.linkCode)}
                              className="bg-gray-600 hover:bg-gray-500 p-1.5 rounded inline-flex items-center transition-colors"
                              title="Copy registration URL"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/register/${link.linkCode}`}
                              target="_blank"
                              className="bg-cyan-600 hover:bg-cyan-500 p-1.5 rounded inline-flex items-center transition-colors"
                              title="View registration page"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/admin/players/${link.linkCode}`}
                              className="bg-purple-600 hover:bg-purple-500 p-1.5 rounded inline-flex items-center transition-colors"
                              title="Manage players"
                            >
                              <Users className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/shuffle/${link.linkCode}`}
                              className="bg-green-600 hover:bg-green-500 p-1.5 rounded inline-flex items-center transition-colors"
                              title="Shuffle teams"
                            >
                              <Shuffle className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/admin/bracket/${link.linkCode}`}
                              className="bg-yellow-600 hover:bg-yellow-500 p-1.5 rounded inline-flex items-center transition-colors"
                              title="Tournament bracket"
                            >
                              <Trophy className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => deleteLink(link.id, link.title)}
                              className="bg-red-600 hover:bg-red-500 p-1.5 rounded inline-flex items-center transition-colors"
                              title="Delete event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

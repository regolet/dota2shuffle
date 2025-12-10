'use client'

import Link from 'next/link'
import { Edit2, Copy, Eye, Users, Shuffle, Trophy, Trash2 } from 'lucide-react'
import { RegistrationLink } from '@/types'

interface RegistrationLinksTableProps {
    links: RegistrationLink[]
    loading: boolean
    onEdit: (link: RegistrationLink) => void
    onToggleStatus: (linkId: string, isActive: boolean) => void
    onCopyLink: (linkCode: string) => void
    onDelete: (linkId: string, title: string) => void
}

export function RegistrationLinksTable({
    links,
    loading,
    onEdit,
    onToggleStatus,
    onCopyLink,
    onDelete,
}: RegistrationLinksTableProps) {
    if (loading) {
        return <p className="text-gray-400">Loading...</p>
    }

    if (links.length === 0) {
        return <p className="text-gray-400">No registration links created yet.</p>
    }

    return (
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
                                    onClick={() => onToggleStatus(link.id, link.isActive)}
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
                                        onClick={() => onEdit(link)}
                                        className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded inline-flex items-center transition-colors"
                                        title="Edit event"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onCopyLink(link.linkCode)}
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
                                        onClick={() => onDelete(link.id, link.title)}
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
    )
}

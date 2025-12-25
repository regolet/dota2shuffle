'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, Users, Settings, LogOut, Trophy, Shuffle, Plus } from 'lucide-react'

interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
    onClick?: () => void
}

interface MobileNavProps {
    items: NavItem[]
    onLogout?: () => void
}

export function MobileNav({ items, onLogout }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    // Close nav when route changes
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    // Prevent body scroll when nav is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    return (
        <>
            {/* Hamburger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="mobile-only p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors touch-target"
                aria-label="Open menu"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 backdrop ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* Slide-out Drawer */}
            <nav
                className={`fixed top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-700 z-50 nav-drawer safe-top safe-bottom ${isOpen ? 'open' : ''}`}
                aria-label="Mobile navigation"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <span className="text-lg font-bold bg-gradient-to-r from-dota-radiant to-dota-dire bg-clip-text text-transparent">
                        Dota 2 Shuffle
                    </span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Items */}
                <div className="p-4 space-y-2">
                    {items.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            onClick={item.onClick}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-target ${pathname === item.href
                                    ? 'bg-dota-radiant/20 text-dota-radiant'
                                    : 'hover:bg-gray-800 text-gray-300'
                                }`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Logout Button */}
                {onLogout && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 safe-bottom">
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                onLogout()
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors touch-target"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </nav>
        </>
    )
}

// Export common icons for use in navigation items
export { Home, Users, Settings, LogOut, Trophy, Shuffle, Plus }

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dota 2 Shuffle',
  description: 'Team balancing and shuffling for Dota 2 events',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dota-bg to-gray-900">
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-dota-radiant to-dota-dire bg-clip-text text-transparent">
          Dota 2 Shuffle
        </h1>

        <p className="text-xl text-gray-300 mb-12">
          Advanced team balancing system for competitive Dota 2 events
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/login"
            className="bg-dota-card hover:bg-opacity-80 transition-all p-8 rounded-lg border border-gray-700 hover:border-dota-radiant group"
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
              🛡️
            </div>
            <h2 className="text-2xl font-semibold mb-2">Admin Panel</h2>
            <p className="text-gray-400">
              Create events, manage players, and generate balanced teams
            </p>
          </Link>

          <div className="bg-dota-card p-8 rounded-lg border border-gray-700 opacity-75">
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-2xl font-semibold mb-2">Player Registration</h2>
            <p className="text-gray-400">
              Use the registration link provided by your event organizer
            </p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-dota-card rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Features</h3>
          <ul className="text-gray-300 space-y-2 text-left max-w-md mx-auto">
            <li>✓ MMR-based team balancing algorithm</li>
            <li>✓ Support for role preferences</li>
            <li>✓ Real-time registration tracking</li>
            <li>✓ Offline-capable (no internet required)</li>
            <li>✓ Player masterlist and ban management</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

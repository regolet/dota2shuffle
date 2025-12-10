// Standardized button styles for consistent UI across the application

export const BUTTON_STYLES = {
  // Primary action buttons (main CTA)
  primary: 'bg-dota-radiant hover:bg-green-400 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',

  // Primary large (emphasized actions like Save, Shuffle)
  primaryLarge: 'bg-dota-radiant hover:bg-green-400 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',

  // Secondary action buttons (less emphasis)
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all',

  // Success/Save actions
  success: 'bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',

  // Success large (emphasized save actions)
  successLarge: 'bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',

  // Danger/Delete actions
  danger: 'bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',

  // Warning actions
  warning: 'bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all',

  // Purple/special actions
  purple: 'bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all',

  // Info/view actions
  info: 'bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all',

  // Compact/small buttons (for tables, inline actions)
  compact: 'px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all',

  // Icon-only buttons (small, square)
  icon: 'p-2 rounded-lg shadow-sm hover:shadow-md transition-all',

  // Icon with padding (slightly larger)
  iconLarge: 'p-3 rounded-lg shadow-md hover:shadow-lg transition-all',

  // Toggle buttons (for status changes)
  toggle: 'px-4 py-2 rounded-lg text-sm shadow-sm hover:shadow-md transition-all',

  // Full width variant (for forms)
  fullWidth: 'w-full',
} as const

// Color variants for compact buttons
export const COMPACT_COLORS = {
  primary: 'bg-green-600 hover:bg-green-500 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
  success: 'bg-green-600 hover:bg-green-500 text-white',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  warning: 'bg-yellow-600 hover:bg-yellow-500 text-white',
  purple: 'bg-purple-600 hover:bg-purple-500 text-white',
  info: 'bg-blue-600 hover:bg-blue-500 text-white',
  orange: 'bg-orange-600 hover:bg-orange-500 text-white',
  cyan: 'bg-cyan-600 hover:bg-cyan-500 text-white',
} as const

// Helper function to combine button styles
export function buttonClass(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

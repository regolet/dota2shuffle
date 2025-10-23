import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dota: {
          radiant: '#92A525',
          dire: '#C23C2A',
          bg: '#25282B',
          card: '#2F3136',
        },
      },
    },
  },
  plugins: [],
}
export default config

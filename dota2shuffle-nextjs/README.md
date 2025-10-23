# Dota 2 Shuffle - Next.js Version

A modern, offline-capable team balancing and shuffling system for Dota 2 events, built with Next.js 15 and TypeScript.

## Overview

This application helps event organizers create balanced Dota 2 teams based on player MMR (Match Making Rating). It features an advanced shuffling algorithm that runs 1000 iterations to find the most balanced team distribution.

## Key Features

- ✅ **100% Offline Capable** - Works without internet connection using local SQLite
- ✅ **MMR-Based Balancing** - Advanced algorithm minimizes team variance
- ✅ **Role Preferences** - Players select their preferred positions
- ✅ **Real-time Registration** - Track player registrations in real-time
- ✅ **LAN Support** - Share across local network for multi-device access
- ✅ **Player Masterlist** - Track players across multiple events
- ✅ **Ban Management** - Prevent problematic players from registering
- ✅ **Modern UI** - Clean, responsive interface with Tailwind CSS
- ✅ **Type-Safe** - Full TypeScript for better reliability

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** SQLite (via better-sqlite3)
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS
- **Validation:** Zod
- **Authentication:** Cookie-based sessions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Database

```bash
npm run db:push
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access Application

Open http://localhost:3000 in your browser.

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**⚠️ Change these in `.env.local` before using in production!**

## Project Structure

```
dota2shuffle-nextjs/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── admin/               # Admin endpoints
│   │   │   ├── links/           # Create/list registration links
│   │   │   ├── login/           # Admin authentication
│   │   │   ├── logout/          # Session termination
│   │   │   └── players/         # Player management
│   │   ├── register/            # Player registration
│   │   └── shuffle/             # Team shuffling
│   ├── admin/                   # Admin pages
│   │   ├── dashboard/           # Main admin panel
│   │   ├── login/               # Login page
│   │   └── players/             # Player management UI
│   ├── register/                # Player registration page
│   ├── shuffle/                 # Team shuffle page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── db/                          # Database configuration
│   ├── index.ts                 # Database connection
│   └── schema.ts                # Table schemas
├── lib/                         # Utilities and logic
│   ├── auth.ts                  # Authentication helpers
│   ├── shuffle.ts               # Team balancing algorithm
│   └── validators.ts            # Zod validation schemas
├── .env.local                   # Environment variables
├── drizzle.config.ts           # Drizzle ORM config
├── package.json                 # Dependencies
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript config
├── OFFLINE_SETUP.md            # Offline setup guide
└── README.md                    # This file
```

## Usage Guide

### For Admins

1. **Login**
   - Go to `/admin/login`
   - Enter credentials (default: admin/admin123)

2. **Create Event**
   - Navigate to admin dashboard
   - Fill in event details (title, description, max players)
   - Set expiration time (optional)
   - Copy the generated registration URL

3. **Share Registration Link**
   - Distribute the URL to players
   - Format: `http://localhost:3000/register/{linkCode}`

4. **Monitor Registrations**
   - View registered players in "Manage Players" page
   - Check player MMRs, roles, and registration times

5. **Shuffle Teams**
   - Click "View Shuffle" for the event
   - Press "Shuffle Teams" button
   - View balanced teams with MMR statistics
   - Re-shuffle if needed

### For Players

1. **Access Registration Link**
   - Get link from event organizer
   - Must be on same network (for LAN mode)

2. **Fill Registration Form**
   - Player name (in-game name)
   - Current MMR (0-15000)
   - Preferred roles (select at least one)

3. **Submit Registration**
   - Duplicate names are prevented
   - Banned players cannot register
   - Success message confirms registration

4. **Wait for Shuffle**
   - Event organizer will shuffle teams
   - You'll be assigned to a team or reserve

## Shuffling Algorithm

The algorithm is designed to create the most balanced teams possible:

### Process

1. **Filter Present Players** - Only includes players marked as "Present"
2. **Iterative Balancing** - Runs 1000 iterations
3. **Snake Draft Distribution** - Distributes players like a sports draft
4. **Variance Calculation** - Measures team balance quality
5. **Best Result Selection** - Returns the most balanced configuration

### Balance Metrics

- **Average MMR:** Mean MMR across all teams
- **Variance:** Statistical measure of team balance (lower = better)
- **Min/Max Team MMR:** Range of team averages
- **MMR Difference:** Gap between highest and lowest team

### Reserve Players

If player count doesn't divide evenly by team size (5), excess players become reserves:
- Lowest MMR players are typically reserves
- Available as substitutes for no-shows
- Displayed separately from main teams

## Configuration

### Environment Variables (.env.local)

```env
# Admin credentials (CHANGE THESE!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Session secret (generate random string)
NEXTAUTH_SECRET=your-secret-key-change-this

# Application URL
NEXTAUTH_URL=http://localhost:3000
```

### Team Size

Default: 5 players per team

To change, modify the shuffle API call in `/app/shuffle/[linkCode]/page.tsx`:

```typescript
const result = performShuffle(players, {
  teamSize: 5,        // Change this
  iterations: 1000,
})
```

### Iteration Count

Default: 1000 iterations

Higher = better balance but slower processing. Adjust in same location as team size.

## Database Schema

### Main Tables

- **admins** - Admin accounts
- **registrationLinks** - Event registration links
- **players** - Registered players
- **playerMasterlist** - Player history across events
- **teams** - Shuffled team assignments
- **brackets** - Tournament brackets (future feature)
- **matches** - Match tracking (future feature)
- **lobbies** - Game lobby management (future feature)
- **shuffleHistory** - Historical shuffle data

### Relationships

- Registration links → Players (one-to-many)
- Registration links → Teams (one-to-many)
- Admins → Registration links (one-to-many)
- Brackets → Matches (one-to-many)
- Teams → Matches (many-to-many)

## Offline Operation

### How It Works

1. **Local Database** - SQLite file (`dota2shuffle.db`) stores all data
2. **No External Services** - No API calls to internet
3. **Self-Contained** - All logic runs on local server
4. **LAN Support** - Devices on same network can connect

### Requirements for Offline Use

- ✅ Node.js installed
- ✅ Dependencies installed (`npm install`)
- ✅ Database initialized (`npm run db:push`)
- ❌ No internet connection needed after setup

See [OFFLINE_SETUP.md](./OFFLINE_SETUP.md) for detailed offline setup guide.

## Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint

# Database
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (database GUI)
```

## Troubleshooting

### Database Issues

**Error: "SQLITE_BUSY: database is locked"**
- Stop the dev server
- Delete `dota2shuffle.db-shm` and `dota2shuffle.db-wal`
- Restart server

**Error: "table X already exists"**
- Database already initialized
- Run `npm run dev` to start server

### Network Access Issues

**Can't access from other devices**
- Start server with: `npm run dev -- -H 0.0.0.0`
- Update `NEXTAUTH_URL` in `.env.local` with your IP
- Check firewall allows Node.js
- Verify devices on same network

### Port Conflicts

**Error: "Port 3000 already in use"**
```bash
npm run dev -- -p 3001
```
Update `NEXTAUTH_URL` to match new port.

## Security Considerations

1. **Change Default Credentials** - Immediately update admin password
2. **Change Secret Key** - Generate random string for `NEXTAUTH_SECRET`
3. **Network Security** - Only run on trusted networks
4. **Database Protection** - Secure `dota2shuffle.db` file
5. **Session Management** - Sessions expire after 24 hours

## Comparison with Flask Version

### Advantages of Next.js Version

- ✅ Modern React-based UI
- ✅ Better TypeScript support
- ✅ Simpler offline operation (no WebSockets)
- ✅ Better performance with SSR/SSG
- ✅ More maintainable codebase
- ✅ Better development experience

### Trade-offs

- ❌ Larger bundle size
- ❌ More complex build process
- ❌ No real-time updates (can add later)

The shuffling algorithm is **identical** to the Flask version.

## Future Enhancements

Potential features for future development:

- [ ] Real-time updates with WebSockets/SSE
- [ ] Tournament bracket generation
- [ ] Match tracking and results
- [ ] Player statistics and history
- [ ] Export teams to CSV/PDF
- [ ] Discord/Steam integration
- [ ] Mobile app version
- [ ] Dark/Light theme toggle
- [ ] Multi-language support

## License

This project is provided as-is for Dota 2 event organizers.

## Contributing

This is a standalone project. Modify as needed for your events.

## Support

For issues:
1. Check [OFFLINE_SETUP.md](./OFFLINE_SETUP.md)
2. Review error messages in terminal
3. Check browser console (F12)
4. Verify database file exists

## Credits

Original Flask version converted to Next.js for better offline support and modern development practices.

**Built with:**
- Next.js 15
- TypeScript
- Drizzle ORM
- Tailwind CSS
- better-sqlite3

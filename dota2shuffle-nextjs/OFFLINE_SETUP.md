# Offline Setup Guide - Dota 2 Shuffle (Next.js)

This guide will help you set up and run the Next.js version of Dota 2 Shuffle completely offline using local SQLite storage.

## Prerequisites

- Node.js 18+ installed
- No internet connection required after initial setup

## Quick Start

### 1. Navigate to Project Directory

```bash
cd dota2shuffle-nextjs
```

### 2. Install Dependencies (First Time Only)

If you haven't installed dependencies yet:

```bash
npm install
```

**Note:** This step requires internet connection but only needs to be done once.

### 3. Configure Environment Variables

The `.env.local` file is already created with default settings:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
NEXTAUTH_SECRET=your-secret-key-change-this-to-something-random
NEXTAUTH_URL=http://localhost:3000
```

**Important:** Change `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `NEXTAUTH_SECRET` for security.

### 4. Initialize Database

Create the SQLite database and tables:

```bash
npm run db:push
```

This creates a `dota2shuffle.db` file in the project directory.

### 5. Start the Application

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

## Accessing the Application

### Admin Panel

1. Go to: http://localhost:3000/admin/login
2. Login with credentials from `.env.local` (default: admin / admin123)
3. Create registration links for your events
4. Manage players and shuffle teams

### Player Registration

Players use the registration link created by admins:
- Format: `http://localhost:3000/register/{linkCode}`
- Players can register with their name, MMR, and preferred roles

### Team Shuffling

1. After players register, go to: http://localhost:3000/shuffle/{linkCode}
2. Click "Shuffle Teams" to generate balanced teams
3. The algorithm runs 1000 iterations to find optimal team balance

## LAN Access (Multi-Device on Same Network)

To allow other devices on your local network to access the app:

### 1. Find Your Local IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" address

### 2. Update Environment Variable

Edit `.env.local`:
```env
NEXTAUTH_URL=http://YOUR_IP_ADDRESS:3000
```

Example:
```env
NEXTAUTH_URL=http://192.168.1.100:3000
```

### 3. Start Development Server on Network

```bash
npm run dev -- -H 0.0.0.0
```

### 4. Access from Other Devices

Other devices can now access:
- Main page: `http://YOUR_IP_ADDRESS:3000`
- Admin panel: `http://YOUR_IP_ADDRESS:3000/admin/login`
- Registration: `http://YOUR_IP_ADDRESS:3000/register/{linkCode}`

## Offline Capabilities

This application works **100% offline** after initial setup:

✅ **Fully Functional Offline:**
- Create and manage registration links
- Player registration
- Team shuffling algorithm
- Player masterlist and ban management
- All admin features

✅ **Local Storage:**
- SQLite database (`dota2shuffle.db`) stores all data locally
- No cloud services required
- No external API calls
- Database uses Write-Ahead Logging (WAL) for better performance

✅ **Network Modes:**
- **Standalone:** Run on single computer (localhost only)
- **LAN Mode:** Share across local network for multi-device access
- **No Internet Required:** Works without any internet connection

## Database Management

### View Database

To inspect the database:

```bash
npm run db:studio
```

This opens Drizzle Studio at http://localhost:4983 for visual database management.

### Backup Database

Simply copy the database file:

```bash
# Windows
copy dota2shuffle.db dota2shuffle_backup.db

# Mac/Linux
cp dota2shuffle.db dota2shuffle_backup.db
```

### Restore Database

Replace the current database with backup:

```bash
# Windows
copy dota2shuffle_backup.db dota2shuffle.db

# Mac/Linux
cp dota2shuffle_backup.db dota2shuffle.db
```

### Reset Database

Delete the database file and re-initialize:

```bash
# Windows
del dota2shuffle.db dota2shuffle.db-shm dota2shuffle.db-wal

# Mac/Linux
rm dota2shuffle.db dota2shuffle.db-shm dota2shuffle.db-wal
```

Then run:
```bash
npm run db:push
```

## Production Build (Optional)

For better performance, create a production build:

### 1. Build the Application

```bash
npm run build
```

### 2. Start Production Server

```bash
npm start
```

Production mode is faster and more stable for events.

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
npm run dev -- -p 3001
```

Remember to update `NEXTAUTH_URL` in `.env.local` to match the new port.

### Database Locked Error

If you get "database is locked" errors:
1. Close all connections to the database
2. Stop the dev server (Ctrl+C)
3. Delete `.db-shm` and `.db-wal` files
4. Restart the server

### Can't Access from Other Devices

1. Check firewall settings - allow Node.js
2. Verify devices are on same network
3. Confirm you're using correct IP address
4. Make sure you started server with `-H 0.0.0.0` flag

### Missing Dependencies Error

If you get module not found errors:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Features

### Team Shuffling Algorithm

- **Iterative Balancing:** Runs 1000 iterations to find best team distribution
- **Snake Draft:** Distributes players using snake draft pattern
- **MMR Balancing:** Minimizes variance between team average MMRs
- **Reserve Players:** Automatically handles excess players

### Admin Features

- Create unlimited registration links
- Set player limits and expiration times
- View all registered players
- Manage player status (Present/Absent)
- Player masterlist with ban support
- Shuffle history tracking

### Player Features

- Simple registration form
- MMR input with validation
- Role preference selection
- Duplicate name checking
- Ban status checking

## System Requirements

- **CPU:** Any modern processor
- **RAM:** 2GB minimum, 4GB recommended
- **Storage:** 100MB for application + database
- **OS:** Windows, macOS, or Linux
- **Node.js:** Version 18 or higher

## Data Persistence

All data is stored in the SQLite database file:
- Registration links
- Player registrations
- Team shuffles
- Admin accounts
- Player masterlist
- Shuffle history

**Important:** Back up `dota2shuffle.db` regularly to prevent data loss!

## Security Notes

1. **Change Default Password:** Update `ADMIN_PASSWORD` in `.env.local`
2. **Change Secret Key:** Generate a random string for `NEXTAUTH_SECRET`
3. **Network Access:** Only share on trusted networks
4. **Database Access:** Protect `dota2shuffle.db` file from unauthorized access

## Support

For issues or questions:
- Check this documentation first
- Review error messages in terminal
- Check browser console for client-side errors
- Verify database file exists and has correct permissions

## Differences from Flask Version

This Next.js version offers several improvements:
- Modern React-based UI with better UX
- Type-safe TypeScript codebase
- Better offline support with local SQLite
- No WebSocket dependency (simpler deployment)
- Better performance with React Server Components
- More maintainable code structure

The shuffling algorithm is identical to the Flask version, ensuring same quality team balancing.

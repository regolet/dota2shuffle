# Quick Start - Dota 2 Shuffle (Next.js)

Get up and running in **5 minutes** with complete offline support!

## Prerequisites

- Node.js 18 or higher installed
- Terminal/Command Prompt access

## Installation Steps

### 1. Open Terminal and Navigate to Project

```bash
cd dota2shuffle-nextjs
```

### 2. Install Dependencies

```bash
npm install
```

This downloads all required packages. **Requires internet, but only once!**

### 3. Initialize Database

```bash
npm run db:push
```

This creates the local SQLite database file (`dota2shuffle.db`).

### 4. Start the Application

```bash
npm run dev
```

The server starts at: **http://localhost:3000**

## First Time Setup

### 1. Login as Admin

1. Open browser: http://localhost:3000
2. Click "Admin Panel"
3. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`

### 2. Create Registration Link

1. Fill in event details:
   - **Event Title:** e.g., "Friday Night Dota"
   - **Max Players:** 100 (default)
   - **Description:** Optional event info
   - **Expires In:** Optional (leave blank for no expiration)

2. Click "Create Registration Link"

3. Copy the registration URL

### 3. Share with Players

Give the registration URL to players:
```
http://localhost:3000/register/LINK_CODE_HERE
```

### 4. Players Register

Players fill in:
- Player Name (in-game name)
- MMR (0-15000)
- Preferred Roles (select at least one)

### 5. Shuffle Teams

When ready:
1. Go to admin dashboard
2. Click "View Shuffle" for your event
3. Click "Shuffle Teams"
4. View balanced teams!

## Using on LAN (Multiple Devices)

### Windows

1. Find your IP address:
```bash
ipconfig
```
Look for IPv4 Address (e.g., 192.168.1.100)

2. Edit `.env.local`:
```env
NEXTAUTH_URL=http://192.168.1.100:3000
```

3. Start server for network:
```bash
npm run dev -- -H 0.0.0.0
```

4. Share this URL with players:
```
http://192.168.1.100:3000/register/LINK_CODE
```

### Mac/Linux

1. Find your IP address:
```bash
ifconfig | grep "inet "
```

2. Edit `.env.local`:
```env
NEXTAUTH_URL=http://YOUR_IP:3000
```

3. Start server:
```bash
npm run dev -- -H 0.0.0.0
```

## Important URLs

### Admin Access
- **Login:** http://localhost:3000/admin/login
- **Dashboard:** http://localhost:3000/admin/dashboard

### Player Access
- **Registration:** http://localhost:3000/register/{linkCode}

### Shuffle View
- **Teams:** http://localhost:3000/shuffle/{linkCode}

## Common Commands

```bash
# Start development server
npm run dev

# Start on different port
npm run dev -- -p 3001

# View database (opens GUI)
npm run db:studio

# Build for production
npm run build

# Run production server
npm start
```

## Troubleshooting

### Port 3000 Already in Use

```bash
npm run dev -- -p 3001
```

Remember to update `.env.local` with new port!

### Can't Access from Other Devices

1. Check firewall allows Node.js
2. Verify same WiFi network
3. Start with `-H 0.0.0.0` flag
4. Use correct IP address

### Database Error

Delete and recreate:
```bash
# Windows
del dota2shuffle.db*

# Mac/Linux
rm dota2shuffle.db*

# Then recreate
npm run db:push
```

## Default Settings

### Admin Credentials (.env.local)
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

**⚠️ CHANGE THESE FOR SECURITY!**

### Team Size
- Default: 5 players per team
- Excess players become reserves

### Shuffle Algorithm
- Iterations: 1000
- Algorithm: Snake draft with MMR balancing
- Goal: Minimize team MMR variance

## File Locations

- **Database:** `dota2shuffle.db` (in project root)
- **Config:** `.env.local`
- **Logs:** Terminal output only

## Backup Your Data

Before events, backup the database:

```bash
# Windows
copy dota2shuffle.db backup.db

# Mac/Linux
cp dota2shuffle.db backup.db
```

## Production Mode (Optional)

For better performance:

```bash
# Build
npm run build

# Run
npm start
```

Production is faster and more stable for live events.

## Next Steps

1. ✅ Change admin password in `.env.local`
2. ✅ Test registration with fake player
3. ✅ Test shuffle with 10+ fake players
4. ✅ Configure for LAN if needed
5. ✅ Backup database regularly

## Support

- **Full Setup Guide:** [OFFLINE_SETUP.md](OFFLINE_SETUP.md)
- **Complete Documentation:** [README.md](README.md)
- **Algorithm Details:** See `lib/shuffle.ts`

## Enjoy!

You're ready to run balanced Dota 2 tournaments completely offline! 🎮

**No internet required • LAN ready • 100% local**

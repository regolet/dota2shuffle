# Dota 2 Shuffle - Next.js

A modern, offline-capable web application for creating balanced Dota 2 teams through player registration and automatic team shuffling.

## ✨ Features

### Core Features
- **Player Registration**: Players register with MMR and preferred roles
- **Admin Dashboard**: Create and manage registration links for tournaments/events
- **Team Shuffling**: Automatically create balanced teams based on MMR and roles
- **Tournament Brackets**: Single-elimination bracket system with match tracking
- **Player Masterlist**: Centralized player database with ban management
- **Lobby System**: Party formation and match management
- **100% Offline**: Works completely offline with local SQLite database
- **LAN Support**: Share on local network for multi-device access

### Technical Features
- **TypeScript**: Full type safety throughout the application
- **Next.js 15**: Modern React framework with App Router
- **SQLite**: Local database with Drizzle ORM
- **Secure Authentication**: Bcrypt password hashing
- **Responsive Design**: Works on desktop and mobile devices

---

## 🚀 Quick Start (5 minutes)

```bash
# Install dependencies
npm install

# Initialize database
npm run db:push

# Seed default admin user
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change the default password after first login!

---

## 📖 How to Use

### 1. Admin Login
1. Navigate to [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
2. Login with default credentials
3. You'll be redirected to the admin dashboard

### 2. Create Registration Link
1. On the admin dashboard, click "Create New Registration Link"
2. Fill in:
   - **Title**: Event name (e.g., "Friday Night Dota")
   - **Description**: Event details
   - **Max Players**: Set a limit or leave unlimited
   - **Scheduled Time**: When the event starts
3. Click "Create Link"
4. Copy the registration link and share with players

### 3. Player Registration
Players can:
1. Open the registration link
2. Fill in:
   - Player name
   - MMR (matchmaking rating)
   - Preferred roles (1-2 roles)
3. Click "Register"

### 4. Manage Players
As admin:
1. Click "Manage Players" on the registration link
2. View all registered players
3. Toggle player status (Present/Absent/Reserve)
4. Edit player details or delete players
5. Add players manually if needed

### 5. Shuffle Teams
1. From the players page, click "Shuffle Teams"
2. Adjust number of teams (default: 2)
3. Click "Shuffle Teams" button
4. Teams are automatically balanced by:
   - MMR distribution
   - Role preferences
   - Player availability
5. Share team assignments with players

### 6. Create Tournament Bracket
1. From the shuffle page, click "Create Bracket"
2. Select bracket type:
   - Single Elimination
   - Double Elimination
   - Round Robin
3. Bracket is automatically generated
4. Click matches to set winners
5. Winners advance automatically

---

## 🌐 LAN/Network Access

To access the app from other devices on your local network:

### 1. Find Your Local IP
**Windows:**
```bash
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

**Mac/Linux:**
```bash
ifconfig
# Look for inet address
```

### 2. Start Server
```bash
cd dota2shuffle-nextjs
npm run dev
```

The server will show:
```
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

### 3. Access from Other Devices
Open `http://YOUR_IP:3000` on any device on the same network.

---

## 📊 Database Management

### Initialize Database
```bash
npm run db:push
```
Creates all database tables.

### Seed Admin User
```bash
npm run db:seed
```
Creates/resets the default admin user (admin/admin123).

### View Database
The SQLite database is stored at: `dota2shuffle-nextjs/dota2shuffle.db`

You can view it with tools like:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [DBeaver](https://dbeaver.io/)
- VS Code SQLite extension

---

## 🏗️ Project Structure

```
dota2shuffle-nextjs/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin pages
│   │   ├── login/                # Admin login
│   │   ├── dashboard/            # Admin dashboard
│   │   ├── players/[linkCode]/   # Player management
│   │   ├── bracket/[linkCode]/   # Bracket management
│   │   └── masterlist/           # Player masterlist
│   ├── register/[linkCode]/      # Player registration
│   ├── shuffle/[linkCode]/       # Team shuffling
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin APIs
│   │   ├── register/             # Registration APIs
│   │   └── shuffle/              # Shuffle APIs
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── db/                           # Database
│   ├── schema.ts                 # Database schema
│   └── index.ts                  # Database connection
├── lib/                          # Utilities
│   ├── auth.ts                   # Authentication
│   ├── validators.ts             # Form validation
│   └── shuffle.ts                # Shuffle algorithm
├── scripts/                      # Database scripts
│   ├── init-db.js                # Initialize database
│   └── seed-admin.js             # Seed admin user
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` in the `dota2shuffle-nextjs` directory:

```env
# Not required - admin credentials are now in database
# Run: npm run db:seed to create/reset admin user
```

### Customization

Edit constants in the codebase:

**Team Size** (`lib/shuffle.ts`):
```typescript
const TEAM_SIZE = 5  // Change for different team sizes
```

**Roles** (`lib/validators.ts`):
```typescript
export const DOTA_ROLES = ['Carry', 'Mid', 'Offlane', 'Pos4', 'Pos5']
```

---

## 🔒 Security

### Admin Password Management
1. Default password is `admin123`
2. Stored securely with bcrypt hashing
3. To change password: Use `npm run db:seed` to reset, or create a password change feature

### Session Management
- 24-hour session expiration
- HTTP-only cookies
- Secure cookies in production

### Database Security
- SQL injection protection via parameterized queries (Drizzle ORM)
- Input validation with Zod schemas
- No raw SQL queries

---

## 🐛 Troubleshooting

### Can't access admin dashboard
- Verify you're using correct credentials (admin/admin123)
- Try clearing browser cookies
- Check if database is initialized: `npm run db:push`

### Players can't register
- Check if registration link is active
- Verify max players limit hasn't been reached
- Check if player is banned in masterlist

### Teams won't shuffle
- Ensure at least 10 players are marked "Present"
- Check browser console for errors
- Verify players have valid MMR and roles

### Network access not working
- Verify firewall allows port 3000
- Ensure devices are on same network
- Try disabling VPN

### Database errors
- Delete `dota2shuffle.db` and run `npm run db:push` again
- Check file permissions on database file
- Verify SQLite is properly installed

---

## 🚀 Production Deployment

### Option 1: Local Server (Recommended for LAN events)

```bash
# Build for production
npm run build

# Start production server
npm start
```

Access at `http://YOUR_IP:3000`

### Option 2: Deploy to Cloud

**Vercel** (No database persistence):
```bash
# Note: SQLite won't persist between deploys on Vercel
# Consider using Vercel Postgres or another cloud database
vercel deploy
```

**Self-hosted** (Docker):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📝 Database Schema

### Tables

- **admins**: Admin users with hashed passwords
- **registration_links**: Event registration links
- **players**: Registered players for events
- **player_masterlist**: Persistent player database across events
- **teams**: Shuffled teams
- **brackets**: Tournament brackets
- **matches**: Bracket matches
- **lobbies**: Game lobbies
- **shuffle_history**: History of all shuffles

See `db/schema.ts` for complete schema definition.

---

## 🎯 Common Workflows

### Casual Game Night
1. Create registration link
2. Players register throughout the day
3. Mark absent players before game time
4. Shuffle teams
5. Play!

### Tournament
1. Create registration link with max players
2. Close registration when full
3. Shuffle teams or use existing teams
4. Create bracket
5. Run matches and declare winners

### Party-Based Tournament
1. Create lobby
2. Players form parties (5 each)
3. Create bracket from ready parties
4. Run tournament

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 💡 Tips

1. **Backup Database**: Regularly copy `dota2shuffle.db`
2. **Use Masterlist**: Add regular players to avoid MMR sandbagging
3. **Ban Management**: Use ban feature for problematic players
4. **Network Setup**: For LAN events, use a dedicated router
5. **Testing**: Test the full workflow before your event

---

## 📚 Additional Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and changes
- [dota2shuffle-nextjs/README.md](dota2shuffle-nextjs/README.md) - Technical documentation

---

**Made with ❤️ for the Dota 2 community**

Need help? Check the troubleshooting section or open an issue on GitHub.

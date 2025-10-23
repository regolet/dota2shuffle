# Changelog - Dota 2 Shuffle

All notable changes to this project will be documented in this file.

## [3.0.0] - 2025-10-16

### 🚀 Major Migration: Flask to Next.js

#### Complete Rewrite
- **Migrated**: Entire application from Python/Flask to TypeScript/Next.js
- **New Stack**: Next.js 15, React 18, TypeScript, SQLite with Drizzle ORM
- **Database**: Local SQLite database with full offline support
- **100% Offline**: Works completely without internet connection
- **LAN Support**: Full network access for local events

#### New Features
- **Modern UI**: Built with Tailwind CSS and modern React patterns
- **Type Safety**: Full TypeScript coverage across the entire codebase
- **Database-Driven Auth**: Admin credentials stored in SQLite with bcrypt hashing
- **Seed Scripts**: Easy admin user seeding with `npm run db:seed`
- **Better Dev Experience**: Hot reload, TypeScript errors, better debugging

### 🔒 Security Improvements

#### Database Authentication
- **Changed**: Admin credentials now stored in SQLite database
- **Removed**: Hardcoded environment variable fallback
- **Added**: Bcrypt password hashing for all admin users
- **Added**: Seed script to create/reset admin users
- **Default Credentials**: admin/admin123 (changeable via database)

#### Session Management
- **Added**: 24-hour session expiration
- **Added**: HTTP-only cookies
- **Added**: Secure cookie flags for production
- **Enhanced**: CSRF protection with Next.js middleware

### 🎯 Core Features (Preserved)

All original features have been ported to Next.js:
- ✅ Player registration system
- ✅ Admin dashboard
- ✅ Team shuffling algorithm with MMR balancing
- ✅ Tournament bracket system (Single/Double elimination)
- ✅ Player masterlist with ban functionality
- ✅ Lobby system for party formation
- ✅ Real-time status updates (API-based)

### 📊 Database Schema

#### New Tables
- **admins**: Admin users with hashed passwords
- **registration_links**: Event registration links
- **players**: Registered players per event
- **player_masterlist**: Cross-event player database
- **teams**: Shuffled team assignments
- **brackets**: Tournament brackets
- **matches**: Bracket match results
- **lobbies**: Game lobby management
- **shuffle_history**: Historical shuffle records

### 🛠️ Developer Experience

#### New Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Initialize database
- `npm run db:seed` - Seed admin user

#### Project Structure
```
dota2shuffle-nextjs/
├── app/           # Next.js App Router pages
├── db/            # Database schema and connection
├── lib/           # Utilities and algorithms
├── scripts/       # Database scripts
└── public/        # Static assets
```

### 🗑️ Removed

#### Flask Application
- **Removed**: Entire Flask/Python application
- **Removed**: Flask templates and static files
- **Removed**: Python dependencies
- **Removed**: Flask-specific deployment configs
- **Removed**: Outdated documentation files

#### Deprecated Documentation
- Removed: QUICKSTART.md (Flask-specific)
- Removed: DEPLOYMENT_GUIDE.md (Flask-specific)
- Removed: REFACTORING_GUIDE.md (outdated)
- Removed: TESTING_GUIDE.md (outdated)
- Removed: VERCEL_CONVERSION_GUIDE.md (superseded)
- Removed: UPGRADE_GUIDE.md (Flask-specific)
- Removed: PROJECT_ORGANIZATION.md (outdated)
- Removed: OFFLINE_GUIDE.md (merged into README)
- Removed: NEXTJS_COMPLETION_SUMMARY.md (internal doc)

### 📝 Documentation

#### Updated
- **README.md**: Complete rewrite for Next.js-only project
- **CHANGELOG.md**: Updated with migration details

#### Consolidated
- All setup instructions now in main README
- LAN/offline setup integrated into main docs
- Troubleshooting guide included in README

### 🔄 Migration from Flask

If you were using the Flask version:
1. This is a complete rewrite - no automatic migration path
2. Database schemas are different (but similar structure)
3. All features have been ported and improved
4. New stack: TypeScript instead of Python
5. Better offline and LAN support

### 🎯 Usage Changes

#### Admin Login
**Before (Flask)**:
- Credentials in environment variables
- Login at `/admin/login`

**After (Next.js)**:
- Credentials in SQLite database
- Login at `/admin/login`
- Run `npm run db:seed` to create/reset admin

#### Running the App
**Before (Flask)**:
```bash
pip install -r requirements.txt
python app.py
```

**After (Next.js)**:
```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

### 🚀 Deployment

#### Local/LAN (Recommended)
```bash
npm run build
npm start
```
Access at `http://YOUR_IP:3000`

#### Cloud Deployment
- Vercel: Requires database adaptation (no SQLite persistence)
- Self-hosted: Use Docker or PM2
- See README for detailed instructions

---

## [2.0.0] - 2025-10-11

### Flask Version (Deprecated)
This version contained the Flask application which has now been replaced with Next.js.

For historical reference:
- Security enhancements (password hashing, CSRF)
- Configuration management system
- Performance improvements (caching)
- Sentry integration
- Enhanced logging

---

## Support

For issues, questions, or contributions:
- Report bugs via GitHub Issues
- Read documentation: README.md
- Check Next.js app: dota2shuffle-nextjs/

---

**Current Version**: 3.0.0
**Release Date**: 2025-10-16
**Status**: Stable
**Stack**: Next.js 15, TypeScript, SQLite, React 18
**Compatibility**: Node.js 18+

# Logging Guide

## Overview

This application now includes comprehensive logging for monitoring, debugging, and security auditing.

## Log Files

Logs are stored in the `logs/` directory (automatically created on first run):

- **`logs/dota2shuffle.log`** - General application logs (INFO level and above)
- **`logs/errors.log`** - Error logs only (ERROR level and above)

Both log files use rotation with a maximum size of 10MB and keep up to 10 backup files.

## Log Levels

- **DEBUG** - Detailed information (only in debug mode)
- **INFO** - General informational messages
- **WARNING** - Warning messages (potential issues)
- **ERROR** - Error messages (actual problems)

## What Gets Logged

### Security Events
- Admin login attempts (successful and failed)
- Admin logout events
- Invalid registration link attempts
- Invalid winner selections in brackets

### Player Activities
- Player registration attempts
- Successful registrations (with MMR and event details)
- Registration failures

### Admin Actions
- Registration link creation
- Bracket creation and deletion
- Match winner declarations
- Tournament champion declarations

### Team Shuffling
- Shuffle requests
- Insufficient player warnings
- Successful shuffle operations with player counts

## Log Format

```
YYYY-MM-DD HH:MM:SS LEVEL: Message [in /path/to/file.py:line_number]
```

Example:
```
2025-10-01 14:23:15 INFO: Player registered successfully - Name: ProPlayer123, MMR: 5500, Event: Weekly Tournament [in c:\Users\admin\git repo\dota2shuffle\app.py:267]
```

## Development vs Production

### Debug Mode (Development)
- Logs output to console
- Debug level messages included
- More verbose output

### Production Mode
- Logs output to files only
- INFO level and above
- Cleaner, production-ready logging

## Monitoring Recommendations

1. **Security Monitoring**
   - Watch for repeated failed admin login attempts
   - Monitor invalid registration link attempts

2. **Operational Monitoring**
   - Track registration patterns
   - Monitor shuffle operation success rates
   - Check for bracket creation failures

3. **Performance Monitoring**
   - Review log file sizes
   - Monitor for excessive error rates

## Log Rotation

Log files automatically rotate when they reach 10MB. The system keeps 10 backup files:
- `dota2shuffle.log`
- `dota2shuffle.log.1`
- `dota2shuffle.log.2`
- ... up to `dota2shuffle.log.10`

## Privacy Considerations

Logs contain:
- Player names
- Admin usernames
- Event titles
- MMR values

**DO NOT log:**
- Passwords
- Session tokens
- Personal identifiable information beyond usernames

Ensure logs are protected with appropriate file permissions in production environments.

const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'dota2shuffle.db')
const db = new Database(dbPath)

try {
  // Check if column already exists
  const columns = db.prepare("PRAGMA table_info(teams)").all()
  const hasColumn = columns.some(col => col.name === 'shuffle_history_id')

  if (hasColumn) {
    console.log('Column shuffle_history_id already exists in teams table')
  } else {
    // Add the column
    db.prepare('ALTER TABLE teams ADD COLUMN shuffle_history_id TEXT REFERENCES shuffle_history(id)').run()
    console.log('✓ Successfully added shuffle_history_id column to teams table')
  }
} catch (error) {
  console.error('Error adding column:', error.message)
} finally {
  db.close()
}

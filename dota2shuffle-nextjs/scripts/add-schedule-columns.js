const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dota2shuffle.db');
const db = new Database(dbPath);

console.log('Adding scheduling columns to registration_links table...');

try {
  // Check if columns already exist
  const tableInfo = db.pragma('table_info(registration_links)');
  const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
  const hasScheduledTime = tableInfo.some(col => col.name === 'scheduled_time');

  if (hasUpdatedAt && hasScheduledTime) {
    console.log('✓ Columns already exist');
  } else {
    // Add the columns
    if (!hasUpdatedAt) {
      db.exec('ALTER TABLE registration_links ADD COLUMN updated_at INTEGER;');
      console.log('✓ updated_at column added');
    }

    if (!hasScheduledTime) {
      db.exec('ALTER TABLE registration_links ADD COLUMN scheduled_time INTEGER;');
      console.log('✓ scheduled_time column added');
    }

    console.log('✓ Scheduling columns added successfully!');
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

db.close();

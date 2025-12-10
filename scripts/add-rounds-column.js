const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dota2shuffle.db');
const db = new Database(dbPath);

console.log('Adding rounds column to brackets table...');

try {
  // Check if column already exists
  const tableInfo = db.pragma('table_info(brackets)');
  const hasRoundsColumn = tableInfo.some(col => col.name === 'rounds');

  if (hasRoundsColumn) {
    console.log('✓ rounds column already exists');
  } else {
    // Add the rounds column
    db.exec('ALTER TABLE brackets ADD COLUMN rounds TEXT;');
    console.log('✓ rounds column added successfully!');
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

db.close();

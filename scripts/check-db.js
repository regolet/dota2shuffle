const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dota2shuffle.db');
const db = new Database(dbPath);

console.log('Checking database tables...\n');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

console.log('Tables found:', tables.length);
tables.forEach(table => {
  console.log('  -', table.name);
});

db.close();

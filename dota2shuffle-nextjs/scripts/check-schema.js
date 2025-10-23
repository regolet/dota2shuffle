const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dota2shuffle.db');
const db = new Database(dbPath);

console.log('Checking registration_links table schema...\n');

const tableInfo = db.pragma('table_info(registration_links)');
console.log('Columns:');
tableInfo.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

db.close();

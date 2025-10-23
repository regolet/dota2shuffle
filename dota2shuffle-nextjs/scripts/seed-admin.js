const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const { createId } = require('@paralleldrive/cuid2');

const dbPath = path.join(__dirname, '..', 'dota2shuffle.db');
const db = new Database(dbPath);

console.log('Seeding default admin user...');

// Default admin credentials
const username = 'admin';
const password = 'admin123';

try {
  // Check if admin already exists
  const existingAdmin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  if (existingAdmin) {
    console.log('⚠ Admin user already exists. Updating password...');

    // Hash the password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Update existing admin
    db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(passwordHash, username);

    console.log('✓ Admin password updated successfully!');
  } else {
    console.log('Creating new admin user...');

    // Hash the password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create new admin
    const id = createId();
    const createdAt = Date.now();

    db.prepare(`
      INSERT INTO admins (id, username, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, username, passwordHash, createdAt);

    console.log('✓ Default admin user created successfully!');
  }

  console.log('');
  console.log('Default admin credentials:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('');
  console.log('⚠ IMPORTANT: Change the default password after first login!');

} catch (error) {
  console.error('Error seeding admin:', error);
  process.exit(1);
} finally {
  db.close();
}

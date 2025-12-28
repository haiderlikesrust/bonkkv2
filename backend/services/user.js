import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * User Service
 * SQLite database storage
 */
class UserService {
  constructor() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'users.db');
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  initDatabase() {
    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        wallet_address TEXT,
        wallet_private_key TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Add wallet_private_key column if it doesn't exist (migration for existing databases)
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN wallet_private_key TEXT`);
    } catch (error) {
      // Column already exists, ignore error
      if (!error.message.includes('duplicate column name')) {
        console.error('Error adding wallet_private_key column:', error);
      }
    }

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_wallet_address ON users(wallet_address);
    `);
  }

  /**
   * Create a new user
   */
  async createUser(email, hashedPassword, walletAddress = null) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password, wallet_address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(email.toLowerCase(), hashedPassword, walletAddress, now, now);
      return {
        id: result.lastInsertRowid.toString(),
        email: email.toLowerCase(),
        walletAddress,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email.toLowerCase());
    
    if (!row) return null;

    return {
      id: row.id.toString(),
      email: row.email,
      password: row.password,
      walletAddress: row.wallet_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(parseInt(id));
    
    if (!row) return null;

    return {
      id: row.id.toString(),
      email: row.email,
      password: row.password,
      walletAddress: row.wallet_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update user
   */
  async updateUser(id, updates) {
    const setParts = [];
    const values = [];

    if (updates.walletAddress !== undefined) {
      setParts.push('wallet_address = ?');
      values.push(updates.walletAddress);
    }

    if (setParts.length === 0) {
      return this.findById(id);
    }

    values.push(new Date().toISOString()); // updated_at
    values.push(parseInt(id));

    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${setParts.join(', ')}, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  /**
   * Encrypt private key using AES-256-GCM
   */
  encryptPrivateKey(privateKey, secretKey) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt private key using AES-256-GCM
   */
  decryptPrivateKey(encryptedPrivateKey, secretKey) {
    const algorithm = 'aes-256-gcm';
    const [ivHex, authTagHex, encrypted] = encryptedPrivateKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Update user's wallet address and store encrypted private key
   */
  async updateWallet(id, walletAddress, privateKey = null, encryptionKey = null) {
    const now = new Date().toISOString();
    const setParts = ['wallet_address = ?'];
    const values = [walletAddress];

    if (privateKey && encryptionKey) {
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey, encryptionKey);
      setParts.push('wallet_private_key = ?');
      values.push(encryptedPrivateKey);
    }

    setParts.push('updated_at = ?');
    values.push(now);
    values.push(parseInt(id));

    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${setParts.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  /**
   * Get user's decrypted private key
   */
  async getUserPrivateKey(userId, encryptionKey) {
    const stmt = this.db.prepare('SELECT wallet_private_key FROM users WHERE id = ?');
    const row = stmt.get(parseInt(userId));
    
    if (!row || !row.wallet_private_key) {
      return null;
    }

    try {
      return this.decryptPrivateKey(row.wallet_private_key, encryptionKey);
    } catch (error) {
      console.error('Error decrypting private key:', error);
      return null;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email) {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
    const result = stmt.get(email.toLowerCase());
    return result.count > 0;
  }
}

export default new UserService();

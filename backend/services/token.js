import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Token Service
 * SQLite database storage for tokens created on our platform
 */
class TokenService {
  constructor() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'tokens.db');
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  initDatabase() {
    // Create tokens table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        metadata_uri TEXT,
        creator_user_id INTEGER NOT NULL,
        creator_wallet TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        market_cap REAL DEFAULT 0,
        progress REAL DEFAULT 0,
        twitter TEXT,
        telegram TEXT,
        website TEXT,
        fee_distribution TEXT
      )
    `);

    // Add fee_distribution column if it doesn't exist (migration for existing databases)
    try {
      this.db.exec(`ALTER TABLE tokens ADD COLUMN fee_distribution TEXT`);
      console.log('Added fee_distribution column to tokens table');
    } catch (error) {
      // Column already exists, ignore error
      if (!error.message.includes('duplicate column name')) {
        console.error('Error adding fee_distribution column:', error);
      }
    }

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mint ON tokens(mint);
      CREATE INDEX IF NOT EXISTS idx_creator_user_id ON tokens(creator_user_id);
      CREATE INDEX IF NOT EXISTS idx_created_at ON tokens(created_at);
    `);
  }

  /**
   * Create a new token
   */
  async createToken(tokenData) {
    const {
      mint,
      name,
      symbol,
      description,
      imageUrl,
      metadataUri,
      creatorUserId,
      creatorWallet,
      twitter,
      telegram,
      website,
    } = tokenData;

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO tokens (
        mint, name, symbol, description, image_url, metadata_uri,
        creator_user_id, creator_wallet, created_at, updated_at,
        twitter, telegram, website, fee_distribution
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      // Default fee distribution: 100% dev (can be changed later via fee distribution editor)
      const defaultFeeDistribution = JSON.stringify({
        holders: 0,
        dev: 100,
        flywheel: 0,
        supportPonk: 0,
      });

      const result = stmt.run(
        mint,
        name,
        symbol,
        description || null,
        imageUrl || null,
        metadataUri || null,
        creatorUserId,
        creatorWallet,
        now,
        now,
        twitter || null,
        telegram || null,
        website || null,
        defaultFeeDistribution
      );

      const insertedId = result.lastInsertRowid;
      console.log(`Token inserted with ID: ${insertedId}, mint: ${mint}`);
      return this.findById(insertedId);
    } catch (error) {
      console.error('Error in createToken:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Token with this mint address already exists');
      }
      throw error;
    }
  }

  /**
   * Find token by mint address
   */
  async findByMint(mint) {
    const stmt = this.db.prepare('SELECT * FROM tokens WHERE mint = ?');
    const row = stmt.get(mint);
    
    if (!row) return null;

    return this.mapRowToToken(row);
  }

  /**
   * Find token by ID
   */
  async findById(id) {
    const stmt = this.db.prepare('SELECT * FROM tokens WHERE id = ?');
    const row = stmt.get(parseInt(id));
    
    if (!row) return null;

    return this.mapRowToToken(row);
  }

  /**
   * Get all tokens (newest first)
   */
  async getAllTokens(limit = 50, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM tokens 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset);
    return rows.map(row => this.mapRowToToken(row));
  }

  /**
   * Get tokens by creator user ID
   */
  async getTokensByCreator(userId) {
    const userIdInt = parseInt(userId);
    console.log(`[TokenService] getTokensByCreator called with userId: ${userIdInt} (type: ${typeof userIdInt})`);
    
    const stmt = this.db.prepare(`
      SELECT * FROM tokens 
      WHERE creator_user_id = ? 
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userIdInt);
    console.log(`[TokenService] Found ${rows.length} tokens for user ${userIdInt}`);
    if (rows.length > 0) {
      console.log(`[TokenService] Sample token creator_user_id: ${rows[0].creator_user_id} (type: ${typeof rows[0].creator_user_id})`);
    }
    return rows.map(row => this.mapRowToToken(row));
  }

  /**
   * Update token (e.g., market cap, progress, fee distribution)
   */
  async updateToken(mint, updates) {
    const setParts = [];
    const values = [];

    if (updates.marketCap !== undefined) {
      setParts.push('market_cap = ?');
      values.push(updates.marketCap);
    }

    if (updates.progress !== undefined) {
      setParts.push('progress = ?');
      values.push(updates.progress);
    }

    if (updates.feeDistribution !== undefined) {
      setParts.push('fee_distribution = ?');
      values.push(JSON.stringify(updates.feeDistribution));
    }

    if (updates.imageUrl !== undefined) {
      setParts.push('image_url = ?');
      values.push(updates.imageUrl);
    }

    if (setParts.length === 0) {
      return this.findByMint(mint);
    }

    values.push(new Date().toISOString()); // updated_at
    values.push(mint);

    const stmt = this.db.prepare(`
      UPDATE tokens 
      SET ${setParts.join(', ')}, updated_at = ?
      WHERE mint = ?
    `);

    stmt.run(...values);
    return this.findByMint(mint);
  }

  /**
   * Map database row to token object
   */
  mapRowToToken(row) {
    // Safely parse created_at date
    let createdAt;
    try {
      createdAt = new Date(row.created_at);
      // Check if date is valid
      if (isNaN(createdAt.getTime())) {
        console.warn(`Invalid date for token ${row.id}: ${row.created_at}, using current date`);
        createdAt = new Date();
      }
    } catch (error) {
      console.warn(`Error parsing date for token ${row.id}: ${row.created_at}, using current date`);
      createdAt = new Date();
    }

    const now = new Date();
    const diffMs = now - createdAt;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let timeAgo;
    if (diffDays > 0) {
      timeAgo = `${diffDays}d ago`;
    } else if (diffHours > 0) {
      timeAgo = `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      timeAgo = `${diffMinutes}m ago`;
    }

    return {
      id: row.id.toString(),
      mint: row.mint,
      name: row.name,
      symbol: row.symbol,
      description: row.description,
      imageUrl: row.image_url,
      metadataUri: row.metadata_uri,
      creatorUserId: row.creator_user_id.toString(),
      creatorWallet: row.creator_wallet,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      marketCap: row.market_cap || 0,
      progress: row.progress || 0,
      twitter: row.twitter,
      telegram: row.telegram,
      website: row.website,
      feeDistribution: row.fee_distribution ? (typeof row.fee_distribution === 'string' ? JSON.parse(row.fee_distribution) : row.fee_distribution) : { holders: 50, dev: 50, flywheel: 0, supportBonkv2: 0 },
      createdAtDisplay: timeAgo,
    };
  }
}

export default new TokenService();


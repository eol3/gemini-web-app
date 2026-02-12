// Importing from CDN. 
// Note: This relies on the CDN hosting the WASM file correctly relative to the MJS file.
import sqlite3InitModule from 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.1-build1/sqlite-wasm/jswasm/sqlite3.mjs';
import { FileService } from './services/FileService.js';

let db = null;

const initPromise = (async () => {
  try {
    console.log('Initializing SQLite...');
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });

    console.log('SQLite loaded. support:', sqlite3.capi.sqlite3_libversion());
    console.log('Context:', {
      crossOriginIsolated: self.crossOriginIsolated,
      isSecureContext: self.isSecureContext,
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
    });

    if (sqlite3.opfs) {
      db = new sqlite3.opfs.OpfsDb('/note-data.sqlite3', 'c');
      console.log('✅ OPFS Database opened.');
    } else {
      console.warn('⚠️ OPFS not available, falling back to transient in-memory db.');
      if (!self.crossOriginIsolated) {
        console.warn('Reason: Page is NOT crossOriginIsolated. COOP/COEP headers missing?');
      }
      db = new sqlite3.oo1.DB('/note-data.sqlite3', 'c');
    }

    db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                category_id INTEGER,
                created_at INTEGER,
                updated_at INTEGER,
                FOREIGN KEY(category_id) REFERENCES categories(id)
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);
    console.log('Tables initialized.');
    return db;
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
})();

export const getDB = async () => {
  if (!db) await initPromise;
  return db;
};

// --- API Helpers ---

// Categories
export async function getCategories() {
  const db = await getDB();
  return db.exec({
    sql: 'SELECT * FROM categories ORDER BY sort_order ASC',
    returnValue: 'resultRows',
    rowMode: 'object'
  });
}

export async function addCategory(name) {
  const db = await getDB();
  db.exec({
    sql: 'INSERT INTO categories (name) VALUES (?)',
    bind: [name]
  });
}

export async function updateCategory(id, name) {
  const db = await getDB();
  db.exec({
    sql: 'UPDATE categories SET name = ? WHERE id = ?',
    bind: [name, id]
  });
}

export async function deleteCategory(id) {
  const db = await getDB();
  db.exec({
    sql: 'DELETE FROM categories WHERE id = ?',
    bind: [id]
  });
  // Optional: Reset category_id of notes in this category to null or default
  db.exec({
    sql: 'UPDATE notes SET category_id = NULL WHERE category_id = ?',
    bind: [id]
  });
}

// Notes
export async function getNotes(categoryId = null) {
  const db = await getDB();
  let sql = 'SELECT * FROM notes';
  let bind = [];
  if (categoryId) {
    sql += ' WHERE category_id = ?';
    bind.push(categoryId);
  }
  sql += ' ORDER BY updated_at DESC';

  return db.exec({
    sql,
    bind,
    returnValue: 'resultRows',
    rowMode: 'object'
  });
}

export async function getNote(id) {
  const db = await getDB();
  const rows = db.exec({
    sql: 'SELECT * FROM notes WHERE id = ?',
    bind: [id],
    returnValue: 'resultRows',
    rowMode: 'object'
  });
  const note = rows[0];
  if (note) {
    // Retrieve content from FileSystem (Reference Implementation)
    // We trust the file system as source of truth for body content
    try {
      const content = await FileService.read(`${note.id}.txt`);
      if (content !== null && content !== undefined) {
        note.content = content;
      }
    } catch (e) {
      console.warn(`File for note ${id} not found or readable, using DB fallback.`);
    }
  }
  return note;
}

export async function saveNote(note) {
  // note: { id, title, content, category_id }
  const db = await getDB();
  const now = Date.now();
  let noteId = note.id;

  // 1. Save to SQLite (Metadata + Content Cache)
  if (note.id) {
    db.exec({
      sql: `UPDATE notes SET 
                    title = ?, 
                    content = ?, 
                    category_id = ?, 
                    updated_at = ? 
                  WHERE id = ?`,
      bind: [note.title, note.content, note.category_id, now, note.id]
    });
  } else {
    db.exec({
      sql: `INSERT INTO notes (title, content, category_id, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?)`,
      bind: [note.title, note.content, note.category_id, now, now]
    });
    const rows = db.exec({
      sql: 'SELECT last_insert_rowid() as id',
      returnValue: 'resultRows',
      rowMode: 'object'
    });
    noteId = rows[0].id;
  }

  // 2. Save to OPFS File (Content)
  try {
    await FileService.save(`${noteId}.txt`, note.content || '');
  } catch (e) {
    console.error('Failed to write to OPFS file:', e);
    // We don't fail the whole operation since DB save succeeded
  }

  return noteId;
}

export async function deleteNote(id) {
  const db = await getDB();
  db.exec({
    sql: 'DELETE FROM notes WHERE id = ?',
    bind: [id]
  });

  try {
    await FileService.delete(`${id}.txt`);
  } catch (e) {
    console.warn('Failed to delete OPFS file:', e);
  }
}

// Settings
export async function getSetting(key) {
  const db = await getDB();
  const result = db.exec({
    sql: 'SELECT value FROM settings WHERE key = ?',
    bind: [key],
    returnValue: 'resultRows',
    rowMode: 'object'
  });
  return result[0]?.value;
}

export async function saveSetting(key, value) {
  const db = await getDB();
  db.exec({
    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    bind: [key, value]
  });
}

import { FileService } from './services/FileService.js';
import { sqlite3Worker1Promiser } from 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.1-build1/sqlite-wasm/jswasm/sqlite3-worker1-promiser.mjs';

let promiser = null;

const initPromise = new Promise((resolve, reject) => {
  try {
    console.log('Initializing SQLite Worker...');
    const _promiser = sqlite3Worker1Promiser({
      onready: () => {
        console.log('SQLite Worker Ready.');
        resolve(_promiser);
      },
      worker: () => {
        // Explicitly load the worker from the same CDN version
        const url = 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.1-build1/sqlite-wasm/jswasm/sqlite3-worker1.js';
        return new Worker(url, { type: 'module' });
      }
    });
    promiser = _promiser;
  } catch (e) {
    console.error('Failed to init promiser:', e);
    reject(e);
  }
}).then(async (p) => {
  try {
    // Open DB in OPFS
    // Note: 'opfs' VFS availability depends on the worker environment.
    // In a worker, it uses SyncAccessHandle if available (fast), or fallbacks if implemented.
    // sqlite3-worker1 generally prefers opfs if supported.

    const openResponse = await p('open', {
      filename: 'note-data.sqlite3',
      vfs: 'opfs'
    });
    console.log('✅ OPFS Database opened via Worker:', openResponse);

    // Initialize Tables
    await p('exec', {
      sql: `
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
        `
    });
    console.log('Tables initialized.');
    return p;
  } catch (err) {
    console.error('Failed to open/init DB in worker:', err);
    throw err;
  }
});

export const getDB = async () => {
  if (!promiser) await initPromise;
  return promiser; // Returns the promiser function, not a direct DB object
};

export const isPersistenceAvailable = async () => {
  // If we successfully initialized the worker with OPFS, persistence is available.
  try {
    await getDB();
    return true;
  } catch (e) {
    return false;
  }
};

export const getPersistenceMode = async () => {
  // If we successfully initialized the worker with OPFS, we are in 'opfs' mode.
  // Error handling in initPromise acts as the check.
  try {
    await getDB();
    return 'opfs';
  } catch (e) {
    return 'error';
  }
};

// --- API Helpers ---

// Categories
export async function getCategories() {
  const p = await getDB();
  const res = await p('exec', {
    sql: 'SELECT * FROM categories ORDER BY sort_order ASC',
    resultRows: [],
    rowMode: 'object'
  });
  return res.result.resultRows;
}

export async function addCategory(name) {
  const p = await getDB();
  await p('exec', {
    sql: 'INSERT INTO categories (name) VALUES (?)',
    bind: [name]
  });
}

export async function updateCategory(id, name) {
  const p = await getDB();
  await p('exec', {
    sql: 'UPDATE categories SET name = ? WHERE id = ?',
    bind: [name, id]
  });
}

export async function deleteCategory(id) {
  const p = await getDB();
  await p('exec', {
    sql: 'DELETE FROM categories WHERE id = ?',
    bind: [id]
  });
  // Reset category_id
  await p('exec', {
    sql: 'UPDATE notes SET category_id = NULL WHERE category_id = ?',
    bind: [id]
  });
}

// Notes
export async function getNotes(categoryId = null) {
  const p = await getDB();
  let sql = 'SELECT * FROM notes';
  let bind = [];
  if (categoryId) {
    sql += ' WHERE category_id = ?';
    bind.push(categoryId);
  }
  sql += ' ORDER BY updated_at DESC';

  const res = await p('exec', {
    sql,
    bind,
    resultRows: [],
    rowMode: 'object'
  });
  return res.result.resultRows;
}

export async function getNote(id) {
  const p = await getDB();
  const res = await p('exec', {
    sql: 'SELECT * FROM notes WHERE id = ?',
    bind: [id],
    resultRows: [],
    rowMode: 'object'
  });

  const note = res.result.resultRows[0];
  if (note) {
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
  const p = await getDB();
  const now = Date.now();
  let noteId = note.id;

  // 1. Save to SQLite
  if (note.id) {
    await p('exec', {
      sql: `UPDATE notes SET 
                    title = ?, 
                    content = ?, 
                    category_id = ?, 
                    updated_at = ? 
                  WHERE id = ?`,
      bind: [note.title, note.content, note.category_id, now, note.id]
    });
  } else {
    await p('exec', {
      sql: `INSERT INTO notes (title, content, category_id, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?)`,
      bind: [note.title, note.content, note.category_id, now, now]
    });

    // Get last ID
    const res = await p('exec', {
      sql: 'SELECT last_insert_rowid() as id',
      resultRows: [],
      rowMode: 'object'
    });
    noteId = res.result.resultRows[0].id;
  }

  // 2. Save to OPFS File (Content)
  try {
    await FileService.save(`${noteId}.txt`, note.content || '');
  } catch (e) {
    console.error('Failed to write to OPFS file:', e);
  }

  return noteId;
}

export async function deleteNote(id) {
  const p = await getDB();
  await p('exec', {
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
  const p = await getDB();
  const res = await p('exec', {
    sql: 'SELECT value FROM settings WHERE key = ?',
    bind: [key],
    resultRows: [],
    rowMode: 'object'
  });
  return res.result.resultRows[0]?.value;
}

export async function saveSetting(key, value) {
  const p = await getDB();
  await p('exec', {
    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    bind: [key, value]
  });
}

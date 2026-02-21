import { fs } from './FileService.js';

export let db = null;

const fileName = 'data.sql';

export async function initDataBase() {
  try {
    // Initialize SQL.js
    const SQL = await initSqlJs({
      locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`
    });

    if (await fs.exists(fileName)) {
      const dbBuffer = await fs.readFile(fileName, 'binary');
      db = new SQL.Database(dbBuffer);
    } else {
      db = new SQL.Database();
      initTables();
      saveDB()
    }

  } catch (e) {
    alert(e.message);
  }
}

export async function saveDB() {
  try {
    const data = db.export();
    await fs.writeFile(fileName, data);
    return true;
  } catch (e) {
    console.error('❌ Could not save to OPFS:', e.message);
    return false;
  }
}

function initTables() {
  db.run(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            category_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

  db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT
        )
    `);

  db.run(`
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            file_data BLOB NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        )
    `);

  // Insert default "Uncategorized" category
  db.run(`
        INSERT OR IGNORE INTO categories (id, name, color) 
        VALUES (0, '未分類', '#9e9e9e')
    `);
}

export function getAllNotes() {
  const result = db.exec(`
        SELECT n.*, c.name as category_name 
        FROM notes n 
        LEFT JOIN categories c ON n.category_id = c.id 
        ORDER BY n.updated_at DESC
    `);

  if (result.length === 0) return [];

  return result[0].values.map(row => ({
    id: row[0],
    title: row[1],
    content: row[2],
    category_id: row[3],
    created_at: row[4],
    updated_at: row[5],
    category_name: row[6]
  }));
}

export function getNote(id) {
  const stmt = db.prepare(`
       SELECT n.*, c.name as category_name 
        FROM notes n 
        LEFT JOIN categories c ON n.category_id = c.id 
        WHERE n.id = $id
    `);
  return stmt.getAsObject({ $id: id });
}

export async function createNote(title, content, category_id) {
  db.run(`
      INSERT INTO notes (title, content, category_id)
      VALUES (?, ?, ?)
  `, [title, content, category_id]);
  await saveDB();
}
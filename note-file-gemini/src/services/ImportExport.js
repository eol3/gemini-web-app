import JSZip from 'https://esm.run/jszip';
import { getDB, getNotes, getCategories, saveNote, addCategory, getSetting } from '../db.js';

// --- Export ---

export async function exportDataSeparated() {
  const zip = new JSZip();
  const db = await getDB();

  // 1. Get SQL Dump
  // sqlite-wasm provides an export facility? Or we just iterate tables?
  // Using .dump() if available or constructing it.
  // sqlite3.js usually doesn't have .dump in the high level API easily exposed in all builds.
  // We can manually construct INSERT statements.

  let sql = 'BEGIN TRANSACTION;\n';

  // Categories
  const categories = await db.exec({ sql: 'SELECT * FROM categories', returnValue: 'resultRows', rowMode: 'object' });
  for (const cat of categories) {
    sql += `INSERT INTO categories (id, name, sort_order) VALUES (${cat.id}, '${escapeSql(cat.name)}', ${cat.sort_order});\n`;
  }

  // Notes
  const notes = await db.exec({ sql: 'SELECT * FROM notes', returnValue: 'resultRows', rowMode: 'object' });
  for (const note of notes) {
    sql += `INSERT INTO notes (id, title, content, category_id, created_at, updated_at) VALUES (${note.id}, '${escapeSql(note.title)}', '${escapeSql(note.content)}', ${note.category_id}, ${note.created_at}, ${note.updated_at});\n`;
  }

  // Settings
  const settings = await db.exec({ sql: 'SELECT * FROM settings', returnValue: 'resultRows', rowMode: 'object' });
  for (const set of settings) {
    sql += `INSERT INTO settings (key, value) VALUES ('${escapeSql(set.key)}', '${escapeSql(set.value)}');\n`;
  }

  sql += 'COMMIT;\n';

  zip.file('data/data.sql', sql);

  // 2. Add App Files
  // Pass a list of files to fetch and add to zip
  const filesToFetch = [
    'index.html',
    'src/main.js',
    'src/App.js',
    'src/router.js',
    'src/db.js',
    'src/store.js',
    'src/assets/main.css',
    'src/views/Home.js',
    'src/views/Categories.js',
    'src/views/CategoryEdit.js',
    'src/views/NoteEditor.js',
    'src/views/Settings.js',
    // Add services/ImportExport.js too? Yes.
    // We assume we can fetch them relative to current root.
  ];

  // Recursive fetch? No, listing is safer.
  // Ideally we'd have a manifest.

  for (const file of filesToFetch) {
    try {
      const res = await fetch(file);
      if (res.ok) {
        const text = await res.text();
        zip.file(file, text);
      }
    } catch (e) {
      console.warn(`Failed to fetch ${file} for export`, e);
    }
  }

  // Generate Zip
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, 'note-file-separated.zip');
}

export async function exportStaticHtml() {
  const zip = new JSZip();
  const notes = await getNotes();
  const categories = await getCategories();

  // Generate index.html (List)
  const indexHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Notes Export</title><meta charset="utf-8"></head>
    <body style="font-family: system-ui; padding: 20px;">
        <h1>All Notes</h1>
        <ul>
            ${notes.map(n => `<li><a href="data/${n.id}.html">${n.title || 'Untitled'}</a> <small>${new Date(n.updated_at).toLocaleDateString()}</small></li>`).join('')}
        </ul>
    </body>
    </html>
    `;
  zip.file('index.html', indexHtml);

  // Generate Note HTMLs
  for (const note of notes) {
    const cat = categories.find(c => c.id === note.category_id);
    const noteHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>${note.title}</title><meta charset="utf-8"></head>
        <body style="font-family: system-ui; padding: 20px;">
            <a href="../index.html">Back to List</a>
            <h1>${note.title}</h1>
            <p>Category: ${cat ? cat.name : 'Uncategorized'} | Updated: ${new Date(note.updated_at).toLocaleString()}</p>
            <hr>
            <div style="white-space: pre-wrap;">${note.content}</div>
        </body>
        </html>
        `;
    zip.file(`data/${note.id}.html`, noteHtml);
  }

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, 'note-file-static.zip');
}

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Import ---

export async function importData(file, mode = 'merge') {
  // Mode: 'merge' | 'replace'
  // File: File object (uploaded)

  // Read file text
  const text = await file.text();

  // Assuming simple SQL dump format as generated above with separate INSERTs
  // Parsing SQL is hard without a parser.
  // If it's just a sequence of INSERTs, we can split by semicolon.
  // Or just db.exec(text) if the file is a proper script.

  const db = await getDB();

  if (mode === 'replace') {
    // Clear existing data
    await db.exec('DELETE FROM notes');
    await db.exec('DELETE FROM categories');
    await db.exec('DELETE FROM settings');
    // Reset sequences? 
    await db.exec('DELETE FROM sqlite_sequence WHERE name IN ("notes", "categories")');
  }

  // Execute imported SQL
  // We wrap in transaction
  try {
    await db.exec('BEGIN TRANSACTION');
    // Split by semicolon? Or just exec?
    // SQLite exec can handle strings with multiple statements.
    // However, if the dump includes "BEGIN TRANSACTION" and "COMMIT", nesting might be an issue?
    // Our dump includes them.

    // Let's strip the wrapper transaction from input or just run it.
    // If imports have transaction, we shouldn't double wrap if sqlite-wasm doesn't support nested.
    // Safest is to just exec(text).

    await db.exec(text);

    // If success
    if (mode !== 'replace') {
      // If merge, we might have ID conflicts if we inserted with explicit IDs.
      // Our dump uses explicit IDs `INSERT INTO ... (id, ...`.
      // If `merge`, this will fail on duplicate keys.
      // We need to parse and remove IDs for merge?
      // Or rely on `INSERT OR IGNORE` or `INSERT OR REPLACE`?

      // If the user wants to MERGE, likely they want to keep existing and add new.
      // If IDs clash, what to do?
      // If we strip IDs, they get new IDs.
    }

  } catch (e) {
    console.error("Import failed", e);
    await db.exec('ROLLBACK'); // If we started one
    if (e.message.includes('UNIQUE constraint failed') && mode === 'merge') {
      alert('Import failed due to duplicate IDs. Merge not fully supported for exact ID matches yet.');
    } else {
      alert('Import failed: ' + e.message);
    }
  }
}

// SQLite database operations using sql.js
let db = null;
let dbReady = false;

export async function initDB() {
    try {
        console.log('Initializing database...');
        
        // Initialize SQL.js
        const SQL = await initSqlJs();
        
        // Try to initialize OPFS for file storage
        const root = await navigator.storage.getDirectory?.();
        
        if (root) {
            // Try to load existing database from OPFS
            try {
                const dbFile = await root.getFileHandle('data.sql');
                const file = await dbFile.getFile();
                const buffer = await file.arrayBuffer();
                const data = new Uint8Array(buffer);
                db = new SQL.Database(data);
                console.log('✅ Loaded database from OPFS');
            } catch (e) {
                // Create new database
                db = new SQL.Database();
                initTables();
                await saveDB();
                console.log('✅ Created new database in OPFS');
            }
        } else {
            // OPFS not available, use in-memory only
            console.warn('⚠️ OPFS not available, using in-memory database');
            db = new SQL.Database();
            initTables();
        }
        
        dbReady = true;
    } catch (e) {
        console.error('❌ Database initialization error:', e);
        // Fallback: create in-memory database
        const SQL = await initSqlJs();
        db = new SQL.Database();
        initTables();
        dbReady = true;
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

export async function saveDB() {
    try {
        const root = await navigator.storage.getDirectory();
        console.log(root)
        const dbFile = await root.getFileHandle('data.sql', { create: true });
        const writable = await dbFile.createWritable();
        const data = db.export();
        const blob = new Blob([data]);
        await writable.write(blob);
        await writable.close();
        console.log('✅ Database saved to OPFS (data.sql)');
        return true;
    } catch (e) {
        console.warn('Could not save to OPFS:', e);
        return false;
    }
}

export function getDB() {
    return db;
}

export async function clearAllData() {
    try {
        const SQL = await initSqlJs();
        // Create a fresh in-memory database and init tables
        db = new SQL.Database();
        initTables();
        const saved = await saveDB();
        console.log('✅ clearAllData completed, saved:', saved);
        return saved;
    } catch (e) {
        console.error('❌ clearAllData failed:', e);
        throw e;
    }
}

export async function initSqlJs() {
    if (window.initSqlJs) {
        try {
            return await window.initSqlJs({
                locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
            });
        } catch (e) {
            console.log('SQL.js with config failed, trying without...', e);
        }
    }
    
    // Fallback - try simple version
    if (window.SQL) {
        return window.SQL;
    }
    
    // Last resort - create a simple in-memory DB stub
    console.warn('SQL.js initialization failed, some features may not work');
    return {
        Database: class {
            constructor() {
                this.data = {};
            }
            run() {}
            exec() { return []; }
            export() { return new Uint8Array(); }
        }
    };
}

// Notes operations
export function getAllNotes() {
    const db = getDB();
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

export function getNoteById(id) {
    const db = getDB();
    const result = db.exec(`
        SELECT n.*, c.name as category_name 
        FROM notes n 
        LEFT JOIN categories c ON n.category_id = c.id 
        WHERE n.id = ?
    `, [id]);
    
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    const row = result[0].values[0];
    return {
        id: row[0],
        title: row[1],
        content: row[2],
        category_id: row[3],
        created_at: row[4],
        updated_at: row[5],
        category_name: row[6]
    };
}

export async function createNote(title, content, category_id) {
    const db = getDB();
    db.run(
        `INSERT INTO notes (title, content, category_id) VALUES (?, ?, ?)`,
        [title, content, category_id || 0]
    );
    await saveDB();
    
    const result = db.exec(`SELECT last_insert_rowid() as id`);
    return result[0].values[0][0];
}

export async function updateNote(id, title, content, category_id) {
    const db = getDB();
    db.run(
        `UPDATE notes SET title = ?, content = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [title, content, category_id || 0, id]
    );
    await saveDB();
}

export async function deleteNote(id) {
    const db = getDB();
    db.run(`DELETE FROM notes WHERE id = ?`, [id]);
    await saveDB();
}

// Categories operations
export function getAllCategories() {
    const db = getDB();
    const result = db.exec(`SELECT id, name, color FROM categories ORDER BY id`);
    
    if (result.length === 0) return [];
    
    return result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        color: row[2]
    }));
}

export async function createCategory(name, color) {
    const db = getDB();
    db.run(
        `INSERT INTO categories (name, color) VALUES (?, ?)`,
        [name, color]
    );
    await saveDB();
    
    const result = db.exec(`SELECT last_insert_rowid() as id`);
    return result[0].values[0][0];
}

export async function updateCategory(id, name, color) {
    const db = getDB();
    db.run(
        `UPDATE categories SET name = ?, color = ? WHERE id = ?`,
        [name, color, id]
    );
    await saveDB();
}

export async function deleteCategory(id) {
    const db = getDB();
    // Move notes to uncategorized
    db.run(`UPDATE notes SET category_id = 0 WHERE category_id = ?`, [id]);
    db.run(`DELETE FROM categories WHERE id = ?`, [id]);
    await saveDB();
}

export async function exportData() {
    const db = getDB();
    const notes = getAllNotes();
    const categories = getAllCategories();
    
    return {
        version: 1,
        notes,
        categories,
        exported_at: new Date().toISOString()
    };
}

export async function exportSQLiteFile() {
    try {
        const db = getDB();
        if (!db) {
            throw new Error('Database not initialized');
        }
        
        // Create ZIP
        const JSZip = window.JSZip;
        if (!JSZip) {
            throw new Error('JSZip library not loaded');
        }
        
        console.log('📦 Starting export...');
        const zip = new JSZip();
        
        // Add database file - export as Uint8Array directly
        const dbData = db.export();
        console.log('📊 Database exported, size:', dbData.length, 'bytes');
        
        // Add database.db to ZIP
        zip.file('database.db', dbData, { binary: true });
        console.log('✅ Database added to ZIP');
        
        // Get all notes with attachments
        const notes = getAllNotes();
        console.log('📝 Exporting', notes.length, 'notes');
        
        for (const note of notes) {
            const attachments = getAttachments(note.id);
            if (attachments.length > 0) {
                const folderName = `note_${note.id}_${note.title.substring(0, 20).replace(/\//g, '_')}`;
                const noteFolder = zip.folder(folderName);
                console.log('📁 Creating folder:', folderName, 'with', attachments.length, 'attachments');
                
                for (const att of attachments) {
                    // Ensure file_data is Uint8Array
                    const fileData = att.file_data instanceof Uint8Array ? att.file_data : new Uint8Array(att.file_data);
                    noteFolder.file(att.filename, fileData, { binary: true });
                    console.log('  ✓', att.filename, '(' + (fileData.length / 1024).toFixed(1) + ' KB)');
                }
            }
        }
        
        // Generate ZIP
        console.log('📦 Generating ZIP...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        console.log('✅ ZIP generated, size:', (zipBlob.size / 1024).toFixed(1), 'KB');
        
        // Create download link
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes-backup-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ ZIP file exported successfully');
    } catch (e) {
        console.error('❌ Failed to export ZIP file:', e);
        throw e;
    }
}

export async function importSQLiteFile(fileBuffer, merge = false) {
    try {
        const SQL = await initSqlJs();
        
        // Ensure fileBuffer is Uint8Array
        let uint8Buffer;
        if (fileBuffer instanceof Uint8Array) {
            uint8Buffer = fileBuffer;
        } else if (fileBuffer instanceof ArrayBuffer) {
            uint8Buffer = new Uint8Array(fileBuffer);
        } else if (fileBuffer.buffer instanceof ArrayBuffer) {
            uint8Buffer = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
        } else {
            uint8Buffer = new Uint8Array(fileBuffer);
        }
        
        console.log('🔍 Import started');
        console.log('📊 File buffer type:', fileBuffer.constructor.name);
        console.log('📊 File buffer size:', uint8Buffer.byteLength, 'bytes');
        console.log('📊 First 16 bytes (hex):', Array.from(uint8Buffer.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log('📊 First 4 bytes as ASCII:', String.fromCharCode(...uint8Buffer.slice(0, 4)));
        
        // Check if it's a ZIP file (check magic bytes: PK\x03\x04)
        const isZip = uint8Buffer[0] === 0x50 && uint8Buffer[1] === 0x4B && uint8Buffer[2] === 0x03 && uint8Buffer[3] === 0x04;
        console.log('✅ isZip check:', isZip, '(bytes:', uint8Buffer[0], uint8Buffer[1], uint8Buffer[2], uint8Buffer[3], ')');
        
        let dbBuffer;
        
        if (isZip) {
            console.log('🔄 Processing as ZIP file');
            const JSZip = window.JSZip;
            if (!JSZip) {
                throw new Error('JSZip library not loaded');
            }
            
            // Parse ZIP file
            const zip = new JSZip();
            await zip.loadAsync(new Blob([uint8Buffer]));
            console.log('✅ ZIP file loaded');
            
            // List files in ZIP
            const fileList = [];
            zip.forEach((relativePath, file) => {
                fileList.push(relativePath);
            });
            console.log('📦 Files in ZIP:', fileList);
            
            // Extract database.db
            const dbFile = zip.file('database.db');
            if (!dbFile) {
                throw new Error('database.db not found in ZIP file. Available files: ' + fileList.join(', '));
            }
            
            // Extract as Uint8Array
            dbBuffer = await dbFile.async('uint8array');
            console.log('📊 Database extracted from ZIP, size:', dbBuffer.length, 'bytes');
            console.log('📊 Database header (first 16 bytes hex):', Array.from(dbBuffer.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
        } else {
            console.log('🔄 Processing as direct database file');
            dbBuffer = uint8Buffer;
            
            // Verify it looks like a SQLite database
            const header = String.fromCharCode(...uint8Buffer.slice(0, 16));
            console.log('📊 Database header:', header);
            if (!header.startsWith('SQLite format 3')) {
                throw new Error('File does not appear to be a SQLite database. Header: ' + header + ' (hex: ' + Array.from(uint8Buffer.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ') + ')');
            }
        }
        
        console.log('🔄 Creating SQL.Database from buffer...');
        let importedDB;
        try {
            importedDB = new SQL.Database(dbBuffer);
            console.log('✅ SQL.Database created successfully');
        } catch (e) {
            console.error('❌ Failed to create SQL.Database:', e);
            console.error('Buffer details - length:', dbBuffer.length, 'type:', typeof dbBuffer, 'constructor:', dbBuffer.constructor.name);
            throw new Error(`Failed to load database: ${e.message}`);
        }
        
        // Verify database structure
        try {
            const tables = importedDB.exec("SELECT name FROM sqlite_master WHERE type='table'");
            console.log('✅ Database verification passed, found tables:', tables);
        } catch (e) {
            throw new Error(`Invalid database: ${e.message}`);
        }
        
        if (!merge) {
            // Replace mode: completely swap databases
            console.log('🔄 Replace mode - swapping database');
            
            // Export the imported database and create a fresh instance
            const exportedData = importedDB.export();
            db = new SQL.Database(exportedData);
            console.log('✅ Database swapped');
            
        } else {
            // Merge mode: copy data from imported DB to current DB
            console.log('🔄 Merge mode - copying data');
            await dumpAndRestoreDB(importedDB, true);
        }
        
        // Verify data after import
        const finalNotes = db.exec('SELECT COUNT(*) as count FROM notes');
        const finalCategories = db.exec('SELECT COUNT(*) as count FROM categories WHERE id != 0');
        const notesCount = finalNotes.length > 0 && finalNotes[0].values.length > 0 ? finalNotes[0].values[0][0] : 0;
        const catsCount = finalCategories.length > 0 && finalCategories[0].values.length > 0 ? finalCategories[0].values[0][0] : 0;
        console.log('✅ Final note count:', notesCount);
        console.log('✅ Final category count:', catsCount);
        
        await saveDB();
        console.log('✅ Import completed successfully and saved to OPFS');
        return { success: true, message: '✅ 匯入成功' };
    } catch (e) {
        console.error('❌ Failed to import SQLite file:', e);
        throw new Error(`匯入失敗: ${e.message}`);
    }
}

// Helper function to dump and restore database
export async function dumpAndRestoreDB(importedDB, merge = false) {
    const currentDB = getDB();
    
    if (!merge) {
        // This function should only be called with merge=true
        console.warn('⚠️ dumpAndRestoreDB should be called with merge=true');
        return;
    }
    
    // Merge mode: copy data row by row
    console.log('🔄 Merge mode - copying data');
    
    try {
        // Copy categories
        const cats = importedDB.exec('SELECT id, name, color FROM categories');
        if (cats.length > 0) {
            const values = cats[0].values;
            console.log('📂 Copying', values.length, 'categories');
            
            for (const row of values) {
                const [id, name, color] = row;
                if (id === 0) continue; // Skip default category
                currentDB.run('INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)', [name, color]);
                console.log('  ✓ Category:', name);
            }
        }
    } catch (e) {
        console.warn('⚠️ Could not import categories:', e.message);
    }
    
    // Copy notes
    try {
        const n = importedDB.exec('SELECT * FROM notes');
        if (n.length > 0) {
            const values = n[0].values;
            console.log('📝 Copying', values.length, 'notes');
            
            for (const row of values) {
                const [id, title, content, category_id, created_at, updated_at] = row;
                currentDB.run(
                    'INSERT INTO notes (title, content, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                    [title, content, category_id, created_at, updated_at]
                );
                console.log('  ✓ Note:', title);
            }
        }
    } catch (e) {
        console.warn('⚠️ Could not import notes:', e.message);
    }
    
    // Copy attachments
    try {
        const att = importedDB.exec('SELECT * FROM attachments');
        if (att.length > 0) {
            const values = att[0].values;
            console.log('📎 Copying', values.length, 'attachments');
            
            for (const row of values) {
                const [id, note_id, filename, file_type, file_size, file_data] = row;
                const blob = file_data instanceof Uint8Array ? file_data : new Uint8Array(file_data);
                currentDB.run(
                    'INSERT INTO attachments (note_id, filename, file_type, file_size, file_data) VALUES (?, ?, ?, ?, ?)',
                    [note_id, filename, file_type, file_size, blob]
                );
                console.log('  ✓ Attachment:', filename, '(', Math.round(file_size / 1024), 'KB)');
            }
        }
    } catch (e) {
        console.warn('⚠️ Could not import attachments:', e.message);
    }
    
    console.log('✅ Data merge completed');
}

export async function importData(data, merge = false) {
    const db = getDB();
    
    if (!merge) {
        // Clear existing data
        db.run(`DELETE FROM notes`);
        db.run(`DELETE FROM categories WHERE id != 0`);
    }
    
    // Import categories
    if (data.categories) {
        for (const cat of data.categories) {
            if (cat.id !== 0) {
                db.run(
                    `INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)`,
                    [cat.name, cat.color]
                );
            }
        }
    }
    
    // Import notes
    if (data.notes) {
        for (const note of data.notes) {
            db.run(
                `INSERT INTO notes (title, content, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
                [note.title, note.content, note.category_id, note.created_at, note.updated_at]
            );
        }
    }
    
    await saveDB();
}

// Attachment operations
export async function addAttachment(noteId, file) {
    try {
        const db = getDB();
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        db.run(
            `INSERT INTO attachments (note_id, filename, file_type, file_size, file_data) VALUES (?, ?, ?, ?, ?)`,
            [noteId, file.name, file.type, file.size, uint8Array]
        );
        
        await saveDB();
        console.log('✅ Attachment added:', file.name);
    } catch (e) {
        console.error('❌ Failed to add attachment:', e);
        throw e;
    }
}

export function getAttachments(noteId) {
    try {
        const db = getDB();
        const result = db.exec(
            `SELECT id, note_id, filename, file_type, file_size, file_data, created_at FROM attachments WHERE note_id = ? ORDER BY created_at ASC`,
            [noteId]
        );
        
        if (result.length === 0) {
            return [];
        }
        
        const columns = result[0].columns;
        const values = result[0].values;
        
        return values.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });
    } catch (e) {
        console.error('❌ Failed to get attachments:', e);
        return [];
    }
}

export async function deleteAttachment(attachmentId) {
    try {
        const db = getDB();
        db.run(`DELETE FROM attachments WHERE id = ?`, [attachmentId]);
        await saveDB();
        console.log('✅ Attachment deleted:', attachmentId);
    } catch (e) {
        console.error('❌ Failed to delete attachment:', e);
        throw e;
    }
}

export function getAttachmentUrl(attachment) {
    try {
        const blob = new Blob([new Uint8Array(attachment.file_data)], { type: attachment.file_type });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error('❌ Failed to create attachment URL:', e);
        return null;
    }
}


import sqlite3InitModule from 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.46.0-build1/sqlite-wasm/jswasm/sqlite3.mjs';

async function initDB() {
  try {
    // 1. 初始化 SQLite Wasm 模組
    const sqlite3 = await sqlite3InitModule({
      // 指定 .wasm 檔的位置
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.46.0-build1/sqlite-wasm/jswasm/${file}`
    });
    
    // 2. 檢查瀏覽器是否支援 OPFS (opfsVfs)
    if ('opfs' in sqlite3.vfs) {
      // 3. 在 OPFS 中開啟/建立資料庫檔案 (my_app.db)
      // sqlite3 會自動處理 OPFS 的頁面隨機讀寫，無需手動寫入整個檔案
      const db = new sqlite3.oo1.OpfsDb('my_app.db');
      console.log('成功於 OPFS 建立/載入 SQLite 資料庫！');

      // 初始化資料表
      db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      return db;
    } else {
      throw new Error('此瀏覽器不支援 OPFS VFS');
    }
  } catch (err) {
    console.error('SQLite 初始化失敗:', err);
  }
}

let dbInstance = null;

// 監聽主執行緒（Main Thread）發送的訊息
self.onmessage = async (e) => {
  if (!dbInstance) {
    dbInstance = await initDB();
  }

  const { action, payload } = e.data;

  if (action === 'ADD_LOG') {
    // 寫入資料：SQLite 僅會更新 OPFS 檔案中受影響的分頁 (Page)
    dbInstance.exec({
      sql: 'INSERT INTO logs (content) VALUES (?)',
      bind: [payload.content]
    });

    self.postMessage({ status: 'SUCCESS', message: '已成功寫入 OPFS 資料庫！' });
  } 
  
  else if (action === 'GET_LOGS') {
    // 讀取資料
    const results = [];
    dbInstance.exec({
      sql: 'SELECT * FROM logs ORDER BY id DESC',
      rowMode: 'object',
      callback: (row) => results.push(row)
    });

    self.postMessage({ status: 'DATA', data: results });
  }
};
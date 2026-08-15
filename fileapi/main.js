
let fileHandle;
const btnOpen = document.getElementById('btnOpen');
const btnRestore = document.getElementById('btnRestore');
const btnSave = document.getElementById('btnSave');
const editor = document.getElementById('editor');

// 1. 初始化 IndexedDB 資料庫
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FileStoreDB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// 將 Handle 存入 IndexedDB
async function saveHandleToDB(handle) {
  const db = await openDatabase();
  const tx = db.transaction('handles', 'readwrite');
  tx.objectStore('handles').put(handle, 'lastFile');
  return tx.complete;
}

// 從 IndexedDB 讀取 Handle
async function getHandleFromDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly');
    const request = tx.objectStore('handles').get('lastFile');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 2. 開啟檔案並寫入 DB
btnOpen.addEventListener('click', async () => {
  try {
    [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    editor.value = await file.text();
    
    // 儲存至 IndexedDB
    await saveHandleToDB(fileHandle);
    btnSave.disabled = false;
    alert('檔案已開啟並儲存至瀏覽器快取！');
  } catch (err) {
    console.error('開啟檔案失敗:', err);
  }
});

// 3. 頁面載入時自動檢查是否有舊的 Handle
// 頁面載入完成時，嘗試自動恢復並讀取檔案
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const savedHandle = await getHandleFromDB();
    if (!savedHandle) return; // 如果沒有存過紀錄就直接跳過

    fileHandle = savedHandle;

    // 1. 檢查目前的讀取權限是否依然是 granted（不需要彈窗索取）
    const permissionState = await fileHandle.queryPermission({ mode: 'read' });

    if (permissionState === 'granted') {
      // 2. 權限還活著，直接在背景自動讀取檔案內容！
      const file = await fileHandle.getFile();
      editor.value = await file.text();
      
      // 順便檢查一下有沒有 readwrite 權限來決定是否啟用儲存按鈕
      if ((await fileHandle.queryPermission({ mode: 'readwrite' })) === 'granted') {
        btnSave.disabled = false;
      }
      
      console.log('已自動載入上次的授權檔案');
    } else {
      // 如果權限過期或變成 prompt，則啟用還原按鈕讓使用者手動點擊授權
      btnRestore.disabled = false;
    }
  } catch (err) {
    console.error('自動載入檔案失敗:', err);
  }
});


// 4. 點擊恢復上次的檔案
btnRestore.addEventListener('click', async () => {
  try {
    fileHandle = await getHandleFromDB();
    if (!fileHandle) {
      alert('找不到快取的檔案記錄');
      return;
    }

    // 重新請求讀寫權限（瀏覽器安全規定，重開頁面後必須重新授權）
    if ((await fileHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if ((await fileHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
        alert('未取得檔案存取權限');
        return;
      }
    }

    const file = await fileHandle.getFile();
    editor.value = await file.text();
    btnSave.disabled = false;
    alert('成功恢復上次的檔案！');
  } catch (err) {
    console.error('恢復檔案失敗:', err);
  }
});

// 儲存變更按鈕維持原本邏輯...


// 2. SAVE CHANGES BACK TO THE ORIGINAL FILE
btnSave.addEventListener('click', async () => {
  if (!fileHandle) return;

  try {
    // Create a writable stream to the file
    const writable = await fileHandle.createWritable();
    
    // Write the current contents of the textarea
    await writable.write(editor.value);
    
    // Close the file stream to flush changes to disk
    await writable.close();
    
    alert('File saved successfully!');
  } catch (err) {
    console.error('File saving failed:', err);
  }
});

let dirHandle;
const btnDir = document.getElementById('btnDir');
const dirList = document.getElementById('dirList');

// 1. 共用的 IndexedDB 初始化與存取函式
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

async function saveDirHandleToDB(handle) {
  const db = await openDatabase();
  const tx = db.transaction('handles', 'readwrite');
  tx.objectStore('handles').put(handle, 'lastDir');
  return tx.complete;
}

async function getDirHandleFromDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly');
    const request = tx.objectStore('handles').get('lastDir');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 2. 遞迴走訪目錄函式
async function buildDirectoryTree(currentDirHandle, parentElement) {
  const ul = document.createElement('ul');
  parentElement.appendChild(ul);

  for await (const entry of currentDirHandle.values()) {
    const li = document.createElement('li');
    if (entry.kind === 'directory') {
      li.textContent = `📁 ${entry.name}`;
      ul.appendChild(li);
      await buildDirectoryTree(entry, li);
    } else {
      li.textContent = `📄 ${entry.name}`;
      ul.appendChild(li);
    }
  }
}

// 3. 點擊按鈕手動選擇資料夾並存入快取
btnDir.addEventListener('click', async () => {
  try {
    dirHandle = await window.showDirectoryPicker();
    await saveDirHandleToDB(dirHandle); // 儲存至 IndexedDB
    
    dirList.innerHTML = '';
    const rootLi = document.createElement('li');
    rootLi.textContent = `📁 ${dirHandle.name} (根目錄)`;
    dirList.appendChild(rootLi);
    await buildDirectoryTree(dirHandle, rootLi);
  } catch (err) {
    console.error('選擇資料夾失敗:', err);
  }
});

// 4. 網頁載入時自動檢查並載入已授權的資料夾
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const savedHandle = await getDirHandleFromDB();
    if (!savedHandle) return;

    dirHandle = savedHandle;

    // 檢查資料夾的讀取權限是否仍為 granted
    const permissionState = await dirHandle.queryPermission({ mode: 'read' });

    if (permissionState === 'granted') {
      dirList.innerHTML = '';
      const rootLi = document.createElement('li');
      rootLi.textContent = `📁 ${dirHandle.name} (自動載入根目錄)`;
      dirList.appendChild(rootLi);
      
      // 直接在背景自動建立目錄樹
      await buildDirectoryTree(dirHandle, rootLi);
      console.log('已自動載入上次授權的資料夾');
    }
  } catch (err) {
    console.error('自動載入資料夾失敗:', err);
  }
});

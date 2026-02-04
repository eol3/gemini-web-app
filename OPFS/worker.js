// worker.js
self.onmessage = async (e) => {
    const { type, fileName, content } = e.data;
    const root = await navigator.storage.getDirectory();
    
    try {
        if (type === 'save') {
            const fileHandle = await root.getFileHandle(fileName, { create: true });
            // 這是 iPhone 最喜歡的高效能同步寫入方式
            const accessHandle = await fileHandle.createSyncAccessHandle();
            
            // 將文字轉成編碼 Buffer
            const encoder = new TextEncoder();
            const writeBuffer = encoder.encode(content);
            
            // 寫入檔案（先清空再寫入）
            accessHandle.truncate(0);
            accessHandle.write(writeBuffer, { at: 0 });
            accessHandle.flush(); // 強制寫入硬碟
            accessHandle.close();
            
            self.postMessage({ type: 'status', msg: `✅ ${fileName} 已安全寫入` });
        } 
        else if (type === 'read') {
            const fileHandle = await root.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const text = await file.text();
            self.postMessage({ type: 'load', content: text, fileName });
        }
    } catch (error) {
        self.postMessage({ type: 'error', msg: error.message });
    }
};
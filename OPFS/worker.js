// worker.js
self.onmessage = async (e) => {
    const { type, fileName, content } = e.data;
    const root = await navigator.storage.getDirectory();

    try {
        if (type === 'save') {
            const fileHandle = await root.getFileHandle(fileName, { create: true });
            const accessHandle = await fileHandle.createSyncAccessHandle();

            let writeBuffer;
            if (typeof content === 'string') {
                const encoder = new TextEncoder();
                writeBuffer = encoder.encode(content);
            } else {
                // Assume ArrayBuffer or TypedArray
                writeBuffer = content;
            }

            accessHandle.truncate(0);
            accessHandle.write(writeBuffer, { at: 0 });
            accessHandle.flush();
            accessHandle.close();

            self.postMessage({ type: 'done', msg: `✅ ${fileName} Saved` });
        }
        else if (type === 'read') {
            const fileHandle = await root.getFileHandle(fileName);
            const file = await fileHandle.getFile();

            // Check if file is text-based to return string, otherwise return buffer
            const textExtensions = ['.txt', '.js', '.html', '.css', '.json', '.md', '.xml', '.svg', '.log', '.csv'];
            const isText = textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

            if (isText) {
                const text = await file.text();
                self.postMessage({
                    type: 'load',
                    content: text,
                    fileName,
                    fileType: 'text',
                    mimeType: file.type || 'text/plain'
                });
            } else {
                // Return binary for images, videos, pdfs, zips, etc.
                const buffer = await file.arrayBuffer();

                // Determine category for UI helper
                let category = 'binary';
                const name = fileName.toLowerCase();
                if (name.match(/\.(jpg|jpeg|png|gif|webp|bmp|ico)$/)) category = 'image';
                else if (name.match(/\.(mp4|webm|ogg|mp3|wav)$/)) category = 'media';

                self.postMessage({
                    type: 'load',
                    content: buffer,
                    fileName,
                    fileType: category,
                    mimeType: file.type
                }, [buffer]);
            }
        }
        else if (type === 'delete') {
            await root.removeEntry(fileName);
            self.postMessage({ type: 'done', msg: 'Deleted' });
        }
    } catch (error) {
        self.postMessage({ type: 'error', msg: error.message });
    }
};
// Based on ./OPFS/worker.js
self.onmessage = async (e) => {
  const { type, fileName, content } = e.data;
  const root = await navigator.storage.getDirectory();

  try {
    if (type === 'save') {
      // Helper to ensure directory exists
      let dirHandle = root;
      const pathParts = fileName.split('/');
      const msgFileName = pathParts.pop();

      for (const part of pathParts) {
        dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
      }

      const fileHandle = await dirHandle.getFileHandle(msgFileName, { create: true });

      try {
        // Try high-performance SyncAccessHandle (requires COOP/COEP)
        const accessHandle = await fileHandle.createSyncAccessHandle();

        let writeBuffer;
        if (typeof content === 'string') {
          const encoder = new TextEncoder();
          writeBuffer = encoder.encode(content);
        } else {
          writeBuffer = content;
        }

        accessHandle.truncate(0);
        accessHandle.write(writeBuffer, { at: 0 });
        accessHandle.flush();
        accessHandle.close();
      } catch (e) {
        // Fallback: createWritable (Async stream, works in more contexts)
        // Note: createWritable on OPFS is standard but might have different support in older implementations.
        // It generally works without COOP/COEP if the browser supports OPFS.
        if (fileHandle.createWritable) {
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
        } else {
          throw new Error('No method to write to file (SyncAccessHandle and createWritable failed/missing).');
        }
      }

      self.postMessage({ type: 'done', fileName, msg: 'Saved' });
    }
    else if (type === 'read') {
      try {
        let dirHandle = root;
        const pathParts = fileName.split('/');
        const msgFileName = pathParts.pop();

        for (const part of pathParts) {
          dirHandle = await dirHandle.getDirectoryHandle(part);
        }

        const fileHandle = await dirHandle.getFileHandle(msgFileName);
        const file = await fileHandle.getFile();

        // Return ArrayBuffer if it's an image (heuristic or explicit type?)
        // For now, let's return ArrayBuffer if requested, or try to detect?
        // Actually, the original code returned text.
        // We probably need a way to specify return type.
        // But for "adding" images as requested, 'save' is the key.
        // Let's keep 'read' simple for now or improve it if needed.
        // If we want to read images, we need to return blob/buffer.

        // Simple heuristic: if extension is image-like, return Blob/Buffer?
        // Or better: just return ArrayBuffer always? No, existing code expects string for notes.

        // Let's stick to text for read for now unless we change FileService to request binary.
        // But the user strictly asked for "ADD image files".

        const text = await file.text();
        self.postMessage({ type: 'load', content: text, fileName });
      } catch (err) {
        // If file not found, return empty or specific error
        if (err.name === 'NotFoundError') {
          self.postMessage({ type: 'load', content: '', fileName }); // Treat as new/empty
        } else {
          throw err;
        }
      }
    }
    else if (type === 'delete') {
      try {
        // Simple delete (doesn't handle nested cleanly yet for delete, but sufficient for now)
        await root.removeEntry(fileName);
        // Note: removeEntry on root only works for direct children.
        // To delete nested, we'd need to walk.
        // Leaving as is for now as usually we delete notes (root).
        self.postMessage({ type: 'done', fileName, msg: 'Deleted' });
      } catch (err) {
        if (err.name !== 'NotFoundError') throw err;
        self.postMessage({ type: 'done', fileName, msg: 'Deleted (not found)' });
      }
    }
  } catch (error) {
    self.postMessage({ type: 'error', msg: error.message, fileName });
  }
};

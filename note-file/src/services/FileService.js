const worker = new Worker('./src/worker.js'); // Relative to index.html

const pendingResolves = {};
const pendingReject = {};

worker.onmessage = (e) => {
  const { type, fileName, content, msg, error } = e.data;

  // We need a way to map responses back to requests. 
  // Simply using fileName as key for now (assuming one op per file at a time).
  const key = fileName;

  if (type === 'error') {
    if (pendingReject[key]) pendingReject[key](new Error(msg));
  } else if (type === 'load') {
    if (pendingResolves[key]) pendingResolves[key](content);
  } else if (type === 'done') {
    if (pendingResolves[key]) pendingResolves[key](true);
  }

  delete pendingResolves[key];
  delete pendingReject[key];
};

export const FileService = {
  save(fileName, content) {
    return new Promise((resolve, reject) => {
      pendingResolves[fileName] = resolve;
      pendingReject[fileName] = reject;

      // If content is an ArrayBuffer, we can transfer it for performance,
      // but standard postMessage clone is fine for now.
      worker.postMessage({ type: 'save', fileName, content });
    });
  },

  read(fileName) {
    return new Promise((resolve, reject) => {
      pendingResolves[fileName] = resolve;
      pendingReject[fileName] = reject;
      worker.postMessage({ type: 'read', fileName });
    });
  },

  delete(fileName) {
    return new Promise((resolve, reject) => {
      pendingResolves[fileName] = resolve;
      pendingReject[fileName] = reject;
      worker.postMessage({ type: 'delete', fileName });
    });
  }
};

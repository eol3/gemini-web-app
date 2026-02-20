import { createApp } from 'vue';
import App from './App.js';
import router from './router.js';
import { initDataBase, getAllNotes, createNote, getNote } from './services/database.js';

// console.log(await initDataBase())
// await createNote("My First Note", "This is the content of my first note.", 0)
// console.log(getAllNotes())
// console.log(getNote(1))

// const root = await navigator.storage.getDirectory();
// const dbFile = await root.getFileHandle('data.sql');
// const file = await dbFile.getFile();
import { createWorker } from 'https://cdn.jsdelivr.net/npm/opfs-worker@1.3.1/+esm'

async function basicExample() {
    // Create a file system instance with default root path '/'
    const fs = await createWorker();

    // Write a file
    await fs.writeFile('/testx.txt', 'xxxxx');

    // Read the file back
    const str = await fs.readFile('/testx.txt');
    alert(str);
}
try {
  await basicExample()
} catch (e) {
  alert('OPFS Worker example failed:' + e.message);
}

const app = createApp(App)
app.use(router);
app.mount('#app');

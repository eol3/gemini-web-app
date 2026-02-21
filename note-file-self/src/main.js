import { createApp } from 'vue';
import App from './App.js';
import router from './router.js';
import { initDataBase, getAllNotes, createNote, getNote } from './services/database.js';

console.log(await initDataBase())
await createNote("My First Note", "This is the content of my first note.", 0)
console.log(getAllNotes())
console.log(getNote(1))

// const root = await navigator.storage.getDirectory();
// const dbFile = await root.getFileHandle('data.sql');
// const file = await dbFile.getFile();


// async function basicExample() {

//     // Read the file back
//     const str = await fs.readFile('/testx.txt');
//     alert(str);
// }
// try {
//   console.log(await initDataBase())
//   await basicExample()
// } catch (e) {
//   alert('OPFS Worker example failed:' + e.message);
// }

const app = createApp(App)
app.use(router);
app.mount('#app');

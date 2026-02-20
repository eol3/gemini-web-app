import { createApp } from 'vue';
import App from './App.js';
import router from './router.js';
import { initDataBase, getAllNotes, createNote, getNote } from './services/database.js';

console.log(await initDataBase())
// await createNote("My First Note", "This is the content of my first note.", 0)
console.log(getAllNotes())
console.log(getNote(1))

const app = createApp(App)
app.use(router);
app.mount('#app');

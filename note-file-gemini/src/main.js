import { createApp } from 'vue';
import App from './App.js';
import router from './router.js';
import { initStore } from './store.js';

initStore();

const app = createApp(App);
app.use(router);
app.mount('#app');

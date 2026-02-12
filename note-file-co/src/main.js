import { createApp } from 'vue';
import { createRouter, createHashHistory } from 'vue-router';
import { initDB } from './db.js';
import { createStore } from './store.js';
import Home from './views/Home.js';
import NoteEditor from './views/NoteEditor.js';
import Categories from './views/Categories.js';
import CategoryEdit from './views/CategoryEdit.js';
import Settings from './views/Settings.js';

const routes = [
    { path: '/', component: Home },
    { path: '/note/:id?', component: NoteEditor },
    { path: '/categories', component: Categories },
    { path: '/categories/edit', component: CategoryEdit },
    { path: '/settings', component: Settings }
];

const router = createRouter({
    history: createHashHistory(),
    routes
});

const store = createStore();

const app = createApp({
    setup() {
        const goHome = () => {
            router.push('/');
        };

        const goSettings = () => {
            router.push('/settings');
        };

        return {
            router,
            store,
            goHome,
            goSettings
        };
    },
    template: `
        <div class="app-container" :class="store.currentTheme">
            <nav class="navbar-custom navbar navbar-expand-lg">
                <div class="container-fluid">
                    <a class="navbar-brand" @click="goHome" style="cursor: pointer;">
                        📝 {{ store.notebookName }}
                    </a>
                    <button class="btn btn-link" @click="goSettings" title="設定">
                        ⚙️
                    </button>
                </div>
            </nav>
            <router-view></router-view>
        </div>
    `
});

app.use(store);
app.use(router);

// Initialize database on app start
await initDB();

app.mount('#app');

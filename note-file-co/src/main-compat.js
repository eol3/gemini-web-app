// Wait for Vue and Vue Router to be loaded
function waitForLibs() {
    return new Promise((resolve) => {
        const checkLibs = () => {
            if (window.Vue && window.VueRouter) {
                resolve();
            } else {
                setTimeout(checkLibs, 100);
            }
        };
        checkLibs();
    });
}

// Initialize app after libs are loaded
waitForLibs().then(async () => {
    const { createApp } = window.Vue;
    const { createRouter, createWebHashHistory } = window.VueRouter;

    // Import modules
    const { initDB } = await import('./db.js');
    const { createStore } = await import('./store.js');
    const Home = (await import('./views/Home.js')).default;
    const NoteEditor = (await import('./views/NoteEditor.js')).default;
    const Categories = (await import('./views/Categories.js')).default;
    const CategoryEdit = (await import('./views/CategoryEdit.js')).default;
    const Settings = (await import('./views/Settings.js')).default;

    // Define routes
    const routes = [
        { path: '/', component: Home },
        { path: '/note/:id?', component: NoteEditor },
        { path: '/categories', component: Categories },
        { path: '/categories/edit', component: CategoryEdit },
        { path: '/settings', component: Settings }
    ];

    // Create router
    const router = createRouter({
        history: createWebHashHistory(),
        routes
    });

    // Create store
    const store = createStore();

    // Create app
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

    // Initialize database and mount app
    try {
        console.log('🚀 Initializing app...');
        await initDB();
        app.mount('#app');
        console.log('✅ App ready!');
    } catch (e) {
        console.error('❌ Failed to initialize app:', e);
        document.getElementById('app').innerHTML = `<div style="padding: 20px; color: #f44336;">❌ 应用初始化失败: ${e.message}</div>`;
    }
}).catch(e => {
    console.error('❌ Failed to load libraries:', e);
    document.getElementById('app').innerHTML = `<div style="padding: 20px; color: #f44336;">❌ 库加载失败: ${e.message}</div>`;
});
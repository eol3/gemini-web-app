import { h } from 'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.esm-browser.js';
import { useRouter } from 'https://cdn.jsdelivr.net/npm/vue-router@4/dist/vue-router.esm-browser.js';
import { useStore } from './store.js';

export default {
    name: 'App',
    setup() {
        const router = useRouter();
        const store = useStore();

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
};

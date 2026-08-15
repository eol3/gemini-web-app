import { watch, ref } from 'vue';
import { store } from './store.js';
import { getPersistenceMode } from './db.js';

export default {
    template: `
        <div class="container-fluid p-0">
            <div v-if="persistenceMode === 'error'" class="alert alert-danger m-0 text-center rounded-0" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Data Persistence Error:</strong> Failed to initialize OPFS storage. Please use a modern browser.
            </div>
            <router-view></router-view>
        </div>
    `,
    setup() {
        const persistenceMode = ref('loading');

        getPersistenceMode().then(mode => {
            persistenceMode.value = mode;
        });

        watch(() => store.theme, (newTheme) => {
            document.body.setAttribute('data-theme', newTheme);
        }, { immediate: true });

        return {
            persistenceMode
        };
    }
}

import { watch } from 'vue';
import { store } from './store.js';

export default {
    template: `
        <div class="container-fluid p-0">
            <router-view></router-view>
        </div>
    `,
    setup() {
        watch(() => store.theme, (newTheme) => {
            document.body.setAttribute('data-theme', newTheme);
        }, { immediate: true });
        return {};
    }
}

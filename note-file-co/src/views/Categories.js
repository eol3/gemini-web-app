const { ref, onMounted, computed } = Vue;
const { useRouter } = VueRouter;
import { getAllCategories } from '../db.js';

export default {
    name: 'Categories',
    setup() {
        const router = useRouter();
        const categories = ref([]);
        const loading = ref(true);

        onMounted(async () => {
            await new Promise(r => setTimeout(r, 200));
            loadCategories();
            loading.value = false;
        });

        const loadCategories = () => {
            try {
                categories.value = getAllCategories();
                console.log(`✅ Loaded ${categories.value.length} categories`);
            } catch (e) {
                console.error('Failed to load categories:', e);
            }
        };

        const goEdit = () => {
            router.push('/categories/edit');
        };

        const goBack = () => {
            router.push('/');
        };

        return {
            categories,
            loading,
            goEdit,
            goBack
        };
    },
    template: `
        <div class="container-fluid" style="padding: 16px; height: calc(100vh - 80px); display: flex; flex-direction: column;">
            <div style="display: flex; gap: 8px; margin-bottom: 16px; align-items: center;">
                <button class="btn btn-sm btn-primary" @click="goEdit">
                    ✏️ 編輯分類
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="goBack">
                    ← 返回
                </button>
            </div>

            <div class="notes-list" style="flex: 1; overflow-y: auto;">
                <div v-if="loading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="text-align: center;">
                        <small style="color: #999;">加載中...</small>
                    </div>
                </div>
                <div v-else-if="categories.length === 0" style="text-align: center; padding: 40px; color: #999;">
                    <p style="font-size: 32px; margin-bottom: 8px;">📭</p>
                    <p>還沒有分類</p>
                    <small>點擊「編輯分類」建立新分類</small>
                </div>
                <div v-else>
                    <div v-for="cat in categories" :key="cat.id" class="category-item">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center;" :style="{ backgroundColor: cat.color }"></div>
                            <div>
                                <strong style="font-size: 16px;">{{ cat.name }}</strong>
                                <div v-if="cat.id === 0" style="font-size: 11px; color: #999;">預設分類</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

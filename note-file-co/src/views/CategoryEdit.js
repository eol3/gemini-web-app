const { ref, onMounted } = Vue;
const { useRouter } = VueRouter;
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../db.js';

export default {
    name: 'CategoryEdit',
    setup() {
        const router = useRouter();
        const categories = ref([]);
        const newCatName = ref('');
        const newCatColor = ref('#4CAF50');
        const saving = ref(false);

        onMounted(async () => {
            loadCategories();
        });

        const loadCategories = () => {
            try {
                categories.value = getAllCategories();
                console.log(`✅ Loaded ${categories.value.length} categories`);
            } catch (e) {
                console.error('Load categories failed:', e);
            }
        };

        const addCategory = async () => {
            if (!newCatName.value.trim()) {
                alert('請輸入分類名稱');
                return;
            }

            if (categories.value.some(c => c.name === newCatName.value.trim())) {
                alert('分類名稱已存在');
                return;
            }

            saving.value = true;
            try {
                await createCategory(newCatName.value, newCatColor.value);
                console.log('✅ Category created:', newCatName.value);
                alert('✅ 分類已建立');
                newCatName.value = '';
                newCatColor.value = '#4CAF50';
                loadCategories();
            } catch (e) {
                console.error('Add category failed:', e);
                alert('❌ 新增分類失敗');
            } finally {
                saving.value = false;
            }
        };

        const updateCat = async (cat) => {
            const newName = prompt('編輯分類名稱：', cat.name);
            if (newName === null) return;
            if (!newName.trim()) {
                alert('分類名稱不能為空');
                return;
            }

            if (newName !== cat.name && categories.value.some(c => c.name === newName.trim())) {
                alert('分類名稱已存在');
                return;
            }

            try {
                await updateCategory(cat.id, newName, cat.color);
                console.log('✅ Category updated:', cat.id);
                alert('✅ 分類已更新');
                loadCategories();
            } catch (e) {
                console.error('Update category failed:', e);
                alert('❌ 編輯分類失敗');
            }
        };

        const deleteCat = async (cat) => {
            if (cat.id === 0) {
                alert('❌ 無法刪除「未分類」');
                return;
            }

            if (!confirm(`確認要刪除「${cat.name}」分類嗎？相關記事將轉移到「未分類」`)) {
                return;
            }

            try {
                await deleteCategory(cat.id);
                console.log('✅ Category deleted:', cat.id);
                alert('✅ 分類已刪除');
                loadCategories();
            } catch (e) {
                console.error('Delete category failed:', e);
                alert('❌ 刪除分類失敗');
            }
        };

        const goBack = () => {
            router.push('/categories');
        };

        const colors = [
            '#4CAF50', '#2196F3', '#FF9800', '#F44336',
            '#9C27B0', '#00BCD4', '#FFC107', '#795548',
            '#E91E63', '#009688', '#3F51B5', '#673AB7'
        ];

        return {
            categories,
            newCatName,
            newCatColor,
            colors,
            saving,
            addCategory,
            updateCat,
            deleteCat,
            goBack
        };
    },
    template: `
        <div class="container-fluid" style="padding: 16px; height: calc(100vh - 80px); display: flex; flex-direction: column;">
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                <button class="btn btn-sm btn-outline-secondary" @click="goBack">
                    ← 返回
                </button>
            </div>

            <div style="flex: 1; overflow-y: auto;">
                <div class="settings-group">
                    <h5>➕ 新增分類</h5>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start;">
                        <input 
                            v-model="newCatName" 
                            type="text" 
                            class="form-control form-control-sm" 
                            placeholder="輸入分類名稱"
                            :disabled="saving"
                            maxlength="20"
                        >
                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                            <div 
                                v-for="color in colors" 
                                :key="color"
                                style="width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 3px solid #ddd; transition: all 0.2s;" 
                                :style="{ 
                                    backgroundColor: color, 
                                    borderColor: newCatColor === color ? '#000' : '#ddd',
                                    transform: newCatColor === color ? 'scale(1.15)' : 'scale(1)'
                                }"
                                @click="newCatColor = color"
                                :title="color"
                            ></div>
                        </div>
                        <button class="btn btn-sm btn-primary" @click="addCategory" :disabled="saving">
                            {{ saving ? '新增中...' : '新增' }}
                        </button>
                    </div>
                </div>

                <div style="margin-top: 16px;">
                    <h6 style="color: #666; font-weight: 500; margin-bottom: 8px;">📂 現有分類</h6>
                    <div v-if="categories.length === 0" style="text-align: center; padding: 20px; color: #999;">
                        <small>還沒有分類</small>
                    </div>
                    <div v-else>
                        <div v-for="cat in categories" :key="cat.id" class="category-item">
                            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #ddd;" :style="{ backgroundColor: cat.color }"></div>
                                <div>
                                    <strong>{{ cat.name }}</strong>
                                    <div v-if="cat.id === 0" style="font-size: 11px; color: #999;">預設分類 - 無法編輯</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <button 
                                    v-if="cat.id !== 0"
                                    class="btn btn-sm btn-outline-primary" 
                                    @click="updateCat(cat)"
                                    title="編輯分類名稱"
                                >
                                    編輯
                                </button>
                                <button 
                                    v-if="cat.id !== 0"
                                    class="btn btn-sm btn-outline-danger" 
                                    @click="deleteCat(cat)"
                                    title="刪除此分類"
                                >
                                    刪除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

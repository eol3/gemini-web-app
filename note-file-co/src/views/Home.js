const { ref, computed, onMounted, onActivated } = Vue;
const { useRouter } = VueRouter;
import { useStore } from '../store.js';
import { getAllNotes, getAllCategories } from '../db.js';

export default {
    name: 'Home',
    setup() {
        const router = useRouter();
        const store = useStore();
        const notes = ref([]);
        const categories = ref([]);
        const selectedCategory = ref(null);
        const loading = ref(true);

        const loadNotes = () => {
            try {
                notes.value = getAllNotes();
                console.log(`✅ Loaded ${notes.value.length} notes`);
            } catch (e) {
                console.error('Failed to load notes:', e);
                alert('加載記事失敗');
            }
        };

        const loadCategories = () => {
            try {
                categories.value = getAllCategories();
                console.log(`✅ Loaded ${categories.value.length} categories`);
            } catch (e) {
                console.error('Failed to load categories:', e);
            }
        };

        onMounted(async () => {
            loading.value = true;
            await new Promise(r => setTimeout(r, 300));
            loadNotes();
            loadCategories();
            loading.value = false;
        });

        // Reload when returning to home
        onActivated(() => {
            loadNotes();
            loadCategories();
        });

        const filteredNotes = computed(() => {
            if (selectedCategory.value === null) {
                return notes.value;
            }
            return notes.value.filter(n => n.category_id === selectedCategory.value);
        });

        const openNote = (noteId) => {
            store.selectedNoteId = noteId;
            router.push(`/note/${noteId}`);
        };

        const createNewNote = () => {
            router.push('/note');
        };

        const goToCategories = () => {
            router.push('/categories');
        };

        const refreshNotes = () => {
            loading.value = true;
            loadNotes();
            loadCategories();
            setTimeout(() => { loading.value = false; }, 300);
        };

        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
        };

        const getPreview = (content) => {
            if (!content) return '無內容';
            return content.substring(0, 50).replace(/\n/g, ' ');
        };

        return {
            notes,
            categories,
            filteredNotes,
            selectedCategory,
            loading,
            openNote,
            createNewNote,
            goToCategories,
            refreshNotes,
            formatDate,
            getPreview
        };
    },
    template: `
        <div class="container-fluid" style="padding: 16px; height: calc(100vh - 80px); display: flex; flex-direction: column;">
            <div style="display: flex; gap: 8px; margin-bottom: 16px; align-items: center;">
                <button class="btn btn-sm btn-outline-primary" @click="createNewNote" title="新增記事">
                    ➕ 新增記事
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="goToCategories" title="分類管理">
                    📂 所有分類
                </button>
                <button class="btn btn-sm btn-outline-info" @click="refreshNotes" :disabled="loading" title="重新加載">
                    🔄
                </button>
                <div style="flex: 1;"></div>
                <select v-model.number="selectedCategory" class="form-select form-select-sm" style="max-width: 150px;" title="篩選分類">
                    <option :value="null">所有記事</option>
                    <option value="0">未分類</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.name }}
                    </option>
                </select>
            </div>

            <div class="notes-list" style="flex: 1; overflow-y: auto; position: relative;">
                <div v-if="loading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;">⏳</div>
                        <small style="color: #999;">加載中...</small>
                    </div>
                </div>
                <div v-else-if="filteredNotes.length === 0" style="text-align: center; padding: 40px; color: #999;">
                    <p style="font-size: 32px; margin-bottom: 8px;">📭</p>
                    <p>還沒有記事</p>
                    <small>點擊「新增記事」建立您的第一則記事</small>
                </div>
                <div v-else>
                    <div 
                        v-for="note in filteredNotes" 
                        :key="note.id" 
                        class="note-item"
                        @click="openNote(note.id)"
                        style="cursor: pointer;"
                    >
                        <div class="note-title">{{ note.title || '(無標題)' }}</div>
                        <div class="note-preview">{{ getPreview(note.content) }}</div>
                        <div>
                            <span v-if="note.category_name" class="note-category">
                                {{ note.category_name }}
                            </span>
                            <span class="note-date">{{ formatDate(note.updated_at) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getNote, saveNote, deleteNote, getCategories } from '../db.js';

export default {
  template: `
    <div class="d-flex flex-column vh-100" style="height: 80vh !important;"> <!-- Override to fit in padding -->
        <!-- Header -->
        <div class="navbar">
            <button @click="goBack" class="btn-link" style="font-size: 1.2rem; color: var(--text-secondary);">&lsaquo; 返回</button>
            
            <div style="display: flex; gap: 10px;">
                <button v-if="!isNew" @click="remove" style="color: var(--danger-color);">刪除</button>
                <button @click="save" class="btn-primary">儲存</button>
            </div>
        </div>

        <!-- Editor -->
        <div style="flex: 1; display: flex; flex-direction: column;">
            <input 
                v-model="note.title" 
                class="input-title" 
                placeholder="標題"
            >
            
            <div class="mb-3">
                 <select v-model="note.category_id" class="form-select border-0 px-0 shadow-none text-muted w-auto" style="background: transparent;">
                    <option :value="null">未分類</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.name }}
                    </option>
                </select>
            </div>

            <textarea 
                v-model="note.content" 
                class="input-content" 
                placeholder="開始寫作..."
            ></textarea>
        </div>
    </div>
    `,
  setup() {
    const route = useRoute();
    const useRouterInstance = useRouter();
    const isNew = ref(true);
    const note = ref({
      title: '',
      content: '',
      category_id: null
    });
    const categories = ref([]);

    onMounted(async () => {
      categories.value = await getCategories();
      const id = route.params.id;
      if (id && id !== 'new') {
        isNew.value = false;
        const loadedNote = await getNote(id);
        if (loadedNote) {
          note.value = loadedNote;
        }
      }
    });

    const save = async () => {
      if (!note.value.title && !note.value.content) return;
      await saveNote(note.value);
      goBack();
    };

    const remove = async () => {
      if (confirm('確定刪除此記事？')) {
        await deleteNote(note.value.id);
        goBack();
      }
    };

    const goBack = () => {
      useRouterInstance.push('/');
    };

    return {
      note,
      categories,
      isNew,
      save,
      remove,
      goBack
    };
  }
}

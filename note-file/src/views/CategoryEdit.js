import { ref, onMounted } from 'vue';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../db.js';

export default {
  template: `
    <div class="d-flex flex-column vh-100 bg-light">
        <!-- Header -->
        <nav class="navbar navbar-light bg-white border-bottom px-3">
            <span class="navbar-brand mb-0 h1 mx-auto">編輯分類</span>
            <router-link to="/categories" class="btn btn-link text-primary p-0 text-decoration-none">
                完成
            </router-link>
        </nav>

        <!-- Edit List -->
        <div class="container py-3">
            <div class="list-group shadow-sm mb-3">
                <div v-for="cat in categories" :key="cat.id" class="list-group-item bg-white border-0 border-bottom p-2 d-flex align-items-center">
                    <button @click="remove(cat.id)" class="btn btn-link text-danger p-0 me-2">
                        <span class="fs-4">&minus;</span>
                    </button>
                    <input 
                        v-model="cat.name" 
                        @change="update(cat)"
                        class="form-control border-0 shadow-none p-0"
                    >
                    <span class="text-muted ms-2 fs-4">&equiv;</span> <!-- Handle for drag (not impl) -->
                </div>
            </div>

            <button @click="add" class="btn btn-link text-primary text-decoration-none p-0">
                <span class="fs-5">+</span> 新增分類
            </button>
        </div>
    </div>
    `,
  setup() {
    const categories = ref([]);

    const load = async () => {
      categories.value = await getCategories();
    };

    const add = async () => {
      await addCategory('新分類');
      await load();
    };

    const update = async (cat) => {
      await updateCategory(cat.id, cat.name);
    };

    const remove = async (id) => {
      if (confirm('確定刪除此分類？分類下的記事將變為未分類。')) {
        await deleteCategory(id);
        await load();
      }
    };

    onMounted(load);

    return {
      categories,
      add,
      update,
      remove
    };
  }
}

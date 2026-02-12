import { ref, onMounted } from 'vue';
import { getCategories } from '../db.js';

export default {
  template: `
    <div class="d-flex flex-column vh-100 bg-light">
        <!-- Header -->
        <nav class="navbar navbar-light bg-white border-bottom px-3">
            <router-link to="/" class="btn btn-link text-dark p-0 text-decoration-none">
                <span class="fs-5">&lsaquo; 返回</span>
            </button>
            <span class="navbar-brand mb-0 h1 mx-auto">所有分類</span>
            <router-link to="/categories/edit" class="btn btn-link text-primary p-0 text-decoration-none">
                編輯
            </router-link>
        </nav>

        <!-- Category List -->
        <div class="container py-3">
             <div v-if="loading" class="text-center mt-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            
            <div v-else class="list-group shadow-sm">
                <router-link to="/" class="list-group-item list-group-item-action border-0 d-flex justify-content-between align-items-center">
                    所有記事
                    <i class="bi bi-chevron-right text-muted"></i>
                </router-link>
                <!-- Maybe separating "All Notes" from actual categories? The UI plan says "單純顯示分類" -->
                <div v-for="cat in categories" :key="cat.id" class="list-group-item bg-white border-0 border-top d-flex justify-content-between align-items-center">
                    {{ cat.name }}
                    <!-- The plan implies this page is for viewing. Maybe clicking a category filters notes? 
                         "點「所有分類」進入「記事本分類頁.jpg」"
                         If so, clicking a category should probably go to Home with a filter.
                         But Home.js currently lists all notes. I might need to add filtering to Home.js.
                    -->
                </div>
            </div>
             <p class="text-muted text-center mt-3 small">點擊「編輯」可管理分類</p>
        </div>
    </div>
    `,
  setup() {
    const categories = ref([]);
    const loading = ref(true);

    onMounted(async () => {
      loading.value = true;
      categories.value = await getCategories();
      loading.value = false;
    });

    return {
      categories,
      loading
    };
  }
}

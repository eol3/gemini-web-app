import { ref, onMounted } from 'vue';
import { getNotes, getCategories } from '../db.js';
import { store } from '../store.js';

export default {
  template: `
    <div class="home-container">
        <!-- Header -->
        <header class="navbar">
            <div class="navbar-brand">{{ store.appName }}</div>
            <nav>
                <router-link to="/categories">分類</router-link>
                <router-link to="/settings">設定</router-link>
                <router-link to="/note/new" class="btn-primary">+ 新增</router-link>
            </nav>
        </header>

        <!-- Main Content -->
        <div v-if="loading" class="text-center mt-5">
            <div class="spinner-border text-secondary" role="status"></div>
        </div>

        <div v-else-if="notes.length === 0" class="empty-state">
            <p>尚無記事，開始新增一則吧！</p>
        </div>

        <div v-else class="notes-list">
            <router-link 
                v-for="note in notes" 
                :key="note.id" 
                :to="'/note/' + note.id"
                class="note-card"
            >
                <div class="note-header">
                    <h3>{{ note.title || '無標題' }}</h3>
                </div>
                <div class="note-content">{{ note.content }}</div>
                <div class="note-footer">
                    <span>{{ formatDate(note.updated_at) }}</span>
                </div>
            </router-link>
        </div>
    </div>
    `,
  setup() {
    const notes = ref([]);
    const loading = ref(true);

    const loadData = async () => {
      loading.value = true;
      try {
        notes.value = await getNotes();
      } catch (e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (timestamp) => {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleDateString();
    };

    onMounted(() => {
      loadData();
    });

    return {
      notes,
      loading,
      formatDate,
      store
    };
  }
}

const Home = {
  data() {
    return {
      notes: [],
      currentNote: null,
      searchQuery: ''
    }
  },
  computed: {
    filteredNotes() {
      if (!this.searchQuery) return this.notes
      const query = this.searchQuery.toLowerCase()
      return this.notes.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      )
    }
  },
  mounted() {
    this.loadNotes()
  },
  methods: {
    async loadNotes() {
      this.notes = window.EXPORTED_NOTES || [];
    },

    viewNote(note) {
      this.$router.push('/note/' + note.id)
    }
  },
  template: `
    <div class="home-container">
      <div class="header">
        <div class="search-container">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="搜尋記事..." 
            class="search-input"
          >
        </div>

      </div>

      <!-- 記事列表 -->
      <div class="notes-list">
        <div v-if="filteredNotes.length === 0" class="empty-state">
          <p v-if="!searchQuery">還沒有任何記事</p>
          <p v-else>找不到符合「{{ searchQuery }}」的記事</p>
          <p v-if="!searchQuery">點擊上方「新增記事」按鈕開始使用 (預覽模式無法新增)</p>
        </div>
        
        <div v-for="note in filteredNotes" :key="note.id" class="note-card" @click="viewNote(note)">
          <div class="note-header">
            <h3>{{ note.title }}</h3>

          </div>
          <div class="note-content">{{ note.content }}</div>
          <div class="note-footer">
            <small>{{ note.createdAt }}</small>
          </div>
        </div>
      </div>
    </div>
  `
}

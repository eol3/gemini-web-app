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
      if (this.$root.isExport) {
        // Load from global variable injected by data.js
        this.notes = window.EXPORTED_NOTES || []
      } else {
        const saved = localStorage.getItem('notes')
        if (saved) {
          this.notes = JSON.parse(saved)
        }
      }
    },
    saveNotes() {
      if (this.$root.isExport) return
      localStorage.setItem('notes', JSON.stringify(this.notes))
    },
    addNote() {
      if (this.$root.isExport) return
      this.$router.push('/note/new')
    },
    viewNote(note) {
      this.$router.push('/note/' + note.id)
    },
    editNote(note) {
      if (this.$root.isExport) return
      this.$router.push('/note/' + note.id + '/edit')
    },
    deleteNote(note) {
      if (this.$root.isExport) return
      if (confirm('確定要刪除這則記事嗎？')) {
        const index = this.notes.indexOf(note)
        if (index > -1) {
          this.notes.splice(index, 1)
          this.saveNotes()
        }
      }
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
        <div class="header-actions" v-if="!$root.isExport">
          <button @click="addNote" class="btn-add">+ 新增記事</button>
        </div>
      </div>

      <!-- 記事列表 -->
      <div class="notes-list">
        <div v-if="filteredNotes.length === 0" class="empty-state">
          <p v-if="!searchQuery">還沒有任何記事</p>
          <p v-else>找不到符合「{{ searchQuery }}」的記事</p>
          <p v-if="!searchQuery && !$root.isExport">點擊上方「新增記事」按鈕開始使用</p>
        </div>
        
        <div v-for="note in filteredNotes" :key="note.id" class="note-card" @click="viewNote(note)">
          <div class="note-header">
            <h3>{{ note.title }}</h3>
            <div class="note-actions" @click.stop v-if="!$root.isExport">
              <button @click="editNote(note)" class="btn-edit">編輯</button>
              <button @click="deleteNote(note)" class="btn-delete">刪除</button>
            </div>
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

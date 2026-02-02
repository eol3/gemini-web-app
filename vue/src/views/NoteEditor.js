const NoteEditor = {
  data() {
    return {
      note: {
        title: '',
        content: ''
      },
      isNew: true
    }
  },
  mounted() {
    this.checkMode()
  },
  methods: {
    checkMode() {
      const id = this.$route.params.id
      if (id) {
        this.isNew = false
        this.loadNote(parseInt(id))
      }
    },
    loadNote(id) {
      const saved = localStorage.getItem('notes')
      if (saved) {
        const notes = JSON.parse(saved)
        const found = notes.find(n => n.id === id)
        if (found) {
          this.note = { ...found }
        } else {
          alert('找不到該記事')
          this.$router.push('/')
        }
      }
    },
    saveNote() {
      if (!this.note.title.trim()) {
        alert('請輸入標題')
        return
      }

      const saved = localStorage.getItem('notes')
      let notes = saved ? JSON.parse(saved) : []

      if (this.isNew) {
        // Create
        notes.push({
          id: Date.now(),
          title: this.note.title,
          content: this.note.content,
          createdAt: new Date().toLocaleString('zh-TW')
        })
      } else {
        // Update
        const index = notes.findIndex(n => n.id === this.note.id)
        if (index !== -1) {
          notes[index] = {
            ...notes[index],
            title: this.note.title,
            content: this.note.content
          }
        }
      }

      localStorage.setItem('notes', JSON.stringify(notes))
      this.$router.back()
    },
    cancel() {
      this.$router.back()
    }
  },
  template: `
    <div class="editor-container">
      <div class="editor-header">
        <h3>{{ isNew ? '新增記事' : '編輯記事' }}</h3>
        <div class="editor-actions">
          <button @click="cancel" class="btn-cancel">取消</button>
          <button @click="saveNote" class="btn-save">儲存</button>
        </div>
      </div>
      
      <div class="editor-form">
        <input 
          v-model="note.title" 
          type="text" 
          placeholder="標題"
          class="input-title"
          autofocus
        />
        <textarea 
          v-model="note.content" 
          placeholder="開始輸入內容..."
          class="input-content"
          spellcheck="false"
        ></textarea>
      </div>
    </div>
  `
}

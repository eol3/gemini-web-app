const NoteDetail = {
  data() {
    return {
      note: null
    }
  },
  mounted() {
    this.loadNote()
  },
  methods: {
    async loadNote() {
      const id = parseInt(this.$route.params.id)
      let notes = []

      if (this.$root.isExport) {
        notes = window.EXPORTED_NOTES || []
      } else {
        const saved = localStorage.getItem('notes')
        if (saved) {
          notes = JSON.parse(saved)
        }
      }

      this.note = notes.find(n => n.id === id)
    },
    goBack() {
      this.$router.push('/')
    },
    editNote() {
      // Implement navigation to edit page or open modal if we move edit logic here too.
      // For now, let's keep it simple and maybe just allow editing from Home or add logic later.
      // Actually, the user asked for PREVIEW, so editing might not be strictly required here yet, 
      // but the Mock had "Edit". Let's stick to Preview first as requested.
      // If we need to edit, we might need to pass state back or handle it here.
      // Let's just alert for now or omit if not critical, but the previous modal had edit.
      // Let's implement fully functional edit later or simply navigate back with an "open edit" intent?
      // Simpler: Just rely on Home for editing for now, or add Edit logic here.
      // Given the request is "Preview", I'll stick to a nice read-only view with a Back button.
      // If I want to support Edit from here, I would need to duplicate the edit logic or make a shared component.
      // I'll add a placeholder for now.
      alert('請返回列表進行編輯')
    }
  },
  template: `
    <div class="note-detail-container" v-if="note">
      <div class="detail-header">
        <button @click="goBack" class="btn-back">← 返回列表</button>
        <div class="detail-actions">
            <!-- Optional: <button @click="editNote" class="btn-edit">編輯</button> -->
        </div>
      </div>
      
      <div class="detail-content-card">
        <h1 class="detail-title">{{ note.title }}</h1>
        <div class="detail-meta">
          <span>建立時間：{{ note.createdAt }}</span>
        </div>
        <div class="detail-body">
          {{ note.content }}
        </div>
      </div>
    </div>
    <div v-else class="not-found">
      <p>找不到該記事</p>
      <button @click="goBack" class="btn-back">返回列表</button>
    </div>
  `
}

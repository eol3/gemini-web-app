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

      notes = window.EXPORTED_NOTES || [];

      this.note = notes.find(n => n.id === id)
    },
    goBack() {
      this.$router.push('/')
    }
  },
  template: `
    <div class="note-detail-container" v-if="note">
      <div class="detail-header">
        <button @click="goBack" class="btn-back">← 返回列表</button>

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

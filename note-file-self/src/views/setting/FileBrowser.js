import { ref, onMounted } from 'vue';

export default {
  setup() {
    const files = ref([]);

    const getFiles = async () => {
      files.value = [];
      const root = await navigator.storage.getDirectory();
      for await (const entry of root.values()) {
        files.value.push({ name: entry.name });
      }
    };

    const deleteFile = async (file) => {
      if (!confirm(`Delete "${file.name}"?`)) return;
      const root = await navigator.storage.getDirectory();
      try {
        await root.removeEntry(file.name);
        await getFiles();
      } catch (e) {
        console.error(e);
        alert('刪除失敗');
      }
    };

    onMounted(getFiles);

    return {
      files,
      deleteFile
    };
  },
  template: /* html */`
    <div>
      <div class="d-flex flex-wrap">
        <div class="card m-3 position-relative" style="width: 200px;" v-for="file in files" :key="file.name">
          <div class="card-img-top d-flex justify-content-center align-items-center border-bottom" style="aspect-ratio: 16 / 10;">
            <i class="bi bi-file-earmark"></i>
          </div>
          <div class="card-body p-1">
            <div class="d-flex justify-content-between align-items-center">
              <div class="cut-text p-2">{{ file.name }}</div>
              <div class="dropdown">
                <button class="btn btn-secondary dropdown-toggle bg-white text-black border" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-three-dots"></i>
                </button>
                <ul class="dropdown-menu">
                  <li>
                    <button class="dropdown-item" @click.stop="deleteFile(file)">刪除</button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
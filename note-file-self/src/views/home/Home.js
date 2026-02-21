import { ref } from 'vue';
import { getAllNotes } from '../../services/database.js';

export default {
  setup() {
    const list = ref([]);

    list.value = getAllNotes()

    return {
      list
    }
  },
  template: /* html */`
    <div>
      <h1>首頁</h1>
      <div v-for="item in list" :key="item.id">
        <h2>{{ item.title }}</h2>
        <p>{{ item.content }}</p>
      </div>
    </div>
  `
}
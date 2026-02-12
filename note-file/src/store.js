import { reactive, watch } from 'vue';
import { getSetting } from './db.js';

export const store = reactive({
  appName: '記事本',
  theme: 'default'
});

export async function initStore() {
  try {
    const name = await getSetting('app_name');
    if (name) store.appName = name;

    const theme = await getSetting('theme');
    if (theme) store.theme = theme;
  } catch (e) {
    console.error('Failed to init store:', e);
  }
}

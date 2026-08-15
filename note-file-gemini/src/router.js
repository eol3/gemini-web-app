import { createRouter, createWebHashHistory } from 'vue-router';

import Home from './views/Home.js';
import Categories from './views/Categories.js';
import CategoryEdit from './views/CategoryEdit.js';
import NoteEditor from './views/NoteEditor.js';
import Settings from './views/Settings.js';

const routes = [
  { path: '/', component: Home },
  { path: '/categories', component: Categories },
  { path: '/categories/edit', component: CategoryEdit },
  { path: '/note/:id', component: NoteEditor },
  { path: '/settings', component: Settings }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;

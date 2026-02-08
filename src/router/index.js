import { createRouter, createWebHashHistory } from 'vue-router'
import KeymapView from '../views/KeymapView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  { path: '/', component: KeymapView },
  { path: '/settings', component: SettingsView },
]

const router = createRouter({
  // Use Hash History for "no server" compatibility if needed, though Web History is fine for local dev.
  // Hash is safer if user just opens index.html (but they can't cause Serial API needs secure context).
  // Let's stick to Hash to be safe for file:// usage if they bypass serial restriction or use localhost without rewrites.
  history: createWebHashHistory(),
  routes,
})

export default router

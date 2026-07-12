import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

// 开发用：控制台执行 __resetAll() 清除全部数据
window.__resetAll = () => {
  localStorage.removeItem('todo_calendar_data')
  const req = indexedDB.deleteDatabase('TodoCalendarFiles')
  req.onsuccess = () => location.reload()
  req.onerror = () => location.reload()
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

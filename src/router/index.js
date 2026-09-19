import { createRouter, createWebHistory } from 'vue-router'
import { hasSession, restoreFromStorage, sessionRestored } from '../session.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../components/LoginPage.vue'),
  },
  {
    path: '/',
    name: 'Main',
    component: () => import('../components/MainPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * 导航守卫。
 *
 * 改造前读的是 localStorage 里的 todo_calendar_data.currentUser；
 * 现在读令牌是否存在——因为「谁登录了」这件事已经不在本地了，
 * 由令牌代表。
 *
 * 注意这里只做**同步的、本地的**判断（有没有令牌），不请求网络。
 * 守卫里发请求会让每次跳转都卡一下，而且失败处理很麻烦。
 * 令牌是否真的有效由 MainPage 加载时调 /api/me 确认。
 */
router.beforeEach((to) => {
  // 首次进入时从 localStorage 恢复用户名，避免刷新页面时闪一下登录页
  if (!sessionRestored.value) {
    restoreFromStorage()
  }

  const loggedIn = hasSession()

  if (to.meta.requiresAuth && !loggedIn) {
    return { path: '/login' }
  }
  if (to.path === '/login' && loggedIn) {
    return { path: '/' }
  }
  return true
})

export default router

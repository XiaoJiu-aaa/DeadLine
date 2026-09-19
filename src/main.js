import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { onUnauthorized } from './api/client.js'
import './styles/main.css'

/**
 * 令牌失效时的统一处理：踢回登录页。
 *
 * ★ 注册在这里而不是写在 client.js 内部，是为了避免循环依赖——
 * client 是底层的网络工具，不该知道路由的存在；反过来路由守卫又要用
 * client 的 getToken。用回调把两者解开，方向就单一了：
 * client 负责「通知」，main 负责「决定做什么」。
 */
onUnauthorized(() => {
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
})

/**
 * 开发用：控制台执行 __resetAll() 清除登录状态。
 *
 * 改造前它是「清除全部数据」——那时候数据都在浏览器里，清掉就真没了。
 * 现在数据在服务器上，这个函数**没有能力**清空后端数据库，
 * 它只清本地的令牌和用户名（相当于强制退出登录）。
 *
 * 要清空后端数据，得在虚拟机上执行 SQL。
 *
 * 故意不清 deadline_api_base：那个是「服务器地址」配置，
 * 开发时反复退出登录不该把地址也弄丢。
 */
window.__resetAll = () => {
  localStorage.removeItem('deadline_token')
  localStorage.removeItem('deadline_username')
  location.reload()
}

/** 只在需要换服务器时用（比如隧道地址变了） */
window.__resetServerAddress = () => {
  localStorage.removeItem('deadline_api_base')
  location.reload()
}

const app = createApp(App)
app.use(router)
app.mount('#app')

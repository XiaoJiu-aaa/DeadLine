import { ref } from 'vue'
import * as client from './api/client.js'
import { auth } from './api/index.js'

/**
 * 当前登录用户的状态。
 *
 * 为什么用模块级的 ref 而不是 Pinia store？
 * 因为整个应用只有「当前用户是谁」这一个全局状态，为此引入一个 store
 * 目录、定义 store、在每个组件里 useXxxStore()，收益不足以抵消复杂度。
 * 需要的时候再升级到 Pinia 也不难。
 */

/** 当前用户名。空字符串表示未登录 */
export const currentUser = ref('')

/** 刚从 localStorage 恢复、还没向后端验证过——用于避免界面闪烁 */
export const sessionRestored = ref(false)

export function hasSession() {
  return !!client.getToken()
}

export function startSession(token, username) {
  client.setToken(token)
  client.setUsername(username)
  currentUser.value = username
}

export function endSession() {
  client.clearToken()
  currentUser.value = ''
}

/**
 * 从 localStorage 恢复用户名，不做网络请求。
 *
 * 只是为了「刷新页面时不要闪一下登录页」。
 * 令牌是否真的还有效，由 verify() 向后端确认。
 */
export function restoreFromStorage() {
  currentUser.value = client.getUsername()
  sessionRestored.value = true
}

/**
 * 向后端确认本地令牌是否还有效。
 *
 * 为什么需要这一步？因为令牌是无状态的——后端不记录「谁登录了」，
 * 它只看令牌本身。所以本地存着的令牌可能：
 *   - 已经过期
 *   - 对应的用户已经被删除
 *   - 是我们换了 JWT 密钥之前的旧令牌
 * 这几种情况下，本地看起来「有令牌」，实际已经不能用了。
 *
 * @returns true 表示有效
 * @throws 网络错误时抛出（调用方要区分「令牌无效」和「连不上后端」——
 *         后者不该把用户踢下线，只是暂时用不了）
 */
export async function verify() {
  if (!hasSession()) {
    currentUser.value = ''
    return false
  }

  try {
    const me = await auth.me()
    // 用后端返回的用户名覆盖本地的，避免本地存的是旧值
    client.setUsername(me.username)
    currentUser.value = me.username
    return true
  } catch (e) {
    if (e.isUnauthorized) {
      endSession()
      return false
    }
    // 连不上后端：令牌可能没问题，只是暂时验证不了。
    // 不清理令牌，让调用方决定怎么提示
    throw e
  }
}

/**
 * 唯一的网络出口。
 *
 * ★ 规则：所有请求都必须从这里出去，组件里不要直接写 fetch。
 *
 * 这样做的理由：后端地址、令牌注入、401 处理、错误信息提取这些事情
 * 只在一个地方实现。将来地址变了、接口调整了、错误格式改了，
 * 都只改这一个文件，不用去几十个组件里找。
 */

const TOKEN_KEY = 'deadline_token'
const USERNAME_KEY = 'deadline_username'
const API_BASE_KEY = 'deadline_api_base'

// ==================== 后端地址（运行时可配置）====================

/**
 * 后端地址是「运行时配置」而不是「构建时写死」的。
 *
 * 因为 cloudflared 快速隧道的地址每次重启都会变。如果写死在代码里，
 * 每次地址变化都要重新构建、重新部署前端。
 * 做成设置项之后，地址变了只需要在界面上改一下。
 */
export function getApiBase() {
  return localStorage.getItem(API_BASE_KEY) || ''
}

export function setApiBase(url) {
  // 去掉末尾的斜杠：用户可能填 "https://x.com/" 也可能填 "https://x.com"
  // 不处理的话会拼出 "https://x.com//api/..."
  const clean = (url || '').trim().replace(/\/+$/, '')
  localStorage.setItem(API_BASE_KEY, clean)
}

export function hasApiBase() {
  return getApiBase() !== ''
}

// ==================== 令牌 ====================

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getUsername() {
  return localStorage.getItem(USERNAME_KEY) || ''
}

export function setUsername(name) {
  localStorage.setItem(USERNAME_KEY, name)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

// ==================== 错误 ====================

export class ApiError extends Error {
  constructor(status, message, cause) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.cause = cause
  }

  /** 令牌失效，需要重新登录 */
  get isUnauthorized() {
    return this.status === 401
  }

  /** 连不上后端（网络层就失败了，不是后端返回的错误） */
  get isNetworkError() {
    return this.status === 0
  }
}

// ==================== 401 的全局处理 ====================

/**
 * 令牌失效时要做的事（通常是跳登录页）。
 *
 * 这里用一个回调而不是直接 import router，是为了避免循环依赖：
 * router 的守卫要用 client 的 getToken，client 又要用 router 跳转，
 * 互相 import 会让模块初始化顺序变得不确定。
 *
 * 由 main.js 在启动时注册。
 */
let unauthorizedHandler = null

export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

// ==================== 核心请求 ====================

async function request(path, { method = 'GET', body, formData, raw = false } = {}) {
  const base = getApiBase()
  if (!base) {
    throw new ApiError(0, '还没有配置服务器地址，请在设置里填写后端地址')
  }

  const headers = {}
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let payload
  if (formData) {
    // 不要手动设置 Content-Type：浏览器需要自己加上
    // multipart/form-data; boundary=... ，手写会漏掉 boundary，
    // 后端就解析不出文件了
    payload = formData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(base + path, { method, headers, body: payload })
  } catch (e) {
    // fetch 只在网络层失败时 reject（DNS 解析不了、连不上、被 CORS 拦下）。
    // HTTP 层面的错误（400/500）不会走到这里，而是拿到一个 response。
    //
    // 这个区分对用户很重要：「连不上」和「后端说不行」是完全不同的两回事。
    throw new ApiError(
      0,
      '连不上后端。请检查：① 设置的服务器地址对不对；② 虚拟机上的后端和隧道是否在运行。',
      e,
    )
  }

  if (response.status === 401) {
    clearToken()
    if (unauthorizedHandler) unauthorizedHandler()
    throw new ApiError(401, await extractMessage(response))
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractMessage(response))
  }

  if (raw) {
    return response
  }
  if (response.status === 204) {
    return null
  }
  return response.json()
}

/**
 * 从错误响应里取出可读的信息。
 *
 * 后端统一的错误格式是 {"message": "..."}，但不能假设它一定成功——
 * 比如 502 是 Cloudflare 返回的，响应体可能是 HTML。
 * 所以这里要防御性地处理解析失败的情况。
 */
async function extractMessage(response) {
  try {
    const contentType = response.headers.get('Content-Type') || ''
    if (contentType.includes('application/json')) {
      const data = await response.json()
      if (data && typeof data.message === 'string' && data.message) {
        return data.message
      }
    }
  } catch (_) {
    // 解析失败就往下走，用兜底信息
  }

  if (response.status === 502 || response.status === 503) {
    // 这两个通常不是后端返回的，而是隧道/网关在「后端不可达」时的响应
    return '后端暂时不可用（隧道连着但后端没响应），请检查虚拟机上的服务是否在运行'
  }
  return `请求失败（HTTP ${response.status}）`
}

// ==================== 对外方法 ====================

export function get(path) {
  return request(path)
}

export function post(path, body) {
  return request(path, { method: 'POST', body })
}

export function put(path, body) {
  return request(path, { method: 'PUT', body })
}

export function patch(path, body) {
  return request(path, { method: 'PATCH', body })
}

export function del(path) {
  return request(path, { method: 'DELETE' })
}

/** 上传文件。字段名必须是 file —— 后端 @RequestParam("file") 是这么定的 */
export function upload(path, file) {
  const fd = new FormData()
  fd.append('file', file)
  return request(path, { method: 'POST', formData: fd })
}

/**
 * 取回二进制内容。
 *
 * ★ 为什么不能用 <a href=".../api/attachments/1"> 直接下载？
 *
 * 因为浏览器直接跳转是「新的导航请求」，不会带上 Authorization 头，
 * 后端会稳定返回 401。这是新手做文件下载最容易踩的坑。
 *
 * 正确做法就是用 fetch 把内容取回来（带着令牌），
 * 再在内存里造一个临时链接触发下载。
 */
export async function getBlob(path) {
  const response = await request(path, { raw: true })
  return response.blob()
}

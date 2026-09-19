import { del, get, getBlob, patch, post, put, upload } from './client.js'

/**
 * 所有后端接口的清单。
 *
 * 组件里只写 `await api.tasks.create(data)`，不出现任何路径字符串。
 * 这样接口路径改了只改这一个文件，而且这里一眼能看全后端提供了什么。
 */

export const auth = {
  register: (username, password) => post('/api/auth/register', { username, password }),
  login: (username, password) => post('/api/auth/login', { username, password }),
  /** 校验本地令牌是否还有效 */
  me: () => get('/api/me'),
}

export const tasks = {
  list: () => get('/api/tasks'),
  create: (data) => post('/api/tasks', data),
  update: (id, data) => put(`/api/tasks/${id}`, data),
  setCompleted: (id, completed) => patch(`/api/tasks/${id}/complete`, { completed }),
  remove: (id) => del(`/api/tasks/${id}`),
  /** 清除某日期之前的全部任务，返回删除条数 */
  clearArchive: (before) => del(`/api/tasks?before=${before}`),
}

export const markedDays = {
  /** 返回 { importantDays: [], specialDays: [] } */
  list: () => get('/api/marked-days'),
  /**
   * 设置或取消某天的标记。
   * type 传 'important' | 'special' 是设置，传 null 是取消。
   */
  set: (date, type) => put(`/api/marked-days/${date}`, { type }),
}

export const diaries = {
  /**
   * 取某天的日记。没有记录时后端返回空日记对象（不是 404、也不是 null），
   * 所以这里永远拿到同一个形状，不用判空。
   */
  get: (date) => get(`/api/diaries/${date}`),
  save: (date, data) => put(`/api/diaries/${date}`, data),
}

export const attachments = {
  upload: (taskId, file) => upload(`/api/tasks/${taskId}/attachments`, file),
  /**
   * 下载附件。
   *
   * ★ 返回的是 Blob，不是可以直接放进 href 的 URL。
   * 因为请求需要带 Authorization 头，而浏览器直接跳转不会带。
   * 调用方要自己 URL.createObjectURL(blob) 造临时链接。
   */
  downloadBlob: (id) => getBlob(`/api/attachments/${id}`),
  remove: (id) => del(`/api/attachments/${id}`),
}

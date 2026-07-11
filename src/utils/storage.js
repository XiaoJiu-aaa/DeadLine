const STORAGE_KEY = 'todo_calendar_data'

function read() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { currentUser: null, users: {} }
  return JSON.parse(raw)
}

function write(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getCurrentUser() {
  return read().currentUser
}

export function getUsers() {
  return read().users
}

export function getUserData(username) {
  const users = getUsers()
  return users[username] || null
}

export function setCurrentUser(username) {
  const data = read()
  data.currentUser = username
  write(data)
}

export function clearCurrentUser() {
  const data = read()
  data.currentUser = null
  write(data)
}

export function registerUser(username, password) {
  const data = read()
  if (data.users[username]) return false
  data.users[username] = {
    password: hashPassword(password),
    tasks: [],
  }
  data.currentUser = username
  write(data)
  return true
}

export function validateLogin(username, password) {
  const data = read()
  const user = data.users[username]
  if (!user) return 'not_found'
  if (user.password !== hashPassword(password)) return 'wrong_pwd'
  data.currentUser = username
  write(data)
  return user
}

export function getAllTasks(username) {
  const user = getUserData(username)
  return user ? user.tasks : []
}

export function saveAllTasks(username, tasks) {
  const data = read()
  if (data.users[username]) {
    data.users[username].tasks = tasks
    write(data)
  }
}

function hashPassword(pwd) {
  return btoa(unescape(encodeURIComponent(pwd)))
}

// ===== Important Days =====
export function getImportantDays(username) {
  const user = getUserData(username)
  return (user && user.importantDays) ? user.importantDays : []
}

export function toggleImportantDay(username, dateStr) {
  const data = read()
  if (!data.users[username]) return null
  if (!data.users[username].importantDays) data.users[username].importantDays = []
  if (!data.users[username].specialDays) data.users[username].specialDays = []
  const imp = data.users[username].importantDays
  const sp = data.users[username].specialDays
  const idx = imp.indexOf(dateStr)
  if (idx === -1) {
    // Remove from special if exists (mutual exclusion)
    const spIdx = sp.indexOf(dateStr)
    if (spIdx !== -1) sp.splice(spIdx, 1)
    imp.push(dateStr)
  } else {
    imp.splice(idx, 1)
  }
  write(data)
  return { importantDays: imp, specialDays: sp }
}

// ===== Special Days (circle) =====
export function getSpecialDays(username) {
  const user = getUserData(username)
  return (user && user.specialDays) ? user.specialDays : []
}

export function toggleSpecialDay(username, dateStr) {
  const data = read()
  if (!data.users[username]) return null
  if (!data.users[username].importantDays) data.users[username].importantDays = []
  if (!data.users[username].specialDays) data.users[username].specialDays = []
  const imp = data.users[username].importantDays
  const sp = data.users[username].specialDays
  const idx = sp.indexOf(dateStr)
  if (idx === -1) {
    const impIdx = imp.indexOf(dateStr)
    if (impIdx !== -1) imp.splice(impIdx, 1)
    sp.push(dateStr)
  } else {
    sp.splice(idx, 1)
  }
  write(data)
  return { importantDays: imp, specialDays: sp }
}

// ===== Diary =====
export function getDiary(username, dateStr) {
  const user = getUserData(username)
  if (!user || !user.diaries) return null
  return user.diaries[dateStr] || null
}

export function saveDiary(username, dateStr, diary) {
  const data = read()
  if (!data.users[username]) return
  if (!data.users[username].diaries) data.users[username].diaries = {}
  data.users[username].diaries[dateStr] = diary
  write(data)
}

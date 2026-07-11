export function generateId(prefix = 't') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function formatDate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 18) return 'day'
  if (hour >= 18 && hour < 19.5) return 'dusk'
  return 'night'
}

export function isToday(dateStr) {
  return dateStr === formatDate(new Date())
}

export function isPast(dateStr) {
  return dateStr < formatDate(new Date())
}

export function isOverdue(latestStart) {
  if (!latestStart) return false
  return latestStart < formatDate(new Date())
}

export function getTaskStatus(task, todayStr) {
  if (task.completed) return 'completed'
  const today = new Date(todayStr)
  today.setHours(0, 0, 0, 0)
  const taskDay = new Date(task.date)
  taskDay.setHours(0, 0, 0, 0)
  if (task.latestStart) {
    const ls = new Date(task.latestStart)
    ls.setHours(0, 0, 0, 0)
    if (today > ls) return 'urgent'
  }
  if (taskDay < today) return 'overdue'
  if (task.date === todayStr) {
    // For today's non-all-day tasks, check if the end time has passed
    if (!task.isAllDay && task.timeLabel) {
      const endTime = task.timeLabel.split('–')[1]?.trim()
      if (endTime) {
        const [h, m] = endTime.split(':').map(Number)
        const now = new Date()
        const end = new Date()
        end.setHours(h, m, 0, 0)
        if (now > end) return 'overdue'
      }
    }
    return 'today'
  }
  return 'normal'
}

export const CATEGORIES = {
  study: { label: '学习', color: '#4A90D9' },
  life: { label: '生活', color: '#5CB85C' },
  work: { label: '工作', color: '#F5A623' },
  club: { label: '其他', color: '#9B59B6' },
}

<template>
  <div
    class="task-card"
    :class="[statusClass, { expanded: isExpanded, editing: isEditing, completing: isCompleting, deleting: isDeleting }]"
    :data-task-id="task.id"
    :style="deletingStyle"
  >
    <div class="task-main" @click="$emit('expand')">
      <div class="task-left">
        <div class="task-check" @click.stop="$emit('toggleComplete')">
          <div class="checkmark"></div>
        </div>
      </div>
      <div class="task-body">
        <div class="task-title">{{ task.title }}</div>
        <div class="task-sub">
          <span class="cat-pill" :class="task.category">{{ catLabel }}</span>
          <span class="task-time">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {{ task.timeLabel }}
          </span>
          <span class="task-badge" :class="badgeCls" v-if="badgeText">{{ badgeText }}</span>
        </div>
      </div>
      <svg class="task-arrow" viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>
    </div>

    <div class="task-detail">
      <div class="detail-grid">
        <div class="detail-field">
          <span class="detail-field-label">分类</span>
          <span class="detail-field-value"><span class="cat-pill" :class="task.category">{{ catLabel }}</span></span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">时间</span>
          <span class="detail-field-value">{{ task.timeLabel }}</span>
        </div>
        <div class="detail-field" v-if="task.latestStart">
          <span class="detail-field-label">最迟开始</span>
          <span class="detail-field-value urgent-text">{{ task.latestStart }}</span>
        </div>
        <div class="detail-field" v-if="task.note">
          <span class="detail-field-label">备注</span>
          <span class="detail-field-value">{{ task.note }}</span>
        </div>
        <div class="detail-field" v-if="task.attachments && task.attachments.length">
          <span class="detail-field-label">附件</span>
          <div class="attach-list">
            <span
              class="attach-item"
              v-for="(att, i) in task.attachments"
              :key="i"
              @click.stop="downloadAtt(att)"
            >
              <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              {{ att.name }}
            </span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="act-btn edit-btn" @click.stop="$emit('edit')" v-if="!task.completed">编辑</button>
          <button class="act-btn danger" @click.stop="$emit('delete')">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getTaskStatus, CATEGORIES } from '../utils/helpers.js'
import { getFile } from '../utils/db.js'

const props = defineProps({
  task: { type: Object, required: true },
  isExpanded: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false },
  isCompleting: { type: Boolean, default: false },
  isDeleting: { type: Boolean, default: false },
})

defineEmits(['expand', 'toggleComplete', 'edit', 'delete'])

const todayStr = new Date().toISOString().split('T')[0]

const statusClass = computed(() => {
  const status = getTaskStatus(props.task, todayStr)
  return 'status-' + status
})

const badgeCfg = {
  today: { text: '今天', cls: 'badge-today' },
  overdue: { text: '已过期', cls: 'badge-overdue' },
  urgent: { text: '已超期', cls: 'badge-urgent' },
  completed: { text: '', cls: '' },
  normal: { text: '', cls: '' },
}

const badgeText = computed(() => {
  const status = getTaskStatus(props.task, todayStr)
  return badgeCfg[status]?.text || ''
})

const badgeCls = computed(() => {
  const status = getTaskStatus(props.task, todayStr)
  return badgeCfg[status]?.cls || ''
})

const catLabel = computed(() => {
  const cat = CATEGORIES[props.task.category]
  return cat ? cat.label : ''
})

const deletingStyle = computed(() => {
  if (!props.isDeleting) return {}
  return {}
})

async function downloadAtt(att) {
  if (!att.id) return
  const record = await getFile(att.id)
  if (!record || !record.blob) return
  const url = URL.createObjectURL(record.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = att.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.task-card {
  position: relative;
  flex-shrink: 0;
  background: var(--drawer-item-bg);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.task-card:hover { background: var(--drawer-item-hover); box-shadow: var(--drawer-shadow-sm); }

.task-card::before {
  content: '';
  position: absolute;
  left: 0; top: 10px; bottom: 10px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  transition: all 0.3s ease;
}
.task-card.status-today::before     { background: #4A90D9; }
.task-card.status-overdue::before   { background: var(--drawer-orange); }
.task-card.status-urgent::before    { background: var(--drawer-red); }
.task-card.status-completed::before { background: var(--drawer-green); opacity: 0.5; }

.task-card.deleting {
  max-height: 0 !important;
  opacity: 0;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  pointer-events: none;
  overflow: hidden;
  transition: max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s ease,
              margin 0.45s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-card.completing .task-title {
  animation: strikeThrough 0.35s ease forwards;
}
@keyframes strikeThrough {
  0%   { color: var(--drawer-text); }
  100% { color: var(--drawer-text-muted); text-decoration: line-through; }
}
.task-card.completing {
  animation: sinkOut 0.5s ease 0.45s forwards;
  pointer-events: none;
}
@keyframes sinkOut {
  0%   { opacity: 1; transform: translateY(0); }
  100% { opacity: 0.4; transform: translateY(12px); }
}

.task-card.editing {
  box-shadow: 0 0 0 2px var(--drawer-accent), 0 0 24px rgba(74,144,217,0.2);
  transform: translateX(4px);
  z-index: 10;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
[data-theme="evening"] .task-card.editing { box-shadow: 0 0 0 2px var(--drawer-accent), 0 0 24px rgba(212,149,107,0.25); }
[data-theme="night"] .task-card.editing { box-shadow: 0 0 0 2px var(--drawer-accent), 0 0 24px rgba(123,158,212,0.3); }

.task-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px 12px 16px;
}

.task-left { flex-shrink: 0; padding-top: 2px; }

.task-check {
  position: relative;
  width: 22px; height: 22px;
  cursor: pointer;
  user-select: none;
  perspective: 80px;
}

.checkmark {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.1);
  transition: background 0.25s, box-shadow 0.25s;
}
[data-theme="night"] .checkmark { background: rgba(255,255,255,0.08); }
.checkmark:hover {
  box-shadow: inset 3px 3px 4px rgba(0,0,0,0.1), inset -3px -3px 4px rgba(255,255,255,0.5);
}
[data-theme="night"] .checkmark:hover {
  box-shadow: inset 3px 3px 4px rgba(0,0,0,0.3), inset -3px -3px 4px rgba(255,255,255,0.06);
}

.task-card.status-completed .checkmark {
  animation: flipCheck 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
@keyframes flipCheck {
  0%   { background: rgba(0,0,0,0.1); transform: rotateX(0deg); box-shadow: none; }
  35%  { background: var(--drawer-green); transform: rotateX(90deg); box-shadow: 0 2px 6px rgba(92,184,92,0.3); }
  100% { background: var(--drawer-green); transform: rotateX(360deg); box-shadow: 0 2px 6px rgba(92,184,92,0.3); }
}
[data-theme="night"] .task-card.status-completed .checkmark {
  animation-name: flipCheckNight;
}
@keyframes flipCheckNight {
  0%   { background: rgba(255,255,255,0.08); transform: rotateX(0deg); box-shadow: none; }
  35%  { background: var(--drawer-green); transform: rotateX(90deg); box-shadow: 0 2px 6px rgba(92,184,92,0.3); }
  100% { background: var(--drawer-green); transform: rotateX(360deg); box-shadow: 0 2px 6px rgba(92,184,92,0.3); }
}
.task-card.status-completed .checkmark:hover { box-shadow: 0 3px 8px rgba(92,184,92,0.4); }

.checkmark::after {
  content: '';
  position: absolute;
  display: block;
  left: 8px; top: 5px;
  width: 4px; height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  opacity: 0;
  transition: opacity 0.15s;
}
.task-card.status-completed .checkmark::after { opacity: 1; transition-delay: 0.18s; }

.task-body { flex: 1; min-width: 0; }

.task-title {
  font-size: 14px; font-weight: 500;
  color: var(--drawer-text);
  line-height: 1.4;
  transition: color 0.3s;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.task-card.status-completed .task-title {
  text-decoration: line-through;
  color: var(--drawer-text-muted);
}

.task-sub {
  display: flex; align-items: center; gap: 8px;
  margin-top: 5px;
  font-size: 12px;
  color: var(--drawer-text-secondary);
  transition: color 0.8s;
}

.cat-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 10px;
  font-size: 10.5px; font-weight: 500;
}
.cat-pill.study { background: rgba(74,144,217,0.1); color: #4A90D9; }
.cat-pill.life  { background: rgba(92,184,92,0.1);  color: #5CB85C; }
.cat-pill.work  { background: rgba(245,166,35,0.12); color: #d4921a; }
.cat-pill.club  { background: rgba(155,89,182,0.1);  color: #9B59B6; }
[data-theme="evening"] .cat-pill.work { color: #c87a18; }
[data-theme="night"] .cat-pill.study { background: rgba(90,159,233,0.12); color: #7ab8f0; }

.task-time { display: flex; align-items: center; gap: 3px; }
.task-time svg {
  width: 12px; height: 12px;
  stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round;
  opacity: 0.55;
}

.task-badge {
  margin-left: auto;
  font-size: 10px; font-weight: 600;
  padding: 2px 8px; border-radius: 8px;
  letter-spacing: 0.5px; flex-shrink: 0;
}
.badge-today   { background: rgba(74,144,217,0.1); color: #4A90D9; }
.badge-overdue { background: var(--drawer-orange-soft); color: var(--drawer-orange); }
.badge-urgent  { background: var(--drawer-red-soft); color: var(--drawer-red); }

.task-arrow {
  flex-shrink: 0;
  width: 16px; height: 16px;
  margin-top: 3px;
  stroke: var(--drawer-text-muted);
  fill: none; stroke-width: 2; stroke-linecap: round;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.task-card.expanded .task-arrow { transform: rotate(90deg); }

.task-detail {
  max-height: 0;
  overflow: hidden;
  padding: 0 14px 0 42px;
  transition: max-height 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
              padding 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.task-card.expanded .task-detail {
  max-height: 280px;
  padding: 0 14px 14px 42px;
}

.detail-grid { display: flex; flex-direction: column; gap: 6px; }

.detail-field {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 12.5px; line-height: 1.5;
}
.detail-field-label {
  flex-shrink: 0; width: 52px;
  font-size: 11px;
  color: var(--drawer-text-muted);
  transition: color 0.8s;
  padding-top: 1px;
}
.detail-field-value { color: var(--drawer-text); transition: color 0.8s; }
.detail-field-value.urgent-text { color: var(--drawer-red); font-weight: 500; }

.attach-list { display: flex; flex-wrap: wrap; gap: 5px; }
.attach-item {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 14px;
  background: var(--drawer-accent-soft);
  font-size: 11px; color: var(--drawer-accent);
  cursor: pointer;
  transition: all 0.2s ease;
}
.attach-item:hover { background: var(--drawer-accent); color: #fff; }
.attach-item svg {
  width: 12px; height: 12px;
  stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round;
}

.detail-actions { display: flex; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--drawer-divider); transition: border-color 0.8s; }
.act-btn {
  padding: 5px 14px; border-radius: 14px;
  border: 1px solid var(--drawer-divider);
  background: transparent; cursor: pointer;
  font-size: 11.5px; font-family: inherit;
  color: var(--drawer-text-secondary);
  transition: all 0.2s ease;
}
.act-btn:hover { border-color: var(--drawer-accent); color: var(--drawer-accent); }
.act-btn.danger { color: var(--drawer-red); border-color: transparent; }
.act-btn.danger:hover { background: var(--drawer-red-soft); border-color: rgba(224,85,85,0.2); }
</style>

<template>
  <div class="dropdown-wrapper">
    <button
      class="category-trigger"
      :class="{ open: dropdownOpen }"
      @click.stop="toggle"
    >
      <span class="tag-icon">🏷</span>
      <span>{{ label }}</span>
      <span class="trigger-dots">
        <span
          v-for="cat in displayDots"
          :key="cat"
          class="trigger-dot"
          :class="cat"
        ></span>
      </span>
      <span class="chevron">▼</span>
    </button>
    <div class="dropdown-panel" :class="{ visible: dropdownOpen }">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="dropdown-item"
        :class="{ checked: isChecked(cat.key) }"
        @click.stop="toggleCat(cat.key)"
      >
        <span class="color-dot" :class="cat.key"></span>{{ cat.label }}
        <span class="check-mark" :class="cat.key + '-bg'">✓</span>
      </button>
      <div class="dropdown-divider"></div>
      <button class="dropdown-action" @click.stop="selectAll">✓ 全选</button>
      <button class="dropdown-action" @click.stop="clearAll">✗ 清除</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => ['study', 'life', 'work', 'club'] },
})

const emit = defineEmits(['update:modelValue'])

const dropdownOpen = ref(false)

const catNames = { study: '学习', life: '生活', work: '工作', club: '其他' }
const categories = [
  { key: 'study', label: '学习' },
  { key: 'life', label: '生活' },
  { key: 'work', label: '工作' },
  { key: 'club', label: '其他' },
]

const label = computed(() => {
  const count = props.modelValue.length
  if (count === 4 || count === 0) return '全部分类'
  if (count === 1) return catNames[props.modelValue[0]]
  return `${count} 个分类`
})

const displayDots = computed(() => {
  const count = props.modelValue.length
  if (count > 0 && count < 4) return props.modelValue
  return ['study', 'life', 'work', 'club']
})

function isChecked(cat) {
  return props.modelValue.includes(cat)
}

function toggleCat(cat) {
  const next = props.modelValue.includes(cat)
    ? props.modelValue.filter(c => c !== cat)
    : [...props.modelValue, cat]
  emit('update:modelValue', next)
}

function selectAll() {
  emit('update:modelValue', ['study', 'life', 'work', 'club'])
}

function clearAll() {
  emit('update:modelValue', [])
}

function toggle() {
  dropdownOpen.value = !dropdownOpen.value
}

function close() {
  dropdownOpen.value = false
}

defineExpose({ close })
</script>

<style scoped>
/* Variables from parent (AppHeader) are inherited via CSS custom properties on :root */
.category-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-secondary, #8a7560);
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
}

.category-trigger:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
  color: var(--text-color, #3d2e1c);
}

.category-trigger .tag-icon { font-size: 15px; }

.category-trigger .chevron {
  font-size: 10px;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: 0.6;
}

.category-trigger.open .chevron { transform: rotate(180deg); }

.trigger-dots { display: flex; gap: 3px; margin-left: 2px; }

.trigger-dot {
  width: 6px; height: 6px;
  border-radius: 50%; flex-shrink: 0;
}
.trigger-dot.study { background: var(--cat-study, #4A90D9); }
.trigger-dot.life  { background: var(--cat-life, #5CB85C); }
.trigger-dot.work  { background: var(--cat-work, #F5A623); }
.trigger-dot.club  { background: var(--cat-club, #9B59B6); }

.dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: var(--dropdown-bg, rgba(255, 255, 255, 0.88));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--dropdown-border, rgba(200, 180, 160, 0.4));
  border-radius: 14px;
  box-shadow: var(--shadow-md, 0 8px 32px rgba(0, 0, 0, 0.12));
  padding: 8px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px) scale(0.95);
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-panel.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-color, #3d2e1c);
  transition: background 0.2s ease;
  text-align: left;
}

.dropdown-item:hover { background: var(--hover-bg, rgba(0, 0, 0, 0.04)); }

.color-dot {
  width: 10px; height: 10px;
  border-radius: 3px; flex-shrink: 0;
}
.color-dot.study { background: var(--cat-study, #4A90D9); }
.color-dot.life  { background: var(--cat-life, #5CB85C); }
.color-dot.work  { background: var(--cat-work, #F5A623); }
.color-dot.club  { background: var(--cat-club, #9B59B6); }

.check-mark {
  margin-left: auto;
  width: 18px; height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--dropdown-border, rgba(200, 180, 160, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

.dropdown-item.checked .check-mark { border-color: transparent; }
.dropdown-item.checked .check-mark.study-bg { background: var(--cat-study, #4A90D9); border-color: var(--cat-study, #4A90D9); }
.dropdown-item.checked .check-mark.life-bg  { background: var(--cat-life, #5CB85C); border-color: var(--cat-life, #5CB85C); }
.dropdown-item.checked .check-mark.work-bg  { background: var(--cat-work, #F5A623); border-color: var(--cat-work, #F5A623); }
.dropdown-item.checked .check-mark.club-bg  { background: var(--cat-club, #9B59B6); border-color: var(--cat-club, #9B59B6); }

.dropdown-divider {
  height: 1px;
  background: var(--dropdown-border, rgba(200, 180, 160, 0.4));
  margin: 4px 8px;
}

.dropdown-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-secondary, #8a7560);
  transition: all 0.2s ease;
}

.dropdown-action:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
  color: var(--text-color, #3d2e1c);
}
</style>

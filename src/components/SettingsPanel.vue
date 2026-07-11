<template>
  <div class="settings-wrapper">
    <button class="settings-btn" @click.stop="toggle">
      ⚙
    </button>
    <div class="settings-panel" :class="{ visible: open }">
      <button class="menu-item" @click.stop="emitAction('export')">
        导出数据
      </button>
      <button class="menu-item" @click.stop="emitAction('import')">
        导入数据
      </button>
      <div class="dropdown-divider"></div>
      <button class="menu-item" @click.stop="emitAction('clearArchive')">
        清除归档
      </button>
      <button class="menu-item danger" @click.stop="emitAction('logout')">
        退出登录
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['action'])
const open = ref(false)

function toggle() {
  open.value = !open.value
}

function emitAction(action) {
  emit('action', action)
  open.value = false
}

function close() {
  open.value = false
}

defineExpose({ close })
</script>

<style scoped>
.settings-wrapper { position: relative; }

.settings-btn {
  width: 34px; height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #8a7560);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-btn:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
  color: var(--text-color, #3d2e1c);
  transform: rotate(30deg);
}

.settings-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 170px;
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

.settings-panel.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.menu-item {
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

.menu-item:hover { background: var(--hover-bg, rgba(0, 0, 0, 0.04)); }
.menu-item .menu-icon { font-size: 15px; flex-shrink: 0; }
.menu-item.danger { color: #e05555; }

.dropdown-divider {
  height: 1px;
  background: var(--dropdown-border, rgba(200, 180, 160, 0.4));
  margin: 4px 8px;
}
</style>

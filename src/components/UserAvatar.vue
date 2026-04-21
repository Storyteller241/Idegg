<template>
  <div class="user-avatar-container" @click="handleClick">
    <div class="avatar-wrapper" :class="{ 'is-hovered': isHovered }" @mouseenter="isHovered = true"
      @mouseleave="isHovered = false">
      <div class="username-badge" :class="{ 'show': isHovered }">
        <span class="username-text">{{ displayName }}</span>
      </div>
      <div class="avatar-circle">
        <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" />
        <div v-else class="avatar-placeholder">
          {{ displayName ? displayName.charAt(0).toUpperCase() : 'U' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../stores/user'

const emit = defineEmits<{
  click: []
}>()

const userStore = useUserStore()
const isHovered = ref(false)
const API_BASE_URL = 'http://101.133.231.222:3000'

const displayName = computed(() => {
  return userStore.user?.username || 'User'
})

// 头像完整 URL
const avatarUrl = computed(() => {
  const avatar = userStore.user?.avatar
  if (!avatar) return ''
  if (avatar.startsWith('http')) return avatar
  return `${API_BASE_URL}${avatar}`
})

const handleClick = () => {
  emit('click')
}
</script>

<style lang="less" scoped>
.user-avatar-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  cursor: pointer;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 6px 6px 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 50px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(255, 255, 255, 0.95);
    box-shadow:
      0 6px 28px rgba(0, 0, 0, 0.12),
      0 0 0 1px rgba(255, 255, 255, 0.8) inset;
    transform: translateY(-1px);
  }
}

.username-badge {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  &.show {
    max-width: 150px;
    opacity: 1;
    transform: translateX(0);
  }
}

.username-text {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.75);
  white-space: nowrap;
  padding-right: 4px;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #00c8ff, #0096ff);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 150, 255, 0.25);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}
</style>

<template>
  <t-dialog
    :visible="visible"
    :header="idea?.title || 'Idea 详情'"
    :width="400"
    :close-on-overlay-click="true"
    @close="handleClose"
  >
    <div v-if="idea" class="idea-detail">
      <!-- 创建时间 -->
      <div class="info-row">
        <span class="label">创建时间</span>
        <span class="value">{{ formatTime(idea.createTime) }}</span>
      </div>
      
      <!-- 存在时长 -->
      <div class="info-row">
        <span class="label">已存在</span>
        <span class="value">{{ ageText }}</span>
      </div>
      
      <!-- 当前状态 -->
      <div class="info-row">
        <span class="label">状态</span>
        <t-tag :theme="statusTheme" variant="light">
          {{ statusText }}
        </t-tag>
      </div>
      
      <!-- 位置信息 -->
      <div class="info-row">
        <span class="label">位置</span>
        <span class="value coords">
          [{{ idea.position.map(n => n.toFixed(1)).join(', ') }}]
        </span>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Idea } from '@/types'

// Props
interface Props {
  visible: boolean
  idea: Idea | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 计算存在时长文本
const ageText = computed(() => {
  if (!props.idea) return ''
  const age = Date.now() - props.idea.createTime
  const minutes = Math.floor(age / (60 * 1000))
  const seconds = Math.floor((age % (60 * 1000)) / 1000)
  
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  }
  return `${seconds}秒`
})

// 状态文本和主题
const statusText = computed(() => {
  if (!props.idea) return ''
  const age = Date.now() - props.idea.createTime
  const oneMinute = 60 * 1000
  const fiveMinutes = 5 * 60 * 1000
  
  if (age < oneMinute) return '新鲜'
  if (age < fiveMinutes) return '成熟中'
  return '已过期'
})

const statusTheme = computed(() => {
  if (!props.idea) return 'default'
  const age = Date.now() - props.idea.createTime
  const oneMinute = 60 * 1000
  const fiveMinutes = 5 * 60 * 1000
  
  if (age < oneMinute) return 'success'
  if (age < fiveMinutes) return 'warning'
  return 'danger'
})

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style lang="less" scoped>
.idea-detail {
  padding: 16px 0;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .value {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    
    &.coords {
      font-family: monospace;
      font-size: 12px;
    }
  }
}

:deep(.t-dialog__body) {
  background: rgba(30, 30, 30, 0.95);
}

:deep(.t-dialog__header) {
  background: rgba(30, 30, 30, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
</style>

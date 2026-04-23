<script setup>
import { computed, ref, h } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { formatValue, DiffType, getType } from '../utils/jsonDiff.js'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  collapsedPaths: {
    type: Set,
    required: true
  },
  selectedPath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['toggle-collapse', 'select-item'])

const itemHeight = 28

const visibleItems = computed(() => {
  return props.items.filter(item => {
    if (item.path === '') return true
    const parts = item.path.split(/\.|\[/).filter(Boolean)
    for (let i = 1; i <= parts.length; i++) {
      const parentPath = parts.slice(0, i).join('.')
      if (props.collapsedPaths.has(parentPath)) {
        return false
      }
    }
    return true
  })
})

function getDiffClass(type) {
  switch (type) {
    case DiffType.ADDED: return 'added'
    case DiffType.REMOVED: return 'removed'
    case DiffType.MODIFIED: return 'modified'
    default: return 'unchanged'
  }
}

function getTypeIcon(type) {
  switch (type) {
    case 'object': return '{}'
    case 'array': return '[]'
    case 'string': return '""'
    case 'number': return '#️'
    case 'boolean': return '✓'
    case 'null': return '∅'
    default: return '?'
  }
}

function isCollapsed(item) {
  return props.collapsedPaths.has(item.path)
}

function toggleCollapse(item, event) {
  event.stopPropagation()
  emit('toggle-collapse', item.path)
}

function selectItem(item) {
  emit('select-item', item)
}

function isSelected(item) {
  return props.selectedPath === item.path
}

function formatKey(key) {
  if (typeof key === 'number') return `[${key}]`
  if (/^\d+$/.test(key)) return `[${key}]`
  return key
}

function formatDisplayValue(value, type) {
  if (type === 'array') return `Array[${(value || []).length}]`
  if (type === 'object') return `Object {${Object.keys(value || {}).length}}`
  if (type === 'string') return `"${value}"`
  return formatValue(value)
}

function getValuePreview(item) {
  if (item.type === DiffType.MODIFIED) {
    return formatDisplayValue(item.oldValue, item.oldType) + ' → ' + formatDisplayValue(item.newValue, item.newType)
  }
  if (item.type === DiffType.ADDED) {
    return formatDisplayValue(item.newValue, item.newType)
  }
  if (item.type === DiffType.REMOVED) {
    return formatDisplayValue(item.oldValue, item.oldType)
  }
  return formatDisplayValue(item.oldValue, item.oldType)
}

function getContainerPreview(item) {
  if (item.oldType === 'array') {
    return '[' + item.childrenCount + ']'
  }
  return '{' + item.childrenCount + '}'
}

function getTypeLabel(type) {
  if (type === DiffType.ADDED) return '新增'
  if (type === DiffType.REMOVED) return '删除'
  if (type === DiffType.MODIFIED) return '修改'
  return ''
}
</script>

<template>
  <div class="tree-view">
    <RecycleScroller
      class="virtual-scroll-container"
      :items="visibleItems"
      :item-size="itemHeight"
      key-field="path"
    >
      <template v-slot="{ item, index }">
        <div 
          class="tree-node"
          :style="{ paddingLeft: item.depth * 24 + 'px' }"
        >
          <div 
            class="tree-node-content"
            :class="[
              getDiffClass(item.type),
              { selected: isSelected(item) }
            ]"
            @click="selectItem(item)"
          >
            <div class="tree-label">
              <span 
                v-if="item.hasChildren" 
                class="expand-btn"
                :class="{ collapsed: isCollapsed(item) }"
                @click="toggleCollapse(item, $event)"
              >
                ▼
              </span>
              <span v-else class="expand-btn" style="visibility: hidden;">▼</span>
              
              <span class="item-key">{{ formatKey(item.key) }}</span>
              <span v-if="!item.hasChildren" class="tree-value-preview">
                = {{ getValuePreview(item) }}
              </span>
              <span v-else class="tree-value-preview">
                {{ getContainerPreview(item) }}
              </span>
              
              <span 
                v-if="item.type !== DiffType.UNCHANGED"
                class="item-type"
                :style="{ 
                  color: item.type === DiffType.ADDED ? '#4a7c4a' : 
                         item.type === DiffType.REMOVED ? '#7c4a4a' : 
                         item.type === DiffType.MODIFIED ? '#7c7c4a' : 'inherit' 
                }"
              >
                [{{ getTypeLabel(item.type) }}]
              </span>
            </div>
          </div>
        </div>
      </template>
    </RecycleScroller>
  </div>
</template>

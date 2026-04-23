<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { formatValue, DiffType } from '../utils/jsonDiff.js'

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
  },
  highlightPath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['toggle-collapse', 'select-item'])

const itemHeight = 24
const leftScroller = ref(null)
const rightScroller = ref(null)

const leftItems = computed(() => {
  return props.items.filter(item => {
    return item.type !== DiffType.ADDED
  })
})

const rightItems = computed(() => {
  return props.items.filter(item => {
    return item.type !== DiffType.REMOVED
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

function getDiffMarkerClass(type) {
  switch (type) {
    case DiffType.ADDED: return 'added'
    case DiffType.REMOVED: return 'removed'
    case DiffType.MODIFIED: return 'modified'
    default: return null
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

function isHighlighted(item) {
  return props.highlightPath === item.path
}

function formatKey(key) {
  if (typeof key === 'number') return `[${key}]`
  if (/^\d+$/.test(key)) return `[${key}]`
  return `"${key}"`
}

function formatDisplayValue(value, type) {
  if (type === 'array') return `Array[${(value || []).length}]`
  if (type === 'object') return 'Object'
  return formatValue(value)
}

function syncScroll(scroller1, scroller2) {
  return (event) => {
    const target = event.target
    if (scroller2.value) {
      const scrollContainer = scroller2.value.$el.querySelector('.vue-recycle-scroller')
      if (scrollContainer) {
        scrollContainer.scrollTop = target.scrollTop
      }
    }
  }
}

let leftScrollHandler = null
let rightScrollHandler = null

onMounted(() => {
  nextTick(() => {
    if (leftScroller.value) {
      const leftContainer = leftScroller.value.$el.querySelector('.vue-recycle-scroller')
      const rightContainer = rightScroller.value?.$el.querySelector('.vue-recycle-scroller')
      
      if (leftContainer && rightContainer) {
        leftScrollHandler = (event) => {
          rightContainer.scrollTop = event.target.scrollTop
        }
        rightScrollHandler = (event) => {
          leftContainer.scrollTop = event.target.scrollTop
        }
        
        leftContainer.addEventListener('scroll', leftScrollHandler)
        rightContainer.addEventListener('scroll', rightScrollHandler)
      }
    }
  })
})

onUnmounted(() => {
  if (leftScroller.value && leftScrollHandler) {
    const leftContainer = leftScroller.value.$el.querySelector('.vue-recycle-scroller')
    leftContainer?.removeEventListener('scroll', leftScrollHandler)
  }
  if (rightScroller.value && rightScrollHandler) {
    const rightContainer = rightScroller.value.$el.querySelector('.vue-recycle-scroller')
    rightContainer?.removeEventListener('scroll', rightScrollHandler)
  }
})
</script>

<template>
  <div class="split-view">
    <div class="split-panel">
      <div class="panel-title">原始</div>
      <RecycleScroller
        ref="leftScroller"
        class="virtual-scroll-container"
        :items="leftItems"
        :item-size="itemHeight"
        key-field="path"
      >
        <template v-slot="{ item, index }">
          <div 
            class="diff-item"
            :class="[
              getDiffClass(item.type),
              { selected: isSelected(item), highlight: isHighlighted(item) }
            ]"
            :style="{ paddingLeft: item.depth * 20 + 'px' }"
            @click="selectItem(item)"
          >
            <div 
              v-if="getDiffMarkerClass(item.type)" 
              class="diff-marker"
              :class="getDiffMarkerClass(item.type)"
            ></div>
            
            <div class="item-indent" v-if="item.hasChildren">
              <button 
                class="expand-btn"
                :class="{ collapsed: isCollapsed(item) }"
                @click="toggleCollapse(item, $event)"
              >
                ▼
              </button>
            </div>
            <div class="item-indent" v-else></div>
            
            <span class="item-key">{{ formatKey(item.key) }}:</span>
            <span 
              class="item-value"
              :class="item.oldType"
            >
              {{ formatDisplayValue(item.oldValue, item.oldType) }}
            </span>
            <span 
              v-if="item.type === DiffType.MODIFIED && item.oldType !== item.newType"
              class="item-type"
            >
              ({{ item.oldType }})
            </span>
          </div>
        </template>
      </RecycleScroller>
    </div>

    <div class="split-panel">
      <div class="panel-title">目标</div>
      <RecycleScroller
        ref="rightScroller"
        class="virtual-scroll-container"
        :items="rightItems"
        :item-size="itemHeight"
        key-field="path"
      >
        <template v-slot="{ item, index }">
          <div 
            class="diff-item"
            :class="[
              getDiffClass(item.type),
              { selected: isSelected(item), highlight: isHighlighted(item) }
            ]"
            :style="{ paddingLeft: item.depth * 20 + 'px' }"
            @click="selectItem(item)"
          >
            <div 
              v-if="getDiffMarkerClass(item.type)" 
              class="diff-marker"
              :class="getDiffMarkerClass(item.type)"
            ></div>
            
            <div class="item-indent" v-if="item.hasChildren">
              <button 
                class="expand-btn"
                :class="{ collapsed: isCollapsed(item) }"
                @click="toggleCollapse(item, $event)"
              >
                ▼
              </button>
            </div>
            <div class="item-indent" v-else></div>
            
            <span class="item-key">{{ formatKey(item.key) }}:</span>
            <span 
              class="item-value"
              :class="item.newType"
            >
              {{ formatDisplayValue(item.newValue, item.newType) }}
            </span>
            <span 
              v-if="item.type === DiffType.MODIFIED && item.oldType !== item.newType"
              class="item-type"
            >
              ({{ item.newType }})
            </span>
          </div>
        </template>
      </RecycleScroller>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import JsonDiffViewer from './JsonDiffViewer.vue'
import JsonTreeView from './JsonTreeView.vue'
import { compareJson, formatValue, DiffType } from '../utils/jsonDiff.js'

const json1Input = ref(`{
  "name": "测试",
  "version": "1.0.0",
  "data": {
    "items": [1, 2, 3],
    "config": {
      "enabled": true,
      "timeout": 5000
    }
  }
}`)

const json2Input = ref(`{
  "name": "测试修改",
  "version": "1.1.0",
  "data": {
    "items": [1, 3, 4],
    "config": {
      "enabled": false,
      "timeout": 10000
    }
  },
  "newField": "新增字段"
}`)

const viewMode = ref('split')
const diffResults = ref([])
const selectedPath = ref('')
const collapsedPaths = ref(new Set())
const highlightPath = ref('')
const parseError = ref(null)

const stats = computed(() => {
  const results = diffResults.value
  return {
    added: results.filter(r => r.type === DiffType.ADDED).length,
    removed: results.filter(r => r.type === DiffType.REMOVED).length,
    modified: results.filter(r => r.type === DiffType.MODIFIED).length,
    total: results.length
  }
})

const visibleItems = computed(() => {
  return diffResults.value.filter(item => {
    if (item.path === '') return true
    const parts = item.path.split(/\.|\[/).filter(Boolean)
    for (let i = 1; i <= parts.length; i++) {
      const parentPath = item.path.split(/\.|\[/).slice(0, i).join('.').replace(/\./g, '.').replace(/\[/g, '[')
      if (collapsedPaths.value.has(parentPath)) {
        return false
      }
    }
    return true
  })
})

watch([json1Input, json2Input], () => {
  performDiff()
}, { immediate: true, deep: true })

function performDiff() {
  try {
    parseError.value = null
    if (!json1Input.value.trim() && !json2Input.value.trim()) {
      diffResults.value = []
      return
    }
    
    const obj1 = json1Input.value.trim() ? JSON.parse(json1Input.value) : {}
    const obj2 = json2Input.value.trim() ? JSON.parse(json2Input.value) : {}
    diffResults.value = compareJson(obj1, obj2)
  } catch (e) {
    parseError.value = `JSON 解析错误: ${e.message}`
    diffResults.value = []
  }
}

function toggleViewMode(mode) {
  viewMode.value = mode
}

function handleItemSelect(item) {
  selectedPath.value = item.path
  highlightPath.value = item.path
  nextTick(() => {
    highlightPath.value = ''
  })
}

function handlePathNavigate(path) {
  selectedPath.value = path
  const parts = path.split(/\.|\[/).filter(Boolean)
  for (let i = 1; i < parts.length; i++) {
    const parentPath = parts.slice(0, i).join('.')
    if (collapsedPaths.value.has(parentPath)) {
      collapsedPaths.value.delete(parentPath)
    }
  }
  highlightPath.value = path
  nextTick(() => {
    highlightPath.value = ''
  })
}

function toggleCollapse(path) {
  if (collapsedPaths.value.has(path)) {
    collapsedPaths.value.delete(path)
  } else {
    collapsedPaths.value.add(path)
  }
}

function collapseAll() {
  diffResults.value.forEach(item => {
    if (item.hasChildren) {
      collapsedPaths.value.add(item.path)
    }
  })
}

function expandAll() {
  collapsedPaths.value.clear()
}

function formatJson(input) {
  try {
    const obj = JSON.parse(input.value)
    input.value = JSON.stringify(obj, null, 2)
  } catch (e) {
    parseError.value = `JSON 格式化错误: ${e.message}`
  }
}

function copyJson(input) {
  navigator.clipboard?.writeText(input.value)
}

function clearJson(input) {
  input.value = ''
}
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1>JSON 对比器</h1>
      <div class="toolbar">
        <button 
          class="btn" 
          @click="expandAll"
          :disabled="diffResults.length === 0"
        >
          全部展开
        </button>
        <button 
          class="btn" 
          @click="collapseAll"
          :disabled="diffResults.length === 0"
        >
          全部折叠
        </button>
      </div>
    </header>

    <main class="main-content">
      <section class="input-section">
        <div class="input-panel">
          <div class="panel-header">
            <h2>原始 JSON</h2>
            <div class="panel-actions">
              <button class="icon-btn" @click="formatJson(json1Input)" title="格式化">
                {}
              </button>
              <button class="icon-btn" @click="copyJson(json1Input)" title="复制">
                📋
              </button>
              <button class="icon-btn" @click="clearJson(json1Input)" title="清空">
                ✕
              </button>
            </div>
          </div>
          <textarea 
            v-model="json1Input" 
            class="json-input" 
            placeholder="请输入 JSON..."
            spellcheck="false"
          ></textarea>
        </div>

        <div class="input-panel">
          <div class="panel-header">
            <h2>目标 JSON</h2>
            <div class="panel-actions">
              <button class="icon-btn" @click="formatJson(json2Input)" title="格式化">
                {}
              </button>
              <button class="icon-btn" @click="copyJson(json2Input)" title="复制">
                📋
              </button>
              <button class="icon-btn" @click="clearJson(json2Input)" title="清空">
                ✕
              </button>
            </div>
          </div>
          <textarea 
            v-model="json2Input" 
            class="json-input" 
            placeholder="请输入 JSON..."
            spellcheck="false"
          ></textarea>
        </div>
      </section>

      <div v-if="parseError" class="error-message">
        {{ parseError }}
      </div>

      <section class="view-toggle" v-if="diffResults.length > 0">
        <div class="left">
          <button 
            class="btn" 
            :class="{ active: viewMode === 'split' }"
            @click="toggleViewMode('split')"
          >
            左右对比
          </button>
          <button 
            class="btn" 
            :class="{ active: viewMode === 'tree' }"
            @click="toggleViewMode('tree')"
          >
            结构树视图
          </button>
        </div>
        <div class="right">
          <div class="stats">
            <span class="stat-item added">
              <span class="dot"></span>
              新增: {{ stats.added }}
            </span>
            <span class="stat-item removed">
              <span class="dot"></span>
              删除: {{ stats.removed }}
            </span>
            <span class="stat-item modified">
              <span class="dot"></span>
              修改: {{ stats.modified }}
            </span>
          </div>
        </div>
      </section>

      <section class="path-input-section" v-if="diffResults.length > 0">
        <label>路径:</label>
        <input 
          type="text" 
          class="path-input"
          :value="selectedPath"
          placeholder="输入路径，如: data.items[0]"
          @keyup.enter="handlePathNavigate($event.target.value)"
        />
        <div class="path-breadcrumb" v-if="selectedPath">
          <span 
            class="breadcrumb-item" 
            :class="{ active: selectedPath === '' }"
            @click="handlePathNavigate('')"
          >
            root
          </span>
          <span 
            v-for="(part, index) in selectedPath.split(/\.|\[/).filter(Boolean)" 
            :key="index"
          >
            <span class="breadcrumb-separator">›</span>
            <span 
              class="breadcrumb-item"
              :class="{ active: selectedPath.split(/\.|\[/).filter(Boolean).slice(0, index + 1).join('.') === selectedPath }"
              @click="handlePathNavigate(selectedPath.split(/\.|\[/).filter(Boolean).slice(0, index + 1).join('.'))"
            >
              {{ part.replace(/\]$/, '') }}
            </span>
          </span>
        </div>
      </section>

      <section class="diff-container">
        <template v-if="diffResults.length > 0">
          <JsonDiffViewer 
            v-if="viewMode === 'split'"
            :items="visibleItems"
            :collapsed-paths="collapsedPaths"
            :selected-path="selectedPath"
            :highlight-path="highlightPath"
            @toggle-collapse="toggleCollapse"
            @select-item="handleItemSelect"
          />
          <JsonTreeView 
            v-else
            :items="diffResults"
            :collapsed-paths="collapsedPaths"
            :selected-path="selectedPath"
            @toggle-collapse="toggleCollapse"
            @select-item="handleItemSelect"
          />
        </template>
        <div v-else class="empty-state">
          <div class="icon">📄</div>
          <p>请在上方输入两个 JSON 进行对比</p>
        </div>
      </section>
    </main>
  </div>
</template>

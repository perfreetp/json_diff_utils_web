export const DiffType = {
  ADDED: 'added',
  REMOVED: 'removed',
  MODIFIED: 'modified',
  UNCHANGED: 'unchanged'
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isArray(value) {
  return Array.isArray(value)
}

function getType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function formatValue(value) {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (Array.isArray(value)) return 'Array[' + value.length + ']'
  if (typeof value === 'object') return 'Object'
  return String(value)
}

function flattenDiff(obj1, obj2, path = '', result = [], depth = 0) {
  const type1 = getType(obj1)
  const type2 = getType(obj2)

  if (type1 !== type2) {
    result.push({
      path,
      depth,
      type: DiffType.MODIFIED,
      key: path.split('.').pop() || 'root',
      oldValue: obj1,
      newValue: obj2,
      oldType: type1,
      newType: type2,
      isContainer: false,
      hasChildren: false
    })
    return result
  }

  if (type1 === 'object') {
    const keys1 = Object.keys(obj1 || {})
    const keys2 = Object.keys(obj2 || {})
    const allKeys = [...new Set([...keys1, ...keys2])]

    const hasChanges = allKeys.some(key => {
      const v1 = obj1?.[key]
      const v2 = obj2?.[key]
      return !(key in (obj1 || {})) || !(key in (obj2 || {})) || JSON.stringify(v1) !== JSON.stringify(v2)
    })

    if (hasChanges || path === '') {
      result.push({
        path,
        depth,
        type: path === '' ? DiffType.UNCHANGED : (JSON.stringify(obj1) === JSON.stringify(obj2) ? DiffType.UNCHANGED : DiffType.MODIFIED),
        key: path.split('.').pop() || 'root',
        oldValue: obj1,
        newValue: obj2,
        oldType: 'object',
        newType: 'object',
        isContainer: true,
        hasChildren: allKeys.length > 0,
        childrenCount: allKeys.length
      })

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key
        const v1 = obj1?.[key]
        const v2 = obj2?.[key]

        if (!(key in (obj1 || {}))) {
          addNewItem(v2, newPath, depth + 1, result)
        } else if (!(key in (obj2 || {}))) {
          addRemovedItem(v1, newPath, depth + 1, result)
        } else if (JSON.stringify(v1) !== JSON.stringify(v2)) {
          flattenDiff(v1, v2, newPath, result, depth + 1)
        } else {
          addUnchangedItem(v1, newPath, depth + 1, result)
        }
      }
    } else {
      addUnchangedItem(obj1, path, depth, result)
    }
  } else if (type1 === 'array') {
    const arr1 = obj1 || []
    const arr2 = obj2 || []
    const maxLen = Math.max(arr1.length, arr2.length)

    const hasChanges = arr1.length !== arr2.length || 
      arr1.some((v, i) => JSON.stringify(v) !== JSON.stringify(arr2[i]))

    if (hasChanges || path === '') {
      result.push({
        path,
        depth,
        type: path === '' ? DiffType.UNCHANGED : (JSON.stringify(arr1) === JSON.stringify(arr2) ? DiffType.UNCHANGED : DiffType.MODIFIED),
        key: path.split('.').pop() || 'root',
        oldValue: arr1,
        newValue: arr2,
        oldType: 'array',
        newType: 'array',
        isContainer: true,
        hasChildren: maxLen > 0,
        childrenCount: maxLen
      })

      for (let i = 0; i < maxLen; i++) {
        const newPath = path ? `${path}[${i}]` : `[${i}]`
        const v1 = arr1[i]
        const v2 = arr2[i]

        if (i >= arr1.length) {
          addNewItem(v2, newPath, depth + 1, result)
        } else if (i >= arr2.length) {
          addRemovedItem(v1, newPath, depth + 1, result)
        } else if (JSON.stringify(v1) !== JSON.stringify(v2)) {
          flattenDiff(v1, v2, newPath, result, depth + 1)
        } else {
          addUnchangedItem(v1, newPath, depth + 1, result)
        }
      }
    } else {
      addUnchangedItem(arr1, path, depth, result)
    }
  } else {
    if (obj1 !== obj2) {
      result.push({
        path,
        depth,
        type: DiffType.MODIFIED,
        key: path.split('.').pop() || 'root',
        oldValue: obj1,
        newValue: obj2,
        oldType: type1,
        newType: type2,
        isContainer: false,
        hasChildren: false
      })
    } else {
      addUnchangedItem(obj1, path, depth, result)
    }
  }

  return result
}

function addNewItem(value, path, depth, result) {
  const type = getType(value)
  const isContainer = type === 'object' || type === 'array'
  
  result.push({
    path,
    depth,
    type: DiffType.ADDED,
    key: path.match(/\.([^.\[\]]+)$|\[(\d+)\]$/)?.[1] || path.match(/\[(\d+)\]$/)?.[1] || path,
    oldValue: undefined,
    newValue: value,
    oldType: undefined,
    newType: type,
    isContainer,
    hasChildren: isContainer && (type === 'object' ? Object.keys(value || {}).length > 0 : (value || []).length > 0),
    childrenCount: isContainer ? (type === 'object' ? Object.keys(value || {}).length : (value || []).length) : 0
  })

  if (isContainer) {
    if (type === 'object') {
      for (const key of Object.keys(value || {})) {
        const newPath = path ? `${path}.${key}` : key
        addNewItem(value[key], newPath, depth + 1, result)
      }
    } else {
      for (let i = 0; i < (value || []).length; i++) {
        const newPath = path ? `${path}[${i}]` : `[${i}]`
        addNewItem(value[i], newPath, depth + 1, result)
      }
    }
  }
}

function addRemovedItem(value, path, depth, result) {
  const type = getType(value)
  const isContainer = type === 'object' || type === 'array'
  
  result.push({
    path,
    depth,
    type: DiffType.REMOVED,
    key: path.match(/\.([^.\[\]]+)$|\[(\d+)\]$/)?.[1] || path.match(/\[(\d+)\]$/)?.[1] || path,
    oldValue: value,
    newValue: undefined,
    oldType: type,
    newType: undefined,
    isContainer,
    hasChildren: isContainer && (type === 'object' ? Object.keys(value || {}).length > 0 : (value || []).length > 0),
    childrenCount: isContainer ? (type === 'object' ? Object.keys(value || {}).length : (value || []).length) : 0
  })

  if (isContainer) {
    if (type === 'object') {
      for (const key of Object.keys(value || {})) {
        const newPath = path ? `${path}.${key}` : key
        addRemovedItem(value[key], newPath, depth + 1, result)
      }
    } else {
      for (let i = 0; i < (value || []).length; i++) {
        const newPath = path ? `${path}[${i}]` : `[${i}]`
        addRemovedItem(value[i], newPath, depth + 1, result)
      }
    }
  }
}

function addUnchangedItem(value, path, depth, result) {
  const type = getType(value)
  const isContainer = type === 'object' || type === 'array'
  
  result.push({
    path,
    depth,
    type: DiffType.UNCHANGED,
    key: path.match(/\.([^.\[\]]+)$|\[(\d+)\]$/)?.[1] || path.match(/\[(\d+)\]$/)?.[1] || path,
    oldValue: value,
    newValue: value,
    oldType: type,
    newType: type,
    isContainer,
    hasChildren: isContainer && (type === 'object' ? Object.keys(value || {}).length > 0 : (value || []).length > 0),
    childrenCount: isContainer ? (type === 'object' ? Object.keys(value || {}).length : (value || []).length) : 0
  })

  if (isContainer) {
    if (type === 'object') {
      for (const key of Object.keys(value || {})) {
        const newPath = path ? `${path}.${key}` : key
        addUnchangedItem(value[key], newPath, depth + 1, result)
      }
    } else {
      for (let i = 0; i < (value || []).length; i++) {
        const newPath = path ? `${path}[${i}]` : `[${i}]`
        addUnchangedItem(value[i], newPath, depth + 1, result)
      }
    }
  }
}

export function compareJson(json1, json2) {
  try {
    const obj1 = typeof json1 === 'string' ? JSON.parse(json1) : json1
    const obj2 = typeof json2 === 'string' ? JSON.parse(json2) : json2
    return flattenDiff(obj1, obj2)
  } catch (e) {
    console.error('JSON parse error:', e)
    return []
  }
}

export function getValueByPath(obj, path) {
  if (!path) return obj
  const parts = path.split(/\.|\[|\]/).filter(Boolean)
  let result = obj
  for (const part of parts) {
    if (result === null || result === undefined) return undefined
    const index = parseInt(part)
    if (!isNaN(index) && Array.isArray(result)) {
      result = result[index]
    } else {
      result = result[part]
    }
  }
  return result
}

export { formatValue, getType }

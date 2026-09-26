<template>
  <div class="app-container">
    <el-form v-show="showSearch" :model="query" inline class="business-search" @submit.prevent="search">
      <el-form-item v-for="field in searchFields" :key="field.prop" :label="field.label">
        <el-select v-if="field.options" v-model="query[field.prop]" clearable :placeholder="`全部${field.label}`" style="width: 180px">
          <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-input v-else v-model.trim="query[field.prop]" clearable :placeholder="`请输入${field.label}`" style="width: 200px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" native-type="submit">查询</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row class="mb8">
      <el-button type="primary" plain icon="Plus" :disabled="loading" v-hasPermi="[permission('add')]" @click="openCreate">新增{{ title }}</el-button>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>

    <el-table v-loading="loading" :data="rows" border stripe :row-key="idField" empty-text="暂无数据">
      <el-table-column v-for="field in tableFields" :key="field.prop" :prop="field.prop" :label="field.label" :min-width="field.width || 115" show-overflow-tooltip>
        <template #default="scope">{{ displayValue(field, scope.row[field.prop]) }}</template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="142" align="center">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" v-hasPermi="[permission('edit')]" @click="openEdit(scope.row)">修改</el-button>
          <el-button link type="danger" icon="Delete" v-hasPermi="[permission('remove')]" @click="removeRow(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="loadList" />

    <el-dialog v-model="dialogOpen" :title="`${editing ? '修改' : '新增'}${title}`" width="min(820px, 94vw)" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="125px" :disabled="saving">
        <el-row :gutter="16">
          <el-col v-for="field in formFields" :key="field.prop" :xs="24" :sm="field.type === 'textarea' ? 24 : 12">
            <el-form-item :label="field.label" :prop="field.prop">
              <el-select v-if="field.options || field.lookup" v-model="form[field.prop]" clearable :placeholder="`请选择${field.label}`" style="width: 100%">
                <el-option v-for="option in optionsFor(field)" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
              <el-date-picker v-else-if="field.type === 'datetime'" v-model="form[field.prop]" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" :placeholder="`请选择${field.label}`" style="width: 100%" />
              <el-input-number v-else-if="field.type === 'number' || field.type === 'money'" v-model="form[field.prop]" :min="field.min ?? 0" :max="field.max ?? 999999999" :precision="field.type === 'money' ? 2 : (field.precision ?? 0)" :step="field.type === 'money' ? 1 : 1" controls-position="right" style="width: 100%" />
              <el-input v-else v-model.trim="form[field.prop]" :type="field.type === 'textarea' ? 'textarea' : 'text'" :rows="3" :maxlength="field.maxlength || 512" show-word-limit :placeholder="`请输入${field.label}`" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createBusiness, getBusiness, listBusiness, removeBusiness, updateBusiness } from '@/api/business'

const props = defineProps({
  title: { type: String, required: true },
  resource: { type: String, required: true },
  permissionResource: { type: String, default: '' },
  idField: { type: String, required: true },
  fields: { type: Array, required: true }
})

const permission = action => `business:${props.permissionResource || props.resource}:${action}`
const searchFields = computed(() => props.fields.filter(field => field.search))
const tableFields = computed(() => props.fields.filter(field => field.table))
const formFields = computed(() => props.fields.filter(field => field.form !== false))
const rules = computed(() => Object.fromEntries(formFields.value.filter(field => field.required).map(field => [field.prop, [{ required: true, message: `请填写${field.label}`, trigger: 'change' }]])))

const query = reactive({ pageNum: 1, pageSize: 10 })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const showSearch = ref(true)
const dialogOpen = ref(false)
const editing = ref(false)
const form = reactive({})
const formRef = ref()
const lookups = reactive({})

function optionsFor(field) {
  return field.options || lookups[field.lookup] || []
}

function displayValue(field, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (field.type === 'money') return `¥${(Number(value) / 100).toFixed(2)}`
  const option = optionsFor(field).find(item => item.value === value)
  return option ? option.label : value
}

// 表单以元展示金额，提交前统一换算成数据库使用的整数分。
function toForm(data = {}) {
  for (const field of formFields.value) {
    const value = data[field.prop]
    form[field.prop] = field.type === 'money' && value != null
      ? value / 100
      : field.json && value && typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : (value ?? field.default ?? null)
  }
  form[props.idField] = data[props.idField]
}

function toPayload() {
  const payload = { [props.idField]: form[props.idField] }
  for (const field of formFields.value) {
    const value = form[field.prop]
    payload[field.prop] = field.type === 'money' && value != null ? Math.round(value * 100) : value
  }
  return payload
}

async function loadList() {
  loading.value = true
  try {
    const response = await listBusiness(props.resource, query)
    rows.value = response.rows || []
    total.value = Number(response.total || 0)
  } finally {
    loading.value = false
  }
}

function search() {
  query.pageNum = 1
  loadList()
}

function resetSearch() {
  for (const field of searchFields.value) delete query[field.prop]
  search()
}

function openCreate() {
  editing.value = false
  toForm()
  dialogOpen.value = true
}

async function openEdit(row) {
  const response = await getBusiness(props.resource, row[props.idField])
  editing.value = true
  toForm(response.data)
  dialogOpen.value = true
}

async function save() {
  for (const field of formFields.value.filter(item => item.json)) {
    const value = String(form[field.prop] || '').trim()
    if (!value) continue
    try {
      JSON.parse(value)
    } catch {
      ElMessage.error(`${field.label}必须是合法 JSON`)
      return
    }
  }
  // Element Plus 在部分版本中会以 rejected Promise 返回校验失败，必须显式吞掉该分支，避免控制台出现未捕获异常。
  try {
    if (!await formRef.value.validate()) return
  } catch {
    return
  }
  saving.value = true
  try {
    const payload = toPayload()
    if (editing.value) await updateBusiness(props.resource, payload)
    else await createBusiness(props.resource, payload)
    ElMessage.success('保存成功')
    dialogOpen.value = false
    await loadList()
  } finally {
    saving.value = false
  }
}

async function removeRow(row) {
  try {
    await ElMessageBox.confirm(`确认删除${props.title}“${row[tableFields.value[0]?.prop] || row[props.idField]}”？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await removeBusiness(props.resource, row[props.idField])
  ElMessage.success('删除成功')
  if (rows.value.length === 1 && query.pageNum > 1) query.pageNum--
  await loadList()
}

onMounted(async () => {
  const lookupFields = formFields.value.filter(field => field.lookup)
  await Promise.all(lookupFields.map(async field => {
    try {
      const response = await listBusiness(field.lookup, { pageNum: 1, pageSize: 1000 })
      lookups[field.lookup] = (response.rows || []).map(item => ({
        value: item[field.lookupId],
        label: item[field.lookupLabel]
      }))
    } catch {
      // 关联数据加载失败不影响主列表使用，表单中的下拉保持为空。
      lookups[field.lookup] = []
    }
  }))
  await loadList()
})
</script>

<style scoped>
.business-search { margin-bottom: 4px; }
.business-search :deep(.el-form-item) { margin-bottom: 12px; }
</style>

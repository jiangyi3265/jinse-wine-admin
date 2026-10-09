<template>
  <el-cascader :model-value="modelValue" :options="regions" :props="cascaderProps" :disabled="disabled" filterable clearable placeholder="请选择省 / 市 / 区县" style="width:100%" @update:model-value="changed" />
</template>
<script setup>
import { computed } from 'vue'
import { regions } from '@/utils/regions'
const props = defineProps({ modelValue: { type: Array, default: () => [] }, disabled: Boolean, partial: Boolean })
const emit = defineEmits(['update:modelValue', 'change'])
const cascaderProps = computed(() => ({ label: 'name', value: 'name', children: 'children', checkStrictly: props.partial, emitPath: true }))
function changed(path) { emit('update:modelValue', path || []); emit('change', path || []) }
</script>

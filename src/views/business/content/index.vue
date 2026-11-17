<template>
  <div v-if="canEditCampaign" class="campaign-toolbar"><el-button type="primary" icon="Edit" @click="campaignEditor.open()">编辑首页弹窗与活动规则</el-button></div>
  <business-crud title="小程序内容" resource="miniContent" permission-resource="pageContent" id-field="contentId" :fields="fields" />
  <CampaignEditor ref="campaignEditor" />
</template>

<script setup>
import BusinessCrud from '../components/BusinessCrud.vue'
import { computed, ref } from 'vue'
import { checkPermi } from '@/utils/permission'
import CampaignEditor from '../components/CampaignEditor.vue'
import { onOffOptions } from '../components/fields'
const campaignEditor = ref()
const canEditCampaign = computed(() => ['business:pageContent:list', 'business:pageContent:edit', 'business:pageContent:add'].every(permission => checkPermi([permission])))

const contentTypeOptions = [
  { label: '活动横幅', value: 'banner' },
  { label: '页面规则', value: 'rule' },
  { label: '导航配置', value: 'navigation' },
  { label: '图片配置', value: 'image' },
  { label: '页面内容', value: 'page' }
]

// 字段与 biz_mini_content 对齐；JSON 内容由后端按 type 做结构校验。
const fields = [
  { prop: 'contentKey', label: '内容键', search: true, table: true, required: true, maxlength: 128, width: 180 },
  { prop: 'type', label: '内容类型', options: contentTypeOptions, search: true, table: true, required: true, default: 'banner' },
  { prop: 'title', label: '标题', search: true, table: true, required: true, maxlength: 256, width: 180 },
  { prop: 'subtitle', label: '副标题', table: true, maxlength: 255, width: 220 },
  { prop: 'contentJson', label: '内容 JSON', type: 'textarea', maxlength: 32768, required: true, json: true },
  { prop: 'imageUrl', type: 'image', label: '图片', maxlength: 512 },
  { prop: 'linkRoute', label: '跳转页面', maxlength: 128 },
  { prop: 'sortNum', label: '排序', type: 'number', table: true, default: 0 },
  { prop: 'status', label: '状态', options: onOffOptions, search: true, table: true, required: true, default: '0' }
]
</script>
<style scoped>
.campaign-toolbar { padding: 20px 22px 0; background: var(--el-bg-color-page); }
</style>

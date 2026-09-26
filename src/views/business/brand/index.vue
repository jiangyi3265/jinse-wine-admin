<template>
  <div class="app-container">
    <el-card v-loading="loading" shadow="never" class="brand-card">
      <template #header>小程序内容配置</template>
      <el-form ref="formRef" :model="form" label-width="150px" :disabled="saving">
        <el-divider content-position="left">品牌与客服</el-divider>
        <el-form-item v-for="field in brandFields" :key="field.key" :label="field.label" :prop="field.key">
          <el-input v-model.trim="form[field.key]" :type="field.multiline ? 'textarea' : 'text'" :rows="field.multiline ? 4 : 1" :maxlength="field.maxlength" show-word-limit :placeholder="field.placeholder" />
          <div v-if="field.help" class="field-help">{{ field.help }}</div>
        </el-form-item>
        <el-divider content-position="left">首页与活动</el-divider>
        <el-form-item v-for="field in homeFields" :key="field.key" :label="field.label" :prop="field.key">
          <el-input v-model.trim="form[field.key]" :type="field.multiline ? 'textarea' : 'text'" :rows="field.multiline ? 5 : 1" :maxlength="field.maxlength" show-word-limit :placeholder="field.placeholder" />
          <div v-if="field.help" class="field-help">{{ field.help }}</div>
        </el-form-item>
        <el-divider content-position="left">导航与规则</el-divider>
        <el-form-item v-for="field in ruleFields" :key="field.key" :label="field.label" :prop="field.key">
          <el-input v-model.trim="form[field.key]" type="textarea" :rows="6" :maxlength="field.maxlength" show-word-limit :placeholder="field.placeholder" />
          <div v-if="field.help" class="field-help">{{ field.help }}</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" v-hasPermi="['business:brand:edit']" @click="save">保存配置</el-button>
          <el-button :disabled="saving" @click="load">重新加载</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getBrandConfig, updateBrandConfig } from '@/api/business'

// 所有键都落在 biz_brand_config，服务端 /mini/brand 会原样返回，便于小程序按版本逐步启用。
const brandFields = [
  { key: 'finderUserName', label: '视频号用户名', maxlength: 1024, placeholder: '请输入视频号用户名' },
  { key: 'officialAccountQr', label: '公众号二维码', maxlength: 1024, placeholder: '请输入图片地址' },
  { key: 'groupQr', label: '社群二维码', maxlength: 1024, placeholder: '请输入图片地址' },
  { key: 'customerServicePhone', label: '客服电话', maxlength: 32, placeholder: '请输入客服电话' }
]

const homeFields = [
  { key: 'homeCity', label: '首页城市', maxlength: 64, placeholder: '例如：贵港' },
  { key: 'homeHeroImage', label: '首页主视觉图片', maxlength: 1024, placeholder: '请输入图片地址' },
  { key: 'homeHeroTitle', label: '首页主标题', maxlength: 128, placeholder: '例如：金色典藏' },
  { key: 'homeHeroSubtitle', label: '首页副标题', maxlength: 256, placeholder: '例如：53度酱香 · 500mL' },
  { key: 'homeCampaignTitle', label: '首页活动标题', maxlength: 128, placeholder: '例如：节日领券' },
  { key: 'homeCampaignSubtitle', label: '首页活动副标题', maxlength: 256, placeholder: '请输入活动说明' },
  { key: 'homeCampaignImage', label: '活动主图', maxlength: 1024, placeholder: '请输入图片地址' },
  { key: 'homeVideoTitle', label: '视频号入口标题', maxlength: 128, placeholder: '例如：视频号精选' },
  { key: 'homeVideoImage', label: '视频号入口图片', maxlength: 1024, placeholder: '请输入图片地址' },
  { key: 'homeFeaturedProductCode', label: '首页精选商品编码', maxlength: 64, placeholder: '例如：classic' },
  { key: 'homeQuickLinksJson', label: '首页快捷导航 JSON', multiline: true, maxlength: 4096, placeholder: '[{"name":"扫码有礼","icon":"scan","route":"scan"}]', help: '数组字段：name、icon、route。请保持合法 JSON。' },
  { key: 'rankingJson', label: '演示排行 JSON', multiline: true, maxlength: 8192, placeholder: '[{"name":"李先生","amount":328000,"initial":"李"}]', help: '金额使用整数分，字段：name、amount、initial。' }
]

const ruleFields = [
  { key: 'navigationJson', label: '页面导航 JSON', maxlength: 8192, placeholder: '{"shop":"商城","stores":"兑换网点"}', help: '对象字段为页面 route，值为显示名称。请保持合法 JSON。' },
  { key: 'rulesJson', label: '页面规则 JSON', maxlength: 32768, placeholder: '{"points":[{"heading":"积分规则","lines":["规则内容"]}]}', help: '对象字段支持 coupon、points、draw、promotion、ranking、shipping、campaign；每项由 heading 和 lines 组成。' },
  { key: 'pageContentJson', label: '页面文案 JSON', maxlength: 32768, placeholder: '{"service":{"customerTitle":"在线客服"}}', help: '按页面 route 保存标题和文案，便于小程序逐步启用服务端文案。' }
]

const CONFIG_KEYS = [...brandFields, ...homeFields, ...ruleFields].map(field => field.key)
const form = reactive(Object.fromEntries(CONFIG_KEYS.map(key => [key, ''])))
const loading = ref(false)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const response = await getBrandConfig()
    for (const key of CONFIG_KEYS) form[key] = response.data?.[key] ?? ''
  } finally {
    loading.value = false
  }
}

async function save() {
  for (const key of ['homeQuickLinksJson', 'rankingJson', 'navigationJson', 'rulesJson', 'pageContentJson']) {
    const value = form[key].trim()
    if (!value) continue
    try {
      JSON.parse(value)
    } catch {
      ElMessage.error(`${fieldLabel(key)}必须是合法 JSON`)
      return
    }
  }
  saving.value = true
  try {
    await updateBrandConfig(Object.fromEntries(CONFIG_KEYS.map(key => [key, form[key]])))
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

function fieldLabel(key) {
  return [...brandFields, ...homeFields, ...ruleFields].find(field => field.key === key)?.label || key
}

onMounted(load)
</script>

<style scoped>
.brand-card { max-width: 820px; }
.field-help { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; margin-top: 4px; }
</style>

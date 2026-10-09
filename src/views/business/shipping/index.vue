<template>
  <div class="shipping-page">
    <div class="shipping-intro">
      <div>
        <p class="eyebrow">商城履约</p>
        <h1>运费模板</h1>
        <p>商品可关联运费模板，同一模板合并计件，不同模板分别计费。</p>
      </div>
      <el-tag type="success" effect="plain">商品关联模板</el-tag>
    </div>
    <el-alert
      title="按优惠后商品金额判断包邮；未关联或关联模板已停用时使用编号最小的启用模板；包邮门槛为 0 时始终包邮。"
      type="info"
      show-icon
      :closable="false"
      class="shipping-help"
    />
    <business-crud title="运费模板" resource="shippingTemplate" id-field="templateId" :fields="fields" />
  </div>
</template>

<script setup>
import BusinessCrud from '../components/BusinessCrud.vue'
import { onOffOptions } from '../components/fields'

const fields = [
  { prop: 'templateName', label: '模板名称', search: true, table: true, required: true, maxlength: 128, width: 170 },
  { prop: 'freeThresholdCent', label: '满额包邮（元）', type: 'money', table: true, required: true, default: 399, min: 0 },
  { prop: 'baseFeeCent', label: '首件运费（元）', type: 'money', table: true, required: true, default: 12, min: 0 },
  { prop: 'extraFeeCent', label: '续件运费（元）', type: 'money', table: true, required: true, default: 5, min: 0 },
  { prop: 'extraQuantity', label: '每多少件加续件费', type: 'number', table: true, required: true, default: 1, min: 1, max: 9999 },
  { prop: 'status', label: '状态', options: onOffOptions, table: true, search: true, required: true, default: '0' }
]
</script>

<style scoped>
.shipping-page { min-height: calc(100vh - 84px); padding: 18px 20px 28px; background: var(--el-bg-color-page); }
.shipping-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin: 0 auto 14px; max-width: 1440px; }
.eyebrow { margin: 0 0 4px; color: #a77b3c; font-size: 11px; font-weight: 700; letter-spacing: .14em; }
.shipping-intro h1 { margin: 0; color: var(--el-text-color-primary); font-size: 24px; line-height: 1.25; }
.shipping-intro p:last-child { margin: 7px 0 0; color: var(--el-text-color-secondary); font-size: 13px; }
.shipping-help { max-width: 1440px; margin: 0 auto 12px; }
@media (max-width: 768px) { .shipping-page { padding: 12px; } .shipping-intro { align-items: flex-start; } .shipping-intro h1 { font-size: 20px; } }
</style>

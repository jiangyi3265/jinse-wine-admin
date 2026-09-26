<template>
  <business-crud title="门店" resource="store" id-field="storeId" :fields="fields" />
</template>

<script setup>
import BusinessCrud from '../components/BusinessCrud.vue'
import { onOffOptions } from '../components/fields'

// 经纬度采用十进制度数，与 biz_store decimal(10,7) 对齐。
const fields = [
  { prop: 'storeCode', label: '门店编码', search: true, table: true, required: true, maxlength: 64 },
  { prop: 'storeName', label: '门店名称', search: true, table: true, required: true, maxlength: 128, width: 170 },
  { prop: 'city', label: '城市', search: true, table: true, maxlength: 64 },
  { prop: 'district', label: '区县', table: true, maxlength: 64 },
  { prop: 'address', label: '详细地址', table: true, required: true, maxlength: 255, width: 220 },
  { prop: 'phone', label: '联系电话', table: true, maxlength: 32 },
  { prop: 'latitude', label: '纬度', type: 'number', precision: 7, min: -90, max: 90 },
  { prop: 'longitude', label: '经度', type: 'number', precision: 7, min: -180, max: 180 },
  { prop: 'openHours', label: '营业时间', maxlength: 128 },
  { prop: 'imageUrl', label: '门店图片地址', maxlength: 512 },
  { prop: 'serviceQr', label: '客服二维码地址', maxlength: 512 },
  { prop: 'groupQr', label: '社群二维码地址', maxlength: 512 },
  { prop: 'sortNum', label: '排序', type: 'number', default: 0 },
  { prop: 'status', label: '状态', options: onOffOptions, table: true, search: true, required: true, default: '0' },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 }
]
</script>

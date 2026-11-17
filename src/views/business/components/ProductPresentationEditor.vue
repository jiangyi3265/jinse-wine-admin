<template>
  <el-drawer v-model="visible" title="商品图文详情" size="min(1080px, 96vw)" destroy-on-close :close-on-click-modal="false" :before-close="close">
    <div v-loading="loading" class="presentation-editor">
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
      <template v-if="ready">
        <header class="editor-heading"><h2>{{ product.productName }}</h2><span>{{ product.spec }}</span></header>
        <el-alert v-if="staleSpec" title="商品规格已调整，请核对以下图文内容后保存。" type="warning" :closable="false" show-icon />
        <el-tabs v-model="tab">
          <el-tab-pane label="图片与文案" name="photos">
            <p class="editor-hint">首张为商品主图，在商品资料中维护。其余图片可调整顺序，保存后同步到详情展示和顶部轮播。</p>
            <div v-for="(photo, index) in photos" :key="photo.key" class="photo-editor">
              <BusinessImageUpload v-model="photo.src" :context-key="photo.key" :active="visible" :disabled="saving || isMain(photo)" />
              <div class="photo-copy">
                <el-input v-model="photo.heading" placeholder="图片标题，例如 瓶身与礼盒" maxlength="80" :disabled="saving" />
                <el-input v-model="photo.caption" type="textarea" :rows="3" placeholder="图片说明" maxlength="1000" show-word-limit :disabled="saving" />
                <div class="editor-actions">
                  <el-button :disabled="index === 0 || isMain(photos[index - 1]) || saving" @click="move(index, -1)">上移</el-button>
                  <el-button :disabled="index === photos.length - 1 || isMain(photo) || saving" @click="move(index, 1)">下移</el-button>
                  <el-button type="danger" plain :disabled="isMain(photo) || saving" @click="photos.splice(index, 1)">移除图片</el-button>
                </div>
              </div>
            </div>
            <el-button :disabled="photos.length >= 10 || saving" icon="Plus" @click="addPhoto">添加详情图片</el-button>
          </el-tab-pane>
          <el-tab-pane label="品牌与门店" name="story">
            <p class="editor-hint">与商品实拍分开展示，适合补充品牌门店介绍。留空标题时不展示。</p>
            <el-input v-model="story.title" placeholder="章节标题" maxlength="80" :disabled="saving" />
            <el-input v-model="story.text" type="textarea" :rows="4" placeholder="品牌或门店说明" maxlength="2000" :disabled="saving" style="margin:16px 0" />
            <BusinessImageUpload v-model="story.imageUrl" context-key="brand-story" :active="visible" :disabled="saving" />
            <el-input v-model="story.caption" placeholder="照片说明，请注明门店或场景" maxlength="500" :disabled="saving" />
          </el-tab-pane>
          <el-tab-pane label="商品参数" name="parameters">
            <p class="editor-hint">商品名称、规格和分类自动读取商品资料。其余参数在下方维护。</p>
            <div v-for="(row, index) in parameters" :key="index" class="parameter-editor">
              <el-input v-model="row[0]" placeholder="参数名，例如 配料" maxlength="40" :disabled="saving" />
              <el-input v-model="row[1]" placeholder="参数值" maxlength="1000" :disabled="saving" />
              <el-button text type="danger" :disabled="saving" @click="parameters.splice(index, 1)">删除</el-button>
            </div>
            <el-button :disabled="parameters.length >= 30 || saving" icon="Plus" @click="parameters.push(['', ''])">添加参数</el-button>
            <h3>重点规格</h3>
            <div v-for="(fact, index) in facts" :key="index" class="fact-editor">
              <el-input v-model="fact.label" placeholder="名称，如 酒精度" maxlength="20" :disabled="saving" />
              <el-input v-model="fact.value" placeholder="数值，如 52" maxlength="30" :disabled="saving" />
              <el-input v-model="fact.unit" placeholder="单位，如 %vol" maxlength="20" :disabled="saving" />
              <el-button text type="danger" :disabled="saving" @click="facts.splice(index, 1)">删除</el-button>
            </div>
            <el-button :disabled="facts.length >= 3 || saving" icon="Plus" @click="facts.push({ label: '', value: '', unit: '' })">添加重点规格</el-button>
            <h3>选购说明</h3>
            <el-input v-model="selection" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="说明每件包含的商品、瓶数和规格" :disabled="saving" />
          </el-tab-pane>
          <el-tab-pane label="内容预览" name="preview">
            <div class="phone-preview">
              <h2>{{ product.productName }}</h2><p>{{ product.description }}</p>
              <template v-for="photo in previewPhotos" :key="photo.src"><h3>{{ photo.heading }}</h3><el-image :src="mediaUrl(photo.src)" fit="contain" /><p>{{ photo.caption }}</p></template>
              <template v-if="story.title"><h3>{{ story.title }}</h3><p>{{ story.text }}</p><el-image v-if="story.imageUrl" :src="mediaUrl(story.imageUrl)" fit="contain"/><p>{{ story.caption }}</p></template>
              <h3>产品档案</h3><div v-for="row in parameters" :key="row[0]" class="preview-parameter"><span>{{ row[0] }}</span><span>{{ row[1] }}</span></div>
              <p>{{ selection }}</p>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
    <template #footer>
      <span class="editor-footer-hint">保存后，小程序重新进入商品页即可看到更新。</span>
      <el-button :disabled="saving" @click="close()">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!ready || pendingImageUploads > 0" @click="save">保存图文详情</el-button>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createBusiness, getBusiness, listBusiness, updateBusiness } from '@/api/business'
import { mediaUrl, pendingImageUploads } from '@/utils/businessMedia'
import BusinessImageUpload from './BusinessImageUpload.vue'

const visible = ref(false), loading = ref(false), saving = ref(false), ready = ref(false), error = ref(''), tab = ref('photos')
const product = ref({}), photos = ref([]), parameters = ref([]), facts = ref([]), selection = ref(''), story = ref({}), staleSpec = ref(false)
let original = null, content = {}, expectedContent = {}, sequence = 0
const filename = value => String(value || '').split('?')[0].split('/').pop()
const previewPhotos = computed(() => photos.value.filter(photo => photo.src))
const isMain = photo => !!photo && photo.src === product.value.imageUrl

async function open(row) {
  const revision = ++sequence
  visible.value = true
  loading.value = true
  ready.value = false
  error.value = ''
  tab.value = 'photos'
  try {
    const [productResult, result] = await Promise.all([
      getBusiness('product', row.productId),
      listBusiness('miniContent', { exactContentKey: `product.gallery.${row.productCode}`, contentKey: `product.gallery.${row.productCode}`, pageSize: 200 }),
    ])
    if (revision !== sequence || !visible.value) return
    product.value = productResult.data
    original = result.rows.find(item => item.contentKey === `product.gallery.${row.productCode}`) || null
    content = typeof original?.contentJson === 'string' ? JSON.parse(original.contentJson) : original?.contentJson || {}
    expectedContent = JSON.parse(JSON.stringify(content))
    const detail = content.detail || {}
    staleSpec.value = !!detail.spec && detail.spec !== product.value.spec
    const urls = [...new Set([product.value.imageUrl, ...(content.photos || [])].filter(Boolean))]
    photos.value = urls.map((src, index) => ({ key: `${revision}-${index}`, src, heading: detail.images?.find(item => item.file === filename(src))?.heading || '商品实拍', caption: detail.images?.find(item => item.file === filename(src))?.caption || '' }))
    parameters.value = (detail.parameters || []).map(row => [...row])
    facts.value = (detail.facts || []).map(row => ({ ...row }))
    selection.value = detail.selection || ''
    story.value = { title: '', text: '', imageUrl: '', caption: '', ...detail.story }
    ready.value = true
  } catch (e) { if (revision === sequence) error.value = e.message || '图文详情加载失败，请关闭后重试' }
  finally { if (revision === sequence) loading.value = false }
}
function addPhoto() { photos.value.push({ key: `photo-${++sequence}`, src: '', heading: '', caption: '' }) }
function move(index, direction) { const next = index + direction; [photos.value[index], photos.value[next]] = [photos.value[next], photos.value[index]] }
async function close(done) {
  if (saving.value || pendingImageUploads.value) return ElMessage.warning('请等待保存或图片上传完成')
  if (ready.value) {
    try { await ElMessageBox.confirm('关闭编辑窗口后，未保存的修改将丢失。', '关闭图文编辑', { confirmButtonText: '关闭', cancelButtonText: '继续编辑' }) }
    catch { return }
  }
  sequence++
  visible.value = false
  if (typeof done === 'function') done()
}
async function save() {
  if (saving.value || !ready.value || pendingImageUploads.value) return
  if (!photos.value.length || photos.value.some(photo => !photo.src)) return ElMessage.warning('请上传至少一张图片，并移除空白图片栏')
  if (parameters.value.some(row => !row[0].trim() || !row[1].trim())) return ElMessage.warning('请填写完整的商品参数')
  if (facts.value.some(row => !row.label.trim() || !row.value.trim())) return ElMessage.warning('请填写重点规格的名称和数值')
  saving.value = true
  try {
    const current = (await getBusiness('product', product.value.productId)).data
    if (current.spec !== product.value.spec || current.productCode !== product.value.productCode) throw new Error('商品规格或编码已变化，请重新打开编辑窗口')
    const next = {
      ...content, productCode: current.productCode,
      photos: [...new Set(photos.value.map(photo => photo.src))],
      detail: { ...content.detail, spec: current.spec, parameters: parameters.value, facts: facts.value, selection: selection.value, story: story.value.title.trim() ? story.value : null,
        images: photos.value.map(photo => ({ file: filename(photo.src), heading: photo.heading, caption: photo.caption })) },
    }
    const payload = { ...original, contentKey: `product.gallery.${current.productCode}`, type: 'page', contentType: 'page', title: `${current.productName}图文详情`, contentJson: next, status: original?.status || '0', sortNum: original?.sortNum || 0, expectedProductSpec: current.spec }
    if (original) await updateBusiness('miniContent', { ...payload, expectedContentJson: expectedContent, expectedContentKey: original.contentKey, expectedStatus: original.status })
    else await createBusiness('miniContent', payload)
    ElMessage.success('图文详情已保存，小程序同步生效')
    ready.value = false
    visible.value = false
  } catch (e) { ElMessage.error(e.message || '保存失败，请重试') }
  finally { saving.value = false }
}
defineExpose({ open })
</script>

<style scoped>
.presentation-editor { min-height: 200px; }
.editor-heading { display: flex; align-items: baseline; gap: 16px; margin-bottom: 20px; }
.editor-heading h2 { margin: 0; font-size: 22px; }
.editor-heading span, .editor-hint, .editor-footer-hint { color: var(--el-text-color-secondary); font-size: 13px; }
.editor-hint { margin: 0 0 20px; line-height: 1.8; }
.photo-editor { display: grid; grid-template-columns: 205px 1fr; gap: 20px; border: 1px solid var(--el-border-color-light); border-radius: 12px; padding: 18px; margin-bottom: 16px; }
.photo-copy { display: flex; flex-direction: column; gap: 12px; }
.editor-actions { display: flex; gap: 8px; }
.editor-actions .el-button { margin-left: 0; }
.parameter-editor { display: grid; grid-template-columns: 150px 1fr 60px; gap: 10px; margin-bottom: 12px; }
.fact-editor { display: grid; grid-template-columns: 1fr 1fr 1fr 60px; gap: 10px; margin-bottom: 12px; }
.editor-footer-hint { margin-right: 18px; }
.phone-preview { width: 390px; max-width: 100%; margin: auto; padding: 20px; background: #faf9f6; border: 1px solid #e9e5e1; border-radius: 16px; color: #232321; }
.phone-preview .el-image { display: block; width: 100%; }
.phone-preview p { font-size: 13px; line-height: 1.9; color: #85817e; }
.preview-parameter { display: grid; grid-template-columns: 90px 1fr; gap: 12px; padding: 12px; background: #f1efeb; font-size: 12px; }
@media (max-width: 700px) { .photo-editor { grid-template-columns: 1fr; } .editor-footer-hint { display: none; } .parameter-editor { grid-template-columns: 100px 1fr 45px; } }
</style>

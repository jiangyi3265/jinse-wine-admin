<template>
  <div v-loading="loading" class="home-page">
    <header class="home-header">
      <div class="header-copy">
        <p class="workspace-label">金色酒业 / 工作台</p>
        <h1>{{ greeting }}，{{ userStore.nickName || userStore.name || '工作人员' }}</h1>
        <div class="role-line">
          <el-tag v-for="role in roleLabels" :key="role" effect="plain" size="small">{{ role }}</el-tag>
          <span class="today-label">{{ todayLabel }}</span>
        </div>
      </div>
      <el-button v-if="canOpenOperations" class="header-action" type="primary" @click="router.push('/business/operations')">
        <svg-icon icon-class="chart" />
        <span>运营中心</span>
      </el-button>
    </header>

    <section v-if="canSeeDashboard && visibleStatItems.length" class="metric-grid" aria-label="经营摘要">
      <button v-for="item in visibleStatItems" :key="item.key" class="metric-card" type="button" :aria-label="`${item.label} ${metricValue(item)}`" @click="openMetric(item)">
        <span class="metric-icon" :class="`metric-${item.tone}`"><svg-icon :icon-class="item.icon" /></span>
        <span class="metric-copy"><small>{{ item.label }}</small><strong>{{ metricValue(item) }}</strong></span>
      </button>
    </section>

    <div class="home-layout" :class="{ 'without-side': !attentionLinks.length }">
      <main class="home-main">
        <section class="content-section">
          <div class="section-heading">
            <h2>工作入口</h2>
            <span class="module-count">{{ quickLinks.length }} 个可用模块</span>
          </div>
          <div v-if="quickLinks.length" class="module-grid">
            <button v-for="item in quickLinks" :key="item.path" class="module-card" type="button" :title="item.description" @click="router.push(item.path)">
              <span class="module-icon"><svg-icon :icon-class="item.icon" /></span>
              <strong>{{ item.title }}</strong>
            </button>
          </div>
          <div v-else class="empty-access"><svg-icon icon-class="lock" /><strong>当前账号暂无业务入口</strong><p>请联系管理员配置岗位权限。</p></div>
        </section>
      </main>

      <aside v-if="attentionLinks.length" class="home-side">
        <section class="attention-section">
          <div class="section-heading"><h2>常用工作</h2></div>
          <div class="attention-list">
            <button v-for="item in attentionLinks" :key="item.title" class="attention-item" type="button" :title="item.description" @click="router.push(item.path)">
              <span class="attention-icon"><svg-icon :icon-class="item.icon" /></span>
              <strong>{{ item.title }}</strong>
            </button>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getDashboard } from '@/api/business/extension'
import { checkPermi } from '@/utils/permission'
import useUserStore from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const dashboard = ref({})
const routeEntries = [
  { path: '/business/operations', permission: 'business:dashboard:query', title: '运营工作台', icon: 'chart', description: '处理抽奖、分销和财务事项' },
  { path: '/business/order', permission: 'business:order:list', title: '订单管理', icon: 'shopping', description: '处理订单和履约状态' },
  { path: '/business/refund', permission: 'business:refund:list', title: '退款售后', icon: 'money', description: '处理退款审核与退货换货' },
  { path: '/business/report', permission: 'business:report:export', title: '财务报表', icon: 'documentation', description: '导出交易、佣金与核销报表' },
  { path: '/business/product', permission: 'business:product:list', title: '商品管理', icon: 'shopping', description: '维护商品、规格与库存' },
  { path: '/business/category', permission: 'business:productCategory:list', title: '商品分类', icon: 'tree-table', description: '维护商品分类和展示顺序' },
  { path: '/business/sku', permission: 'business:product:list', title: '商品规格', icon: 'list', description: '维护规格组合和库存' },
  { path: '/business/store', permission: 'business:store:list', title: '门店管理', icon: 'system', description: '管理门店和兑换服务' },
  { path: '/business/member', permission: 'business:member:list', title: '会员管理', icon: 'peoples', description: '查看会员与核销员账号' },
  { path: '/business/reward', permission: 'business:reward:list', title: '奖品管理', icon: 'star', description: '处理抽奖奖品与权益' },
  { path: '/business/redemption', permission: 'business:redemption:list', title: '核销记录', icon: 'checkbox', description: '追踪门店核销记录' },
  { path: '/business/coupon', permission: 'business:couponTemplate:list', title: '优惠券管理', icon: 'money', description: '配置优惠券发放规则' },
  { path: '/business/exchange', permission: 'business:exchangeItem:list', title: '积分兑换', icon: 'star', description: '管理积分兑换商品' },
  { path: '/business/brand', permission: 'business:brand:query', title: '品牌配置', icon: 'edit', description: '维护小程序品牌配置' },
]
const statItems = [
  { key: 'orders', label: '订单总数', icon: 'shopping', tone: 'green', hint: '累计订单', path: '/business/order', permission: 'business:order:list' },
  { key: 'salesCent', label: '净销售额', icon: 'money', tone: 'gold', hint: '已支付订单', path: '/business/order', permission: 'business:order:list', money: true },
  { key: 'members', label: '会员数', icon: 'peoples', tone: 'blue', hint: '正常会员', path: '/business/member', permission: 'business:member:list' },
  { key: 'draws', label: '抽奖次数', icon: 'star', tone: 'purple', hint: '累计参与', path: '/business/operations', permission: 'business:lottery:list' },
  { key: 'redemptions', label: '确认核销', icon: 'checkbox', tone: 'orange', hint: '奖品及自提', path: '/business/redemption', permission: 'business:redemption:list' },
  { key: 'commissionCent', label: '累计佣金', icon: 'money', tone: 'red', hint: '待结算及已结算', path: '/business/operations', permission: 'business:promotion:query', money: true },
]
const roleNameMap = { admin: '超级管理员', operator: '运营人员', finance: '财务人员', verifier: '核销员', common: '普通用户' }
const roleLabels = computed(() => (userStore.roles || []).map(role => roleNameMap[role] || role).filter(Boolean))
const roleProfiles = {
  admin: {
    statKeys: statItems.map(item => item.key),
    order: ['/business/operations', '/business/order', '/business/refund', '/business/report', '/business/product', '/business/store', '/business/member']
  },
  finance: {
    statKeys: ['orders', 'salesCent', 'commissionCent', 'redemptions'],
    order: ['/business/report', '/business/refund', '/business/operations', '/business/order', '/business/redemption', '/business/member']
  },
  operator: {
    statKeys: ['orders', 'members', 'draws', 'redemptions'],
    order: ['/business/operations', '/business/product', '/business/category', '/business/member', '/business/store']
  },
  verifier: {
    statKeys: [],
    order: ['/business/redemption', '/business/reward', '/business/order', '/business/store']
  }
}
const primaryRole = computed(() => {
  const roles = userStore.roles || []
  return ['admin', 'finance', 'operator', 'verifier'].find(role => roles.includes(role)) || ''
})
const roleProfile = computed(() => roleProfiles[primaryRole.value] || {
  statKeys: statItems.map(item => item.key),
  order: []
})
const canSeeDashboard = computed(() => checkPermi(['business:dashboard:query']))
const canOpenOperations = computed(() => router.getRoutes().some(route => route.path === '/business/operations') && checkPermi(['business:dashboard:query', 'business:lottery:list', 'business:promotion:query', 'business:settlement:list']))
const greeting = computed(() => { const hour = new Date().getHours(); return hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好' })
const todayLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()))
const visibleStatItems = computed(() => statItems.filter(item => roleProfile.value.statKeys.includes(item.key)
  && checkPermi([item.permission]) && Object.prototype.hasOwnProperty.call(dashboard.value, item.key)))
const routeAvailable = path => router.getRoutes().some(route => route.path === path)
const roleOrder = path => {
  const position = roleProfile.value.order.indexOf(path)
  return position === -1 ? 999 : position
}
const quickLinks = computed(() => routeEntries
  .filter(item => routeAvailable(item.path) && checkPermi([item.permission]))
  .sort((left, right) => roleOrder(left.path) - roleOrder(right.path) || left.title.localeCompare(right.title, 'zh-CN')))
const attentionLinks = computed(() => [
  { path: '/business/operations', permission: 'business:lottery:list', title: '抽奖与活动', description: '配置活动、奖项概率和二维码批次', icon: 'star' },
  { path: '/business/operations', permission: 'business:settlement:list', title: '结算与报表', description: '查看佣金提现和标准化财务报表', icon: 'documentation' },
  { path: '/business/operations', permission: 'business:promotion:query', title: '分销运营', description: '维护佣金梯度、排行和推广数据', icon: 'peoples' },
  { path: '/business/operations', permission: 'business:social:list', title: '社群触达', description: '发布活动并查看消息投递结果', icon: 'message' },
  { path: '/business/redemption', permission: 'business:redemption:list', title: '核销追踪', description: '查看门店核销记录和处理状态', icon: 'checkbox' },
].filter(item => routeAvailable(item.path) && checkPermi([item.permission]))
  .sort((left, right) => roleOrder(left.path) - roleOrder(right.path)))

function metricValue(item) { const value = Number(dashboard.value[item.key] || 0); return item.money ? `¥${(value / 100).toFixed(2)}` : value.toLocaleString('zh-CN') }
function openMetric(item) { if (router.getRoutes().some(route => route.path === item.path) && checkPermi([item.permission])) router.push(item.path) }

onMounted(() => {
  if (!canSeeDashboard.value) return
  loading.value = true
  getDashboard().then(result => { dashboard.value = result || {} }).catch(() => {}).finally(() => { loading.value = false })
})
</script>


<style scoped>
.home-page {
  min-height: calc(100vh - 84px);
  padding: 24px 30px 40px;
  background: #f5f7f5;
}
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  max-width: 1240px;
  margin: 0 auto 20px;
  padding: 0 0 20px;
  border-bottom: 1px solid #dce5df;
}
.header-copy { min-width: 0; }
.workspace-label { margin: 0 0 8px; color: #8b632f; font-size: 12px; font-weight: 650; }
.home-header h1 { margin: 0; color: #183b2e; font-size: 24px; line-height: 1.35; }
.role-line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.today-label { color: #67766c; font-size: 12px; }
.header-action { flex: none; }
.header-action .svg-icon { margin-right: 6px; }
.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  max-width: 1240px;
  margin: 0 auto 26px;
}
.metric-card {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  min-height: 80px;
  padding: 14px 12px;
  border: 1px solid #dce5df;
  border-radius: 6px;
  background: #fff;
  color: #183b2e;
  text-align: left;
  box-shadow: none;
  cursor: pointer;
}
.metric-card:hover, .module-card:hover { border-color: #ad8249; }
.metric-icon, .module-icon, .attention-icon { display: grid; flex: none; place-items: center; border-radius: 6px; }
.metric-icon { width: 34px; height: 34px; font-size: 17px; }
.metric-green { color: #28624f; background: #edf3ed; }
.metric-gold { color: #9a6d2f; background: #faf2e5; }
.metric-blue { color: #3d6d89; background: #edf4f8; }
.metric-purple { color: #6f5a86; background: #f2edf7; }
.metric-orange { color: #a86532; background: #fbefe6; }
.metric-red { color: #99534c; background: #f9ecea; }
.metric-copy { display: grid; min-width: 0; gap: 4px; }
.metric-copy small { color: #68766d; font-size: 12px; }
.metric-copy strong { overflow: hidden; font-size: 19px; text-overflow: ellipsis; white-space: nowrap; }
.home-layout { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 24px; max-width: 1240px; margin: 0 auto; }
.home-layout.without-side { grid-template-columns: minmax(0, 1fr); }
.home-main { min-width: 0; }
.home-side { display: block; border-left: 1px solid #dce5df; padding-left: 22px; }
.content-section { padding: 0; border: 0; border-radius: 0; background: transparent; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; }
.section-heading h2 { margin: 0; color: #183b2e; font-size: 17px; }
.module-count { color: #68766d; font-size: 12px; white-space: nowrap; }
.module-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.module-card {
  display: flex;
  min-width: 0;
  align-items: center;
  min-height: 62px;
  padding: 11px 14px;
  border: 1px solid #dce5df;
  border-radius: 6px;
  background: #fff;
  color: #183b2e;
  text-align: left;
  box-shadow: none;
  cursor: pointer;
}
.module-card strong { overflow: hidden; margin-left: 11px; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.module-icon { flex-basis: 32px; width: 32px; height: 32px; background: #edf3ed; color: #28624f; font-size: 17px; }
.empty-access { padding: 24px; color: #68766d; text-align: center; }
.empty-access strong { display: block; margin-top: 8px; color: #294538; }
.empty-access p { margin: 6px 0 0; font-size: 12px; }
.attention-section { padding: 0; }
.attention-list { border-top: 1px solid #dce5df; }
.attention-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 54px;
  padding: 10px 2px;
  border: 0;
  border-bottom: 1px solid #dce5df;
  border-radius: 0;
  background: transparent;
  color: #294538;
  text-align: left;
  cursor: pointer;
}
.attention-item:hover { border-color: #dce5df; background: #edf3ef; }
.attention-item strong { color: #294538; font-size: 13px; }
.attention-icon { flex-basis: 28px; width: 28px; height: 28px; background: #edf3ed; color: #28624f; }
@media (max-width: 1100px) {
  .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .module-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .home-layout { grid-template-columns: minmax(0, 1fr); }
  .home-side { border-left: 0; border-top: 1px solid #dce5df; padding: 18px 0 0; }
  .attention-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 20px; }
}
@media (max-width: 600px) {
  .home-page { padding: 18px 14px 30px; }
  .home-header { align-items: flex-start; flex-wrap: wrap; gap: 12px; }
  .home-header h1 { font-size: 20px; }
  .header-action { width: auto; margin: 0; }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metric-card { min-height: 72px; }
  .module-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .module-card { min-height: 58px; padding: 9px; }
  .module-card strong { margin-left: 7px; font-size: 12px; }
  .attention-list { grid-template-columns: minmax(0, 1fr); }
}
</style>

<template>
  <div class="app-container operations-page">
    <div class="dashboard-heading">
      <div><div class="dashboard-kicker">经营数据 · 业务管理</div><h2>运营工作台</h2><p>查看经营趋势，处理活动、分销与结算事项</p></div>
      <el-tag effect="plain" type="info">管理后台</el-tag>
    </div>
    <el-tabs v-model="active" type="border-card" class="operations-tabs">
      <el-tab-pane v-if="canSeeTab('overview')" label="经营概览" name="overview">
        <div class="overview-content">
    <el-row v-if="canSeeDashboard && visibleStatItems.length" :gutter="16" class="stat-row">
      <el-col v-for="item in visibleStatItems" :key="item.key" :xs="12" :sm="8" :md="8" :lg="4">
        <el-card shadow="never" :class="['stat-card', `metric-${item.key}`]"><div class="stat-label">{{ item.label }}</div><div class="stat-value">{{ statValue(item.key) }}</div></el-card>
      </el-col>
    </el-row>
    <el-card v-if="canSeeDashboard && visibleTrendSeries.length" shadow="never" class="trend-card">
      <div class="trend-heading"><span>近 7 日经营趋势</span><span class="trend-note">按自然日统计</span></div>
      <div class="trend-chart">
        <div v-if="!hasTrendData" class="trend-empty">
          <span class="trend-empty-mark">—</span>
          <span>暂无经营数据</span>
          <small>产生相关业务记录后，这里会显示近 7 日趋势</small>
        </div>
        <div v-for="item in trend" :key="item.day" class="trend-day">
          <div class="trend-bars">
            <span v-for="series in visibleTrendSeries" :key="series.key" class="trend-bar" :class="series.key" :style="{ height: `${barHeight(item, series.key)}%` }" :title="`${series.label} ${item[series.key]}`" />
          </div>
          <span class="trend-label">{{ item.day.slice(5) }}</span>
        </div>
      </div>
      <div class="trend-legend"><span v-for="series in visibleTrendSeries" :key="series.key"><i :class="series.key" />{{ series.label }}</span></div>
    </el-card>
    <section v-if="showReadinessPanel && canSeeTab('channel')" class="readiness-panel">
      <div class="readiness-heading">
        <div>
          <div class="readiness-kicker">上线前检查</div>
          <h3>渠道与生产条件</h3>
          <p>记录正式平台回执后完成验收；配置发生变化时，原验收记录自动失效。</p>
        </div>
        <el-button text :loading="readinessLoading" @click="loadReadiness">刷新检查</el-button>
      </div>
      <div class="readiness-summary">
        <span class="readiness-summary-item ready"><b>{{ readiness.readyCount || 0 }}</b>已就绪</span>
        <span class="readiness-summary-item verify"><b>{{ readiness.verificationCount || 0 }}</b>待验证</span>
        <span class="readiness-summary-item pending"><b>{{ readiness.pendingCount || 0 }}</b>待处理</span>
        <el-tag :type="readiness.productionReady ? 'success' : 'warning'" effect="plain">{{ readiness.productionReady ? '上线条件已就绪' : '尚未满足上线条件' }}</el-tag>
      </div>
      <div class="readiness-progress" aria-label="上线条件完成度">
        <div class="readiness-progress-label"><span>上线条件完成度</span><strong>{{ readinessProgress }}%</strong></div>
        <div class="readiness-progress-track"><span :style="{ width: `${readinessProgress}%` }" /></div>
        <small>平台验收须填写真实交易、消息或渠道回执，系统保留操作人和时间。</small>
      </div>
      <div class="readiness-grid">
        <article v-for="item in readiness.checks" :key="item.key" class="readiness-item">
          <div class="readiness-item-top"><strong>{{ item.label }}</strong><el-tag :type="readinessTagType(item.status)" effect="plain" size="small">{{ readinessStatusLabel(item.status) }}</el-tag></div>
          <p>{{ item.detail }}</p>
          <div class="readiness-item-footer"><small>{{ item.verifiedAt ? `${item.verifiedBy} · ${String(item.verifiedAt).slice(0, 16)}` : item.action }}</small><el-button v-if="readinessTarget(item)" link type="primary" size="small" @click="focusReadiness(item)">查看配置</el-button><el-button v-if="item.key === 'adminPassword' && item.status === 'pending'" link type="primary" size="small" @click="openPasswordReset">修改密码</el-button><el-button v-if="item.status === 'verify'" v-hasRole="['admin']" link type="primary" size="small" :loading="verifyingKey === item.key" @click="confirmReadiness(item)">登记验收</el-button></div>
        </article>
        <div v-if="!readiness.checks.length" class="readiness-empty">正在读取上线条件...</div>
      </div>
    </section>
        </div>
      </el-tab-pane>
      <el-tab-pane v-if="canSeeTab('lottery')" label="扫码抽奖" name="lottery">
        <el-form :inline="true" :model="lotteryForm" @submit.prevent>
          <el-form-item label="活动" required><el-select v-model="lotteryForm.activityCode" :disabled="saving || exportingCodes" placeholder="请选择活动" style="width:260px" @change="changeLotteryActivity"><el-option v-for="item in activities" :key="item.activityCode" :label="item.activityName" :value="item.activityCode" /></el-select></el-form-item>
          <el-form-item label="生成数量" required><el-input-number v-model="lotteryForm.count" :disabled="saving || exportingCodes" :min="1" :max="100" /></el-form-item>
          <el-form-item><el-button type="primary" :loading="saving" :disabled="exportingCodes" v-hasPermi="['business:lottery:generate']" @click="generateCodes">批量生成活动码</el-button></el-form-item>
        </el-form>
        <el-alert type="info" :closable="false" class="result-alert" title="按当前概率在生成时确定每个码的结果，并预留奖品库存。每码只可领取一次；修改概率或奖项不改变已生成结果。" />
        <div v-if="checkPermi(['business:lottery:generate'])" class="lottery-batches">
          <div class="lottery-batches-heading"><strong>生成批次</strong><el-button :disabled="saving || exportingCodes" :loading="batchLoading" @click="loadCodeBatches">刷新列表</el-button></div>
          <el-table :data="codeBatches" v-loading="batchLoading" border stripe row-key="batchId" empty-text="该活动尚未生成批次">
            <el-table-column prop="createTime" label="生成时间" min-width="170" />
            <el-table-column label="生成数量" width="100"><template #default="scope">{{ scope.row.codeCount }} 个</template></el-table-column>
            <el-table-column label="中奖 / 未中奖" width="150"><template #default="scope">{{ scope.row.winCount }} / {{ scope.row.codeCount - scope.row.winCount }}</template></el-table-column>
            <el-table-column label="奖项分布" min-width="340"><template #default="scope"><div class="batch-prize-counts"><el-tag v-for="item in scope.row.prizeCounts || []" :key="`${item.resultType}-${item.prizeName}`" size="small" effect="plain">{{ item.prizeName }} {{ item.codeCount }}</el-tag></div></template></el-table-column>
            <el-table-column label="批次号" min-width="190"><template #default="scope">{{ scope.row.batchId }}</template></el-table-column>
            <el-table-column label="操作" width="170" fixed="right"><template #default="scope"><el-button link type="primary" :disabled="saving || exportingCodes" @click="loadCodeBatch(scope.row.batchId)">详情</el-button><el-button link type="primary" :disabled="saving || exportingCodes" :loading="exportingCodes && exportingBatchId === scope.row.batchId" @click="downloadCodeExcel(scope.row)">导出 Excel</el-button></template></el-table-column>
          </el-table>
          <el-pagination v-if="codeBatchTotal > codeBatchPageSize" class="lottery-batch-pagination" small background layout="total, prev, pager, next" :total="codeBatchTotal" :page-size="codeBatchPageSize" :current-page="codeBatchPage" @current-change="changeCodeBatchPage" />
        </div>
        <template v-if="selectedBatchId && codes.length">
        <div class="batch-detail-heading"><div><strong>批次详情</strong><span>{{ selectedBatchSummary?.createTime }} · {{ codes.length }} 个码</span></div><el-button :icon="Download" :disabled="saving" :loading="exportingCodes" @click="downloadCodeExcel">下载本批二维码 Excel</el-button></div>
        <el-alert type="success" :closable="false" :title="`本批中奖 ${codes.filter(item => item.resultType !== 'none').length} 个，未中奖 ${codes.filter(item => item.resultType === 'none').length} 个。中奖结果在生成时固定。`" class="result-alert" />
        <el-table :data="codes" border stripe class="generated-codes">
          <el-table-column prop="code" label="抽奖码" min-width="260" />
          <el-table-column label="固定结果" width="100"><template #default="scope"><el-tag :type="scope.row.resultType === 'none' ? 'info' : 'success'">{{ scope.row.resultType === 'none' ? '未中奖' : '中奖' }}</el-tag></template></el-table-column>
          <el-table-column label="奖项" min-width="180"><template #default="scope">{{ scope.row.prizeName }}<span v-if="scope.row.resultType === 'cash'"> · {{ (Number(scope.row.amountCent) / 100).toFixed(2) }} 元</span><span v-if="scope.row.resultType === 'points'"> · {{ scope.row.points }} 积分</span></template></el-table-column>
          <el-table-column label="领取状态" width="100"><template #default="scope">{{ { reserved: '待领取', claimed: '已领取', expired: '已过期' }[scope.row.status] || scope.row.status }}</template></el-table-column>
          <el-table-column prop="expiresAt" label="码有效期至" min-width="170"><template #default="scope">{{ scope.row.expiresAt || '随活动有效' }}</template></el-table-column>
          <el-table-column label="二维码字符串" min-width="320"><template #default="scope"><el-input :model-value="scope.row.linkUrl" readonly size="small"><template #append><el-button @click="copyQrLink(scope.row.linkUrl)">复制</el-button></template></el-input></template></el-table-column>
        </el-table>
        </template>
        <el-table :data="activities" border stripe v-loading="lotteryLoading" empty-text="暂无抽奖活动"><el-table-column prop="activityName" label="活动" min-width="150" /><el-table-column prop="activityCode" label="活动码" min-width="160" /><el-table-column prop="dailyLimit" label="每日次数" width="100" /><el-table-column prop="totalLimit" label="总次数" width="100" /><el-table-column prop="usedCount" label="已使用" width="100" /><el-table-column label="状态" width="90"><template #default="scope"><el-tag :type="String(scope.row.status) === '0' ? 'success' : 'info'" effect="plain">{{ String(scope.row.status) === '0' ? '启用' : '停用' }}</el-tag></template></el-table-column><el-table-column label="操作" width="90" fixed="right"><template #default="scope"><el-button link type="primary" v-hasPermi="['business:lottery:edit']" @click="editActivity(scope.row)">编辑</el-button></template></el-table-column></el-table>
        <div class="subsection-head"><span>奖项与概率</span><el-button size="small" type="primary" plain v-hasPermi="['business:lottery:edit']" @click="openNewPrize">新增奖项</el-button></div>
        <el-table :data="prizes" border stripe v-loading="prizeLoading" empty-text="当前活动暂无奖项"><el-table-column prop="prizeName" label="奖项" /><el-table-column label="类型" width="110"><template #default="scope"><el-tag size="small" effect="plain" :type="prizeTypeTag(scope.row.prizeType)">{{ prizeTypeLabel(scope.row.prizeType) }}</el-tag></template></el-table-column><el-table-column label="中奖概率" width="110"><template #default="scope">{{ probabilityLabel(scope.row.probabilityBp) }}</template></el-table-column><el-table-column label="兑换门店" min-width="160"><template #default="scope">{{ scope.row.redeemStoreName || '合作门店均可' }}</template></el-table-column><el-table-column prop="reservedCount" label="待领取预留" width="110" /><el-table-column label="状态" width="80"><template #default="scope"><el-tag :type="String(scope.row.status) === '0' ? 'success' : 'info'" effect="plain" size="small">{{ String(scope.row.status) === '0' ? '启用' : '停用' }}</el-tag></template></el-table-column><el-table-column label="操作" width="150" fixed="right"><template #default="scope"><el-button link type="primary" v-hasPermi="['business:lottery:edit']" @click="editPrize(scope.row)">编辑</el-button><el-button v-if="String(scope.row.status) === '0'" link type="danger" v-hasPermi="['business:lottery:edit']" @click="disablePrize(scope.row)">停用</el-button></template></el-table-column></el-table>
      </el-tab-pane>
      <el-tab-pane v-if="canSeeTab('points')" label="积分规则" name="points"><el-table :data="pointRules" border stripe><el-table-column prop="ruleName" label="规则" min-width="150" /><el-table-column label="来源" width="130"><template #default="scope">{{ pointSourceLabel(scope.row.sourceType) }}</template></el-table-column><el-table-column label="积分" min-width="130"><template #default="scope">{{ scope.row.ruleCode === 'order_paid' ? `每元 ${orderPointsPerYuan(scope.row.ruleJson)} 分` : `${scope.row.points} 分` }}</template></el-table-column><el-table-column label="每日上限" width="100"><template #default="scope">{{ limitLabel(scope.row.dailyLimit) }}</template></el-table-column><el-table-column label="有效期" width="100"><template #default="scope">{{ validityLabel(scope.row.validityDays) }}</template></el-table-column><el-table-column label="状态" width="90"><template #default="scope"><el-tag :type="String(scope.row.status) === '0' ? 'success' : 'info'" effect="plain">{{ String(scope.row.status) === '0' ? '启用' : '停用' }}</el-tag></template></el-table-column><el-table-column label="操作" width="100" fixed="right"><template #default="scope"><el-button link type="primary" v-hasPermi="['business:pointRule:edit']" @click="editRule(scope.row)">编辑</el-button></template></el-table-column></el-table></el-tab-pane>
      <el-tab-pane v-if="canSeeTab('promotion')" label="分销配置" name="promotion">
        <el-alert title="订单确认收货后按收佣人身份和对应层级计算佣金；角色梯度各自累计不得超过 100%。此处设置影响新生成佣金。" type="info" :closable="false" class="channel-alert" />
        <el-form label-width="140px" :model="promotion" :disabled="!canEditPromotion" class="promotion-form">
          <el-form-item label="最大分销层级" required><el-input-number v-model="promotion.maxLevel" :min="1" :max="10" @change="resizePromotionRates" /></el-form-item>
          <div class="rate-schedules">
            <section v-for="schedule in promotionSchedules" :key="schedule.key" class="rate-schedule">
              <div class="schedule-heading"><strong>{{ schedule.label }}</strong><span>累计 {{ (schedule.total / 100).toFixed(2) }}%</span></div>
              <div class="rate-grid"><div v-for="(rate, index) in promotion[schedule.key]" :key="index" class="rate-row"><span>第 {{ index + 1 }} 级</span><el-input-number v-model="promotion[schedule.key][index]" :min="0" :max="10000" :step="50" controls-position="right" /><small>万分比</small></div></div>
              <div class="schedule-foot">当前累计 {{ schedule.total.toLocaleString() }} / 10000 万分比</div>
            </section>
          </div>
          <el-form-item label="结算等待天数" required><el-input-number v-model="promotion.settlementDays" :min="0" :max="90" /></el-form-item>
          <el-form-item label="退款佣金策略" required><el-select v-model="promotion.refundPolicy" style="width:220px"><el-option label="按退款比例冲回" value="reverse" /><el-option label="退款即关闭全部佣金" value="close" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" v-hasPermi="['business:promotion:edit']" @click="savePromotion">保存分销规则</el-button></el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane v-if="canSeeTab('social')" label="VIP 社群" name="social">
        <el-alert class="channel-alert" type="info" :closable="false" title="社群活动可按配置投递到小程序订阅通知、企业微信群，或同时投递；每个通道独立记录回执、重试和结果未知状态。" />
        <el-alert class="channel-alert" type="warning" :closable="false" title="订阅通知需要会员主动授权；企业微信群需要完成 CorpID、Secret 和目标群 ID 配置。" />
        <el-form :inline="true" :model="campaignForm" @submit.prevent>
          <el-form-item label="类型" required><el-select v-model="campaignForm.campaignType" style="width:130px"><el-option label="促销活动" value="promotion" /><el-option label="优惠券提醒" value="coupon" /><el-option label="积分提醒" value="points" /></el-select></el-form-item>
          <el-form-item v-if="campaignForm.campaignType === 'coupon'" label="券模板" required><business-lookup v-model="campaignForm.couponTemplateId" owner="social" field="couponTemplateId" active-only style="min-width: 220px" /></el-form-item>
          <el-form-item label="受众" required><el-select v-model="campaignForm.audience" style="width:150px"><el-option label="VIP会员" value="vip" /><el-option label="全部正常会员" value="all" /></el-select></el-form-item>
          <el-form-item label="发送通道" required><el-select v-model="campaignForm.channels" style="width:180px"><el-option label="小程序订阅通知" value="subscribe" /><el-option label="企业微信群" value="group" /><el-option label="两者同时发送" value="both" /></el-select></el-form-item>
          <el-form-item label="活动标题" required><el-input v-model="campaignForm.title" maxlength="128" show-word-limit style="width:220px" /></el-form-item>
          <el-form-item label="活动内容" required><el-input v-model="campaignForm.content" maxlength="4000" style="width:280px" /></el-form-item>
          <el-form-item label="发送时间"><el-date-picker v-model="campaignForm.scheduledAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" clearable placeholder="立即发送" /></el-form-item>
          <el-form-item><el-button type="primary" @click="publishCampaign" v-hasPermi="['business:social:add']">保存活动</el-button></el-form-item>
        </el-form>
        <el-table :data="campaigns" border stripe>
          <el-table-column prop="title" label="标题" min-width="150" /><el-table-column label="类型" width="110"><template #default="scope">{{ campaignTypeLabel(scope.row.campaignType) }}</template></el-table-column>
          <el-table-column label="受众" width="120"><template #default="scope">{{ scope.row.audience === 'all' ? '全部正常会员' : 'VIP会员' }}</template></el-table-column>
          <el-table-column label="通道" width="150"><template #default="scope">{{ campaignChannels(scope.row.channels) }}</template></el-table-column>
          <el-table-column label="状态" width="120"><template #default="scope"><el-tag :type="campaignStatusType(scope.row.status)" effect="plain">{{ campaignStatus(scope.row.status) }}</el-tag></template></el-table-column>
          <el-table-column prop="scheduledAt" label="计划发送" min-width="160" /><el-table-column prop="sentCount" label="目标人数" width="90" />
          <el-table-column prop="deliveredCount" label="已送达" width="80" /><el-table-column prop="pendingCount" label="待发送" width="80" /><el-table-column prop="sendingCount" label="发送中" width="80" /><el-table-column prop="failedCount" label="失败/未知" width="100" />
          <el-table-column label="操作" width="190" fixed="right"><template #default="scope"><el-button v-if="scope.row.status === 'draft'" link type="primary" @click="sendCampaign(scope.row)" v-hasPermi="['business:social:send']">创建发送任务</el-button><el-button v-else link type="primary" @click="openCampaignDeliveries(scope.row)" v-hasPermi="['business:social:list']">查看投递明细</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane v-if="canSeeTab('ranking')" label="销冠排行" name="ranking"><el-form label-width="140px" :model="ranking" :disabled="!canEditRanking"><el-form-item label="统计周期" required><el-select v-model="ranking.periodType" style="width:180px"><el-option label="月榜" value="month" /><el-option label="周榜" value="week" /><el-option label="季榜" value="quarter" /></el-select></el-form-item><el-form-item label="周期开始" :required="!!ranking.endTime"><el-date-picker v-model="ranking.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" clearable /></el-form-item><el-form-item label="周期结束" :required="!!ranking.startTime"><el-date-picker v-model="ranking.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" clearable /></el-form-item><el-form-item><el-button type="primary" @click="saveRanking" v-hasPermi="['business:ranking:edit']">保存周期与奖励</el-button></el-form-item></el-form>
        <div class="ranking-finalization">
          <div class="subsection-head"><span>结算已结束周期</span></div>
          <p class="field-hint">自然周／月／季：选择该周期内任意一天；设置了自定义时间时，按已保存的完整时间段结算。只能结算已结束的周期，结算后排名及奖励固定，后续退款请另行财务核对。</p>
          <el-space wrap>
            <el-date-picker v-model="rankingPeriodDate" type="date" value-format="YYYY-MM-DD" placeholder="选择待结算周期内的日期" :disabled="!!ranking.startTime || !!ranking.endTime || rankingIssuing" />
            <el-button type="primary" v-hasPermi="['business:ranking:issue']" :loading="rankingIssuing" @click="issueRewards">结算周期奖励</el-button>
          </el-space>
          <el-table :data="rankingPeriods" border stripe class="ranking-period-table">
            <el-table-column prop="periodStart" label="统计开始（含）" min-width="175" />
            <el-table-column prop="periodEnd" label="统计结束（不含）" min-width="175" />
            <el-table-column prop="rewardCount" label="奖励人数" width="100" />
            <el-table-column prop="createBy" label="结算人" width="110" />
            <el-table-column prop="createTime" label="结算时间" min-width="175" />
          </el-table>
        </div>
        <div class="subsection-head"><span>名次奖励</span><el-button size="small" v-hasPermi="['business:ranking:edit']" @click="rankRewards.push({ rank: rankRewards.length + 1, points: 0, subsidyCent: 0 })">新增名次</el-button></div><el-table :data="rankRewards" border><el-table-column prop="rank" label="名次" width="100"><template #default="scope"><el-input-number v-model="scope.row.rank" :min="1" :max="100" :disabled="!canEditRanking" /></template></el-table-column><el-table-column prop="points" label="奖励积分"><template #default="scope"><el-input-number v-model="scope.row.points" :min="0" :disabled="!canEditRanking" /></template></el-table-column><el-table-column prop="subsidyCent" label="补贴金额（元）"><template #default="scope"><el-input :model-value="money(scope.row.subsidyCent)" :disabled="!canEditRanking" @update:model-value="scope.row.subsidyCent = parseYuanInput($event)" /></template></el-table-column><el-table-column label="操作" width="90"><template #default="scope"><el-button link type="danger" v-hasPermi="['business:ranking:edit']" @click="rankRewards.splice(scope.$index, 1)">删除</el-button></template></el-table-column></el-table><div class="subsection-head"><span>发奖记录（按周期）</span></div><el-table :data="rankingRewards" border stripe><el-table-column prop="periodStart" label="周期起日" width="120" /><el-table-column prop="rankNo" label="排名" width="80" /><el-table-column prop="nickname" label="会员" /><el-table-column prop="points" label="积分" width="90" /><el-table-column label="补贴" width="120"><template #default="scope">¥{{ money(scope.row.subsidyCent) }}</template></el-table-column><el-table-column prop="issueReference" label="发放凭证" min-width="150" show-overflow-tooltip /><el-table-column label="状态" width="100"><template #default="scope"><el-tag :type="rankingRewardStatusType(scope.row.status)" effect="plain" size="small">{{ rankingRewardStatus(scope.row.status) }}</el-tag></template></el-table-column><el-table-column label="操作" width="130"><template #default="scope"><el-button v-if="scope.row.status === 'processing'" link type="success" v-hasPermi="['business:ranking:issue']" @click="confirmRankingReward(scope.row)">确认补贴已发</el-button></template></el-table-column></el-table></el-tab-pane>
      <el-tab-pane v-if="canSeeTab('settlements')" label="佣金提现" name="settlements"><el-alert title="通过审核后请在线下完成转账，再填写凭证确认；退回时必须记录原因，系统会释放占用佣金。" type="info" :closable="false" class="channel-alert" /><el-table :data="settlements" border stripe><el-table-column prop="settlementId" label="申请号" width="100" /><el-table-column prop="memberId" label="推广员" width="100" /><el-table-column label="金额" width="120"><template #default="scope">¥{{ money(scope.row.amountCent) }}</template></el-table-column><el-table-column prop="requestId" label="请求号" min-width="160" show-overflow-tooltip /><el-table-column label="状态" width="110"><template #default="scope"><el-tag :type="settlementStatusType(scope.row.status)" effect="plain" size="small">{{ settlementStatus(scope.row.status) }}</el-tag></template></el-table-column><el-table-column prop="paymentReference" label="付款凭证" min-width="150" show-overflow-tooltip /><el-table-column prop="failureReason" label="退回原因" min-width="170" show-overflow-tooltip /><el-table-column prop="paidAt" label="付款时间" min-width="170" /><el-table-column prop="createTime" label="申请时间" min-width="170" /><el-table-column label="操作" width="220" fixed="right"><template #default="scope"><el-button v-if="scope.row.status === 'pending'" link type="primary" v-hasPermi="['business:settlement:edit']" @click="settlementAction(scope.row, 'processing')">通过审核</el-button><el-button v-if="scope.row.status === 'pending' || scope.row.status === 'processing'" link type="danger" v-hasPermi="['business:settlement:edit']" @click="settlementAction(scope.row, 'failed')">退回佣金</el-button><el-button v-if="scope.row.status === 'processing'" link type="success" v-hasPermi="['business:settlement:edit']" @click="settlementAction(scope.row, 'paid')">确认已转账</el-button></template></el-table-column></el-table></el-tab-pane>
      <el-tab-pane v-if="canSeeTab('channel')" label="微信渠道" name="channel">
        <el-alert title="当前支持视频号官方跳转、微信小店商品发布、SKU 库存对账、订单/售后摘要同步，以及订单发货、改价和售后审核。微信小店售后会单独进入退款对账台账，不会篡改本地商城订单；短视频商品挂载需在视频号助手完成平台确认，后台保存 Feed、Nonce、商品映射和核对状态。" type="info" :closable="false" class="channel-alert" />
        <section id="channel-section-social" class="channel-section">
          <div class="channel-section-heading"><div><h3>小程序订阅通知</h3><p>模板需在微信公众平台审核通过，字段名须与模板定义一致。</p></div><el-tag :type="channel['wechat.mini.socialTemplateId'] ? 'success' : 'info'" effect="plain">{{ channel['wechat.mini.socialTemplateId'] ? '已配置模板' : '待配置' }}</el-tag></div>
          <el-form label-position="top" :model="channel" :disabled="!canEditChannel" class="channel-form-grid">
            <el-form-item label="订阅消息模板"><platform-lookup v-model="channel['wechat.mini.socialTemplateId']" kind="templates" /></el-form-item>
            <el-form-item label="标题字段名"><el-input v-model="channel['wechat.mini.socialTitleField']" placeholder="例如 thing1" /></el-form-item>
            <el-form-item label="内容字段名"><el-input v-model="channel['wechat.mini.socialContentField']" placeholder="例如 thing2" /></el-form-item>
          </el-form>
        </section>
        <section class="channel-section">
          <div class="channel-section-heading"><div><h3>在线客服二维码</h3><p>小程序在线客服按钮和客服二维码同时展示；点击上传客服二维码，保存后在小程序展示。</p></div><el-tag :type="channel['wechat.customer.serviceQr'] ? 'success' : 'info'" effect="plain">{{ channel['wechat.customer.serviceQr'] ? '已配置' : '待配置' }}</el-tag></div>
          <el-form label-position="top" :model="channel" :disabled="!canEditChannel" class="channel-form-grid">
            <el-form-item label="客服二维码图片"><business-image-upload v-model="channel['wechat.customer.serviceQr']" :disabled="saving" /></el-form-item>
          </el-form>
        </section>
        <section id="channel-section-video" class="channel-section">
        <div class="channel-section-heading"><div><h3>视频号与微信小店</h3><p>主页、直播和短视频使用微信官方跳转；SKU 库存自动对账，订单与售后摘要增量同步，订单发货和售后审核提交至微信平台。</p></div><el-tag type="info" effect="plain">库存 · 订单 · 售后</el-tag></div>
          <el-form label-position="top" :model="channel" :disabled="!canEditChannel" class="channel-form-grid">
            <el-form-item label="启用微信小店数据同步"><el-switch v-model="channel['wechat.video.syncEnabled']" active-value="true" inactive-value="false" /><span class="field-hint">开启后，待同步 SKU 每分钟处理，订单每 5 分钟增量导入。</span></el-form-item>
            <el-form-item label="Finder 用户名"><el-input v-model="channel['wechat.video.finderUserName']" placeholder="视频号助手中的 sph 开头 ID" /></el-form-item>
            <el-form-item label="微信小店 ID"><platform-lookup v-model="channel['wechat.video.shopId']" kind="shop" /></el-form-item>
            <el-form-item label="售后退货地址"><platform-lookup v-model="channel['wechat.video.returnAddressId']" kind="addresses" /></el-form-item>
            <el-form-item label="直播 Feed ID"><el-input v-model="channel['wechat.video.liveFeedId']" /></el-form-item>
            <el-form-item label="直播 Nonce ID"><el-input v-model="channel['wechat.video.liveNonceId']" /></el-form-item>
            <el-form-item label="短视频 Feed ID"><el-input v-model="channel['wechat.video.feedId']" /></el-form-item>
            <el-form-item label="短视频 Nonce ID"><el-input v-model="channel['wechat.video.nonceId']" /></el-form-item>
          </el-form>
          <div class="channel-actions"><el-button type="primary" :loading="saving" v-hasPermi="['business:channel:edit']" @click="saveChannel">保存渠道配置</el-button><el-button :loading="videoChecking" v-hasPermi="['business:channel:query']" @click="checkVideoShopAction">校验微信小店授权</el-button><el-tag v-if="videoShopCheck" type="success" effect="plain">{{ videoShopCheck.shopName || '授权有效' }} · {{ videoShopCheck.shopId }}</el-tag></div>
        </section>
        <section id="channel-section-work" class="channel-section group-qr-section">
          <div class="channel-section-heading"><div><h3>企业微信群二维码</h3><p>选择 1 至 5 个已创建的客户群，生成后可扫码核对并供小程序展示。</p></div><el-tag :type="channel['wechat.work.groupQr'] ? 'success' : 'info'" effect="plain">{{ channel['wechat.work.groupQr'] ? '二维码已生成' : '尚未生成' }}</el-tag></div>
          <div class="group-qr-layout">
            <el-form label-position="top" :model="channel" :disabled="!canEditChannel" class="group-qr-form">
              <el-form-item label="目标客户群"><platform-lookup v-model="channel['wechat.work.groupChatIds']" kind="groups" multiple /></el-form-item>
              <el-form-item label="有效期至"><el-input :model-value="channel['wechat.work.groupQrExpiresAt'] || '未生成'" readonly /></el-form-item>
              <el-form-item label="旧二维码状态"><el-input :model-value="channel['wechat.work.groupQrRevocationStatus'] || '暂无轮换记录'" readonly /></el-form-item>
              <div class="channel-actions"><el-button type="primary" v-hasPermi="['business:channel:edit']" :loading="saving" @click="makeGroupQr">生成 / 轮换二维码</el-button></div>
              <div v-if="pendingGroupQrIds.length" class="group-qr-pending">
                <el-alert title="旧码撤销待确认，请先在企业微信管理端核验" type="warning" :closable="false" />
                <div v-for="id in pendingGroupQrIds" :key="id" class="group-qr-pending-row"><el-tag type="warning" effect="plain" :title="id">{{ id }}</el-tag><el-button v-hasPermi="['business:channel:edit']" link type="primary" :loading="reconcileLoading === id" @click="reconcileGroupQrAction(id)">登记已撤销</el-button></div>
              </div>
            </el-form>
            <div class="group-qr-preview">
              <el-image v-if="channel['wechat.work.groupQr']" :src="channel['wechat.work.groupQr']" :preview-src-list="[channel['wechat.work.groupQr']]" fit="contain" class="group-qr-image" />
              <el-empty v-else description="生成后显示二维码预览" :image-size="72" />
              <span v-if="channel['wechat.work.groupQr']" class="group-qr-caption">扫码预览企业微信群入口</span>
            </div>
          </div>
        </section>
      </el-tab-pane>
      <el-tab-pane v-if="canSeeTab('videoStock')" label="微信小店库存映射" name="videoStock">
        <div class="channel-section-heading"><div><h3>商品发布与平台状态</h3><p>微信商品主图、详情图必须是微信小店素材 ID；商品类目、运费模板、SKU 属性及酒类经营资质需按微信小店类目要求填写。资料提交与申请上架是两个独立步骤。</p></div><div class="publish-status"><el-tag :type="videoPublishTagType" effect="plain">{{ videoPublishStatusLabel }}</el-tag><el-tag v-if="videoMapping.externalStatus" type="info" effect="plain">平台：{{ videoMapping.externalStatus }}</el-tag></div></div>
        <el-alert v-if="videoMapping.publishError" type="warning" :closable="false" :title="videoMapping.publishError" class="inventory-alert" />
        <el-form :inline="true" @submit.prevent class="inventory-toolbar">
          <el-form-item label="发布资料"><el-button v-hasPermi="['business:product:edit']" :disabled="!skuProductId" @click="openVideoPublishEditor">配置微信小店资料</el-button></el-form-item>
          <el-form-item><el-button v-hasPermi="['business:channel:edit']" type="primary" :loading="videoPublishing" :disabled="!skuProductId || !videoMapping.publishPayloadJson" @click="submitVideoPublish">{{ videoExternalProductId ? '提交资料更新' : '提交商品资料' }}</el-button><el-button v-hasPermi="['business:channel:query']" :disabled="!videoExternalProductId" :loading="videoRefreshing" @click="refreshVideoProduct">刷新平台状态</el-button><el-button v-hasPermi="['business:channel:edit']" type="success" :disabled="!videoExternalProductId || videoMapping.publishStatus !== 'submitted'" :loading="videoListing" @click="requestVideoListing">申请上架</el-button></el-form-item>
        </el-form>
        <el-descriptions v-if="skuProductId" :column="3" border size="small" class="publish-summary"><el-descriptions-item label="本地商品">{{ selectedProductName || '-' }}</el-descriptions-item><el-descriptions-item label="微信小店商品">{{ videoExternalProductId || '未创建' }}</el-descriptions-item><el-descriptions-item label="最近提交">{{ videoMapping.publishedAt || '暂无' }}</el-descriptions-item></el-descriptions>
        <el-dialog v-model="videoPublishDialog" title="微信小店商品发布资料" width="min(920px, 94vw)" destroy-on-close>
          <div class="publish-editor-help"><strong>资料要求</strong><span>请使用微信小店素材 ID，不要填本地图片 URL。`head_imgs`、`desc_info.imgs`、`cats_v2`、`express_info.template_id`、`skus` 必填；酒类类目可能要求额外资质字段，按平台审核结果补充。</span></div>
          <el-form label-position="top"><el-form-item label="微信小店商品（新建时留空）"><platform-lookup v-model="videoExternalProductId" kind="products" @change="clearExternalSkuSelections" /></el-form-item><el-form-item label="官方商品发布 JSON"><el-input v-model="videoPublishPayload" type="textarea" :rows="22" resize="vertical" placeholder="先生成本地商品模板，再补齐微信类目、素材、运费模板、SKU 属性和资质字段" /></el-form-item></el-form>
          <template #footer><div class="publish-dialog-actions"><el-button @click="generateVideoPublishTemplate">从本地商品生成模板</el-button><span /><el-button @click="videoPublishDialog = false">取消</el-button><el-button type="primary" v-hasPermi="['business:product:edit']" :loading="videoMappingSaving" @click="saveVideoPublishMapping">保存资料</el-button></div></template>
        </el-dialog>
        <div class="channel-section-heading"><div><h3>库存对账</h3><p>本地库存为主数据。待同步 SKU 每分钟自动处理，失败后 5 分钟重试；立即对账会读取微信库存、按差值更新并回读验证。</p></div><el-tag type="success" effect="plain">自动重试 · 可手动对账</el-tag></div>
        <el-form :inline="true" @submit.prevent class="inventory-toolbar">
          <el-form-item label="本地商品" required><business-lookup v-model="skuProductId" owner="product" field="productId" style="width:300px" @change="loadSkus" @selected="rememberProduct" /></el-form-item>
          <el-form-item><el-button icon="List" :disabled="!skuProductId" @click="router.push({ path: '/business/sku', query: { productId: skuProductId } })">管理商品规格</el-button></el-form-item>
          <el-form-item label="微信小店商品"><platform-lookup v-model="videoExternalProductId" kind="products" @change="clearExternalSkuSelections" /></el-form-item>
          <el-form-item><el-button v-hasPermi="['business:product:edit']" @click="saveVideoMapping">保存商品映射</el-button><el-button v-hasPermi="['business:product:edit']" type="primary" :loading="skuMappingSaving" :disabled="!skuProductId || !skuRows.length" @click="saveVideoSkuMappings">保存 SKU 映射</el-button><el-button v-hasPermi="['business:channel:edit']" type="success" :loading="videoSyncing" :disabled="!videoExternalProductId" @click="syncVideoStock">同步库存</el-button></el-form-item>
        </el-form>
        <el-alert v-if="videoSyncResult" :type="videoSyncResult.failed ? 'warning' : 'success'" :closable="false" :title="videoSyncResult.message" class="inventory-alert" />
        <el-table :data="skuRows" border stripe>
          <el-table-column prop="skuCode" label="本地规格编码" min-width="150" />
          <el-table-column prop="skuName" label="规格名称" min-width="150" />
          <el-table-column label="规格售价" width="110"><template #default="scope">¥{{ (Number(scope.row.priceCent || 0) / 100).toFixed(2) }}</template></el-table-column>
          <el-table-column prop="stock" label="本地库存" width="110" />
          <el-table-column label="微信小店规格" min-width="190"><template #default="scope"><platform-lookup v-model="scope.row.externalSkuId" kind="skus" :product-id="videoExternalProductId" /></template></el-table-column>
          <el-table-column label="同步状态" width="120"><template #default="scope"><el-tag :type="scope.row.videoSyncStatus === 'success' ? 'success' : scope.row.videoSyncStatus === 'failed' ? 'danger' : 'info'" effect="plain">{{ scope.row.videoSyncStatus === 'success' ? '已校验' : scope.row.videoSyncStatus === 'failed' ? '失败' : '未同步' }}</el-tag></template></el-table-column>
          <el-table-column label="错误详情" prop="videoLastError" min-width="240" show-overflow-tooltip />
          <el-table-column label="上次成功时间" prop="videoSyncedAt" min-width="170" />
        </el-table>
        <div class="channel-section-heading mount-heading"><div><h3>短视频商品挂载</h3><p>保存短视频 Feed、Nonce 与微信小店商品映射后生成挂载清单；视频号助手完成商品挂载后，必须回到此处确认平台结果，系统才会标记已核验。</p></div><el-tag type="warning" effect="plain">需平台确认</el-tag></div>
        <el-form :inline="true" @submit.prevent class="inventory-toolbar mount-toolbar"><el-form-item label="短视频 Feed ID" required><el-input v-model="mountForm.feedId" placeholder="与小程序短视频入口一致" style="width:220px" /></el-form-item><el-form-item label="Nonce ID" required><el-input v-model="mountForm.nonceId" placeholder="微信官方 Nonce" style="width:220px" /></el-form-item><el-form-item label="微信商品"><platform-lookup v-model="mountForm.externalProductId" kind="products" /></el-form-item><el-form-item><el-button v-hasPermi="['business:channel:edit']" type="primary" @click="saveMount">保存挂载配置</el-button></el-form-item></el-form>
        <el-table :data="videoMounts" border stripe v-loading="videoMountsLoading"><el-table-column prop="mountTitle" label="商品" min-width="170" /><el-table-column prop="feedId" label="Feed ID" min-width="150" show-overflow-tooltip /><el-table-column prop="nonceId" label="Nonce ID" min-width="150" show-overflow-tooltip /><el-table-column label="状态" width="120"><template #default="scope"><el-tag :type="mountStatusType(scope.row.status)" effect="plain">{{ mountStatusLabel(scope.row.status) }}</el-tag></template></el-table-column><el-table-column prop="lastError" label="平台反馈" min-width="220" show-overflow-tooltip /><el-table-column label="操作" width="220" fixed="right"><template #default="scope"><el-button v-if="['draft','failed'].includes(scope.row.status)" link type="primary" v-hasPermi="['business:channel:edit']" @click="submitMount(scope.row)">生成挂载清单</el-button><el-button v-if="scope.row.status === 'submitting'" link type="success" v-hasPermi="['business:channel:edit']" @click="verifyMount(scope.row, 'verified')">确认已挂载</el-button><el-button v-if="scope.row.status === 'submitting'" link type="danger" v-hasPermi="['business:channel:edit']" @click="verifyMount(scope.row, 'failed')">记录失败</el-button></template></el-table-column></el-table>
      </el-tab-pane>
      <el-tab-pane v-if="canSeeTab('videoOrders')" label="微信小店订单" name="videoOrders">
        <div class="channel-section-heading"><div><h3>微信小店订单 <small class="sync-summary">共 {{ videoOrdersTotal }} 笔</small></h3><p>订单摘要每 5 分钟增量导入；发货操作只向微信提交快递公司、运单号和商品行，不读取或保存买家收货资料，也不进入本地商城账本。</p></div><el-button type="primary" :loading="videoOrdersSyncing" v-hasPermi="['business:channel:edit']" @click="syncVideoOrderPage">同步下一页</el-button></div>
        <el-table :data="videoOrders" border stripe v-loading="videoOrdersLoading">
          <el-table-column prop="externalOrderId" label="微信小店订单号" min-width="190" />
          <el-table-column label="平台状态" width="120"><template #default="scope"><el-tag :type="videoOrderStatusType(scope.row.externalStatus)" effect="plain">{{ videoOrderStatus(scope.row.externalStatus) }}</el-tag></template></el-table-column>
          <el-table-column prop="createdAt" label="下单时间" min-width="170" />
          <el-table-column label="订单金额" width="120"><template #default="scope">¥{{ money(scope.row.orderPriceCent) }}</template></el-table-column>
          <el-table-column label="运费" width="100"><template #default="scope">¥{{ money(scope.row.freightCent) }}</template></el-table-column>
          <el-table-column label="商家实收" width="120"><template #default="scope">¥{{ money(scope.row.merchantReceiveCent) }}</template></el-table-column>
          <el-table-column label="商品明细" min-width="260" show-overflow-tooltip><template #default="scope">{{ videoOrderItems(scope.row) }}</template></el-table-column>
          <el-table-column label="发货状态" min-width="150"><template #default="scope"><el-tag :type="fulfillmentStatusType(scope.row.fulfillmentStatus)" effect="plain">{{ fulfillmentStatus(scope.row.fulfillmentStatus) }}</el-tag><span v-if="scope.row.fulfillmentError" class="fulfillment-error" :title="scope.row.fulfillmentError">{{ scope.row.fulfillmentError }}</span></template></el-table-column>
          <el-table-column label="操作" width="160" fixed="right"><template #default="scope"><el-button v-if="Number(scope.row.externalStatus) === 10" link type="primary" v-hasPermi="['business:channel:edit']" @click="openPriceDialog(scope.row)">改价</el-button><el-button v-if="Number(scope.row.externalStatus) === 20 && !['submitted', 'submitting', 'verified'].includes(scope.row.fulfillmentStatus)" link type="primary" v-hasPermi="['business:channel:edit']" @click="openShipDialog(scope.row)">{{ scope.row.fulfillmentStatus === 'unknown' ? '核对并重试' : '登记发货' }}</el-button></template></el-table-column>
          <el-table-column prop="aftersaleCount" label="售后单数" width="100" />
          <el-table-column prop="lastSyncedAt" label="最近同步" min-width="170" />
        </el-table>
      </el-tab-pane>
      <el-tab-pane v-if="canSeeTab('videoAftersales')" label="微信小店售后" name="videoAftersales">
        <div class="channel-section-heading"><div><h3>微信小店售后单 <small class="sync-summary">共 {{ videoAftersalesTotal }} 笔</small></h3><p>每 5 分钟按更新时间增量同步。同意/拒绝操作提交微信官方接口，由平台校验当前状态；本地仅保存必要的售后摘要。</p></div><el-button type="primary" :loading="videoAftersalesSyncing" v-hasPermi="['business:channel:edit']" @click="syncVideoAftersalePage">同步下一页</el-button></div>
        <el-table :data="videoAftersales" border stripe v-loading="videoAftersalesLoading">
          <el-table-column prop="externalAftersaleId" label="微信售后单号" min-width="190" />
          <el-table-column prop="externalOrderId" label="微信订单号" min-width="190" />
          <el-table-column label="售后状态" min-width="190"><template #default="scope"><el-tag :type="aftersaleStatusType(scope.row.externalStatus)" effect="plain">{{ aftersaleStatus(scope.row.externalStatus) }}</el-tag></template></el-table-column>
          <el-table-column label="类型" width="120"><template #default="scope">{{ aftersaleType(scope.row.aftersaleType) }}</template></el-table-column>
          <el-table-column label="退款金额" width="120"><template #default="scope">¥{{ money(scope.row.refundAmountCent) }}</template></el-table-column>
          <el-table-column prop="updatedAt" label="平台更新时间" min-width="170" />
          <el-table-column prop="lastSyncedAt" label="最近同步" min-width="170" />
          <el-table-column label="退款对账" width="140"><template #default="scope"><el-tag :type="scope.row.refundLedgerStatus === 'confirmed' ? 'success' : scope.row.refundLedgerStatus === 'failed' ? 'danger' : 'warning'" effect="plain">{{ scope.row.refundLedgerStatus === 'confirmed' ? '已确认' : scope.row.refundLedgerStatus === 'failed' ? '失败' : '待确认' }}</el-tag><span v-if="scope.row.refundConfirmedAt" class="fulfillment-error">{{ scope.row.refundConfirmedAt }}</span></template></el-table-column>
          <el-table-column label="操作" width="150" fixed="right"><template #default="scope"><el-button link type="primary" v-hasPermi="['business:channel:edit']" @click="acceptAftersale(scope.row)">同意申请</el-button><el-button link type="danger" v-hasPermi="['business:channel:edit']" @click="openRejectAftersale(scope.row)">拒绝</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    <el-dialog v-model="ruleDialog" title="编辑积分规则" width="min(520px, 94vw)">
      <el-form :model="ruleForm" label-width="110px">
        <el-form-item label="规则名称" required><el-input v-model="ruleForm.ruleName" maxlength="128" show-word-limit /></el-form-item>
        <el-form-item v-if="ruleForm.ruleCode === 'order_paid'" label="每消费1元" required><el-input-number v-model="ruleForm.orderPointsPerYuan" :min="0" :max="1000" :step="1" /><span class="inline-help">获得积分，不足1元不计</span></el-form-item>
        <el-form-item v-else label="积分" required><el-input-number v-model="ruleForm.points" :min="0" /></el-form-item>
        <el-form-item :label="ruleForm.ruleCode === 'order_paid' ? '每日奖励单数' : ruleForm.ruleCode === 'invite_register' ? '每日奖励次数' : '每日上限'" required><el-input-number v-model="ruleForm.dailyLimit" :min="-1" /><span v-if="['order_paid', 'invite_register'].includes(ruleForm.ruleCode)" class="inline-help">-1 不限，0 暂停奖励</span></el-form-item>
        <el-form-item label="有效天数" required><el-input-number v-model="ruleForm.validityDays" :min="0" /></el-form-item>
        <el-form-item label="规则状态" required><el-radio-group v-model="ruleForm.status"><el-radio value="0">启用</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item>
        <el-form-item label="扩展参数"><el-input v-model="ruleForm.ruleJson" type="textarea" :rows="4" maxlength="4000" show-word-limit :placeholder="ruleForm.ruleCode === 'order_paid' ? '其他 JSON 参数，消费倍率由上方数字控制' : 'JSON 扩展参数'" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="ruleDialog = false">取消</el-button><el-button type="primary" v-hasPermi="['business:pointRule:edit']" @click="saveRule">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="activityDialog" title="编辑抽奖活动" width="min(620px, 94vw)">
      <el-form :model="activityForm" label-width="120px">
        <el-form-item label="活动编码"><el-input v-model="activityForm.activityCode" readonly /></el-form-item>
        <el-form-item label="活动名称" required><el-input v-model="activityForm.activityName" maxlength="128" show-word-limit /></el-form-item>
        <el-row :gutter="12"><el-col :xs="24" :sm="12"><el-form-item label="开始时间"><el-date-picker v-model="activityForm.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" /></el-form-item></el-col><el-col :xs="24" :sm="12"><el-form-item label="结束时间"><el-date-picker v-model="activityForm.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" /></el-form-item></el-col></el-row>
        <el-row :gutter="12"><el-col :xs="24" :sm="12"><el-form-item label="每日次数" required><el-input-number v-model="activityForm.dailyLimit" :min="0" :max="1000000" /></el-form-item></el-col><el-col :xs="24" :sm="12"><el-form-item label="总次数" required><el-input-number v-model="activityForm.totalLimit" :min="-1" :max="100000000" /></el-form-item></el-col></el-row>
        <el-row :gutter="12"><el-col :xs="24" :sm="12"><el-form-item label="二维码复用"><el-switch v-model="activityForm.codeReusable" active-text="允许重复扫码" /></el-form-item></el-col><el-col :xs="24" :sm="12"><el-form-item label="奖品有效期" required><el-input-number v-model="activityForm.rewardValidityDays" :min="0" :max="3650" /><span class="inline-help">0 表示不限制</span></el-form-item></el-col></el-row>
        <el-form-item label="活动状态" required><el-radio-group v-model="activityForm.status"><el-radio value="0">启用</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item>
        <el-form-item label="扩展规则 JSON"><el-input v-model="activityForm.ruleJson" type="textarea" :rows="3" maxlength="4000" show-word-limit placeholder='高级参数示例：{"codeReusable":false,"rewardValidityDays":30}' /></el-form-item>
        <el-alert title="关键规则已提供可视化控件；活动码默认一次使用，奖品有效期只影响新发放的现金和实物奖。" type="info" :closable="false" />
      </el-form>
      <template #footer><el-button @click="activityDialog = false">取消</el-button><el-button type="primary" v-hasPermi="['business:lottery:edit']" @click="saveActivity">保存活动</el-button></template>
    </el-dialog>
    <el-dialog v-model="prizeDialog" :title="prizeForm.prizeId ? '编辑抽奖奖项' : '新增抽奖奖项'" width="min(520px, 94vw)">
      <el-form :model="prizeForm" label-width="120px">
        <el-form-item label="奖项名称" required><el-input v-model="prizeForm.prizeName" maxlength="128" show-word-limit /></el-form-item>
        <el-form-item label="奖项类型" required><el-select v-model="prizeForm.prizeType"><el-option label="现金红包" value="cash" /><el-option label="实物" value="goods" /><el-option label="积分" value="points" /><el-option label="优惠券" value="coupon" /><el-option label="谢谢参与" value="none" /></el-select></el-form-item>
        <el-form-item label="中奖概率(万分比)" required><el-input-number v-model="prizeForm.probabilityBp" :min="0" :max="10000" /></el-form-item>
        <template v-if="prizeForm.prizeType === 'cash'">
          <el-form-item label="固定红包档位"><div class="cash-rule-editor"><div v-for="(rule, index) in prizeForm.cashAmountRules" :key="index" class="cash-rule-row"><el-input-number v-model="rule.amountCent" :min="1" :step="1" controls-position="right" /><span>分 ×</span><el-input-number v-model="rule.count" :min="1" :step="1" controls-position="right" /><span>个</span><el-button link type="danger" @click="prizeForm.cashAmountRules.splice(index, 1)">删除</el-button></div><el-button plain type="primary" @click="prizeForm.cashAmountRules.push({ amountCent: 1, count: 1 })">新增固定档位</el-button><div class="form-tip">按档位数量在生成二维码时锁定金额，例如 100 分 × 2、1 分 × 3；未设置档位时统一按 1 分（0.01 元）发放。</div></div></el-form-item>
        </template>
        <el-form-item v-if="prizeForm.prizeType === 'coupon'" label="优惠券模板" required><business-lookup v-model="prizeForm.couponTemplateId" owner="lottery" field="couponTemplateId" active-only style="min-width: 220px" /></el-form-item>
        <el-form-item v-if="prizeForm.prizeType === 'points'" label="积分" required><el-input-number v-model="prizeForm.points" :min="1" /></el-form-item>
        <el-form-item v-if="prizeForm.prizeType === 'goods'" label="奖品图片"><business-image-upload v-model="prizeForm.imageUrl" :disabled="saving" :active="prizeDialog" :context-key="prizeForm.prizeId" /></el-form-item>
        <el-form-item v-if="prizeForm.prizeType === 'goods'" label="指定兑换门店"><business-lookup v-model="prizeForm.redeemStoreId" owner="lottery" field="redeemStoreId" active-only style="min-width: 220px" /></el-form-item>
        <el-alert v-if="prizeForm.prizeType === 'goods'" title="可指定一家启用门店；留空表示所有合作门店均可核销。" type="info" :closable="false" />
        <el-alert v-if="prizeForm.prizeType === 'cash'" title="现金金额使用整数分，最低 1 分（0.01 元）；固定档位会在生成二维码时按数量锁定。真实到账以微信商户转账回执为准。" type="info" :closable="false" />
        <el-alert v-else-if="prizeForm.prizeType === 'coupon'" title="优惠券奖项必须绑定有效模板，中奖后按服务端券模板规则发放。" type="info" :closable="false" />
      </el-form>
      <template #footer><el-button @click="prizeDialog = false">取消</el-button><el-button type="primary" v-hasPermi="['business:lottery:edit']" @click="savePrize">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="shipDialog" title="微信小店订单发货" width="520px"><el-form :model="shipForm" label-width="118px"><el-form-item label="订单号"><el-input :model-value="shipForm.orderId" readonly /></el-form-item><el-form-item label="商品"><span>{{ shipForm.itemSummary }}</span></el-form-item><el-form-item label="快递公司" required><platform-lookup v-model="shipForm.deliveryId" kind="delivery" /></el-form-item><el-form-item label="物流单号" required><el-input v-model="shipForm.waybillId" maxlength="128" /></el-form-item></el-form><el-alert title="仅在微信小店返回接受后标记为已提交；网络结果不确定时会锁住重复提交，并等待平台状态同步。" type="warning" :closable="false" /><template #footer><el-button @click="shipDialog = false">取消</el-button><el-button type="primary" :loading="shippingOrder" v-hasPermi="['business:channel:edit']" @click="submitVideoShipment">提交发货</el-button></template></el-dialog>
    <el-dialog v-model="priceDialog" title="修改微信小店订单价格" width="620px"><el-form :model="priceForm" label-width="110px"><el-form-item label="订单号"><el-input :model-value="priceForm.orderId" readonly /></el-form-item><el-form-item label="商品行"><div class="price-change-list"><div v-for="item in priceForm.items" :key="`${item.productId}:${item.skuId}`" class="price-change-row"><span>{{ item.title || item.skuCode || item.productId }} × {{ item.quantity }}</span><el-input-number v-model="item.changePriceCent" :min="0" :max="2147483647" :step="1" controls-position="right" /><small>分 / 件</small></div></div></el-form-item><el-form-item label="同时修改运费"><el-switch v-model="priceForm.changeExpress" /></el-form-item><el-form-item v-if="priceForm.changeExpress" label="新运费（分）"><el-input-number v-model="priceForm.expressFeeCent" :min="0" :max="2147483647" /></el-form-item></el-form><el-alert title="改价仅对待付款订单生效，商品金额和运费均按分提交微信小店，执行前请与顾客确认。" type="warning" :closable="false" /><template #footer><el-button @click="priceDialog = false">取消</el-button><el-button type="primary" :loading="changingPrice" v-hasPermi="['business:channel:edit']" @click="submitVideoPriceChange">提交改价</el-button></template></el-dialog>
    <el-dialog v-model="rejectAftersaleDialog" title="拒绝微信小店售后" width="520px"><el-form :model="rejectAftersaleForm" label-width="110px"><el-form-item label="售后单号"><el-input :model-value="rejectAftersaleForm.aftersaleId" readonly /></el-form-item><el-form-item label="官方拒绝原因" required><el-select v-model="rejectAftersaleForm.reasonType" filterable placeholder="请选择微信提供的原因"><el-option v-for="item in aftersaleRejectReasons" :key="item.reject_reason_type" :label="item.reject_reason_type_text" :value="item.reject_reason_type" /></el-select></el-form-item><el-form-item label="原因说明"><el-input v-model="rejectAftersaleForm.reason" type="textarea" :rows="3" maxlength="300" show-word-limit /></el-form-item></el-form><template #footer><el-button @click="rejectAftersaleDialog = false">取消</el-button><el-button type="danger" :loading="rejectingAftersale" v-hasPermi="['business:channel:edit']" @click="submitRejectAftersale">提交拒绝</el-button></template></el-dialog>
    <el-drawer v-model="deliveryDrawer" title="社群投递明细" size="min(760px, 94vw)" destroy-on-close>
      <div class="delivery-drawer-heading"><div><strong>{{ deliveryCampaign?.title || '社群活动' }}</strong><p>展示每个订阅会员和企业微信群的投递状态、重试次数及平台反馈。</p></div><el-tag v-if="deliveryCampaign" :type="campaignStatusType(deliveryCampaign.status)" effect="plain">{{ campaignStatus(deliveryCampaign.status) }}</el-tag></div>
      <el-table :data="socialDeliveries" border stripe v-loading="deliveryLoading" empty-text="暂无投递记录">
        <el-table-column label="通道" width="130"><template #default="scope">{{ scope.row.channel === 'group' ? '企业微信群' : '小程序订阅通知' }}</template></el-table-column>
        <el-table-column label="目标" min-width="180"><template #default="scope">{{ scope.row.channel === 'group' ? scope.row.target : `${scope.row.target || '会员'}（ID ${scope.row.memberId || '—'}）` }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="scope"><el-tag :type="deliveryStatusType(scope.row.status)" effect="plain" size="small">{{ deliveryStatusLabel(scope.row.status) }}</el-tag></template></el-table-column>
        <el-table-column prop="attemptCount" label="尝试次数" width="90" />
        <el-table-column prop="errorMessage" label="平台反馈" min-width="230" show-overflow-tooltip />
        <el-table-column prop="sentAt" label="送达时间" min-width="170" />
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { checkPermi } from '@/utils/permission'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { saveAs } from 'file-saver'
import { buildLotteryCodeExcel } from '@/utils/lotteryCodeExcel'
import { listLotteryCodeBatches, getLotteryCodeBatch } from '@/api/business/extension'
import { saveProductSkuMappings } from '@/api/business/extension'
import { getDashboard, listLotteryActivities, updateLotteryActivity, listLotteryPrizes, generateLotteryCodes, createLotteryPrize, updateLotteryPrize, disableLotteryPrize, getProductSkus, getVideoProductMapping, saveVideoProductMapping, getVideoProductTemplate, submitVideoProduct, requestVideoProductListing, refreshVideoProduct as refreshVideoProductApi, syncVideoProductStock, getVideoFeedMounts, saveVideoFeedMount, submitVideoFeedMount, verifyVideoFeedMount, getVideoOrders, syncVideoOrders, shipVideoOrder, changeVideoOrderPrice, getVideoAftersales, syncVideoAftersales, getVideoAftersaleRejectReasons, acceptVideoAftersale, rejectVideoAftersale, getPointRules, updatePointRule, getPromotionConfig, updatePromotionConfig, listPromotionSettlements, updatePromotionSettlement, getRankingConfig, updateRankingConfig, listRankingRewards, issueRankingReward, issueRanking, listSocialCampaigns, listSocialDeliveries, createSocialCampaign, sendSocialCampaign, getChannelConfig, updateChannelConfig, getReadiness, checkVideoShop, createGroupQr } from '@/api/business/extension'
import { listBusiness } from '@/api/business'
import BusinessLookup from '../components/BusinessLookup.vue'
import PlatformLookup from '../components/PlatformLookup.vue'
import BusinessImageUpload from '../components/BusinessImageUpload.vue'
import { pendingImageUploads } from '@/utils/businessMedia'
import { listRankingPeriods } from '@/api/business/extension'
import { reconcileGroupQr } from '@/api/business/extension'
import { verifyReadiness } from '@/api/business/extension'
const rankingPeriodDate = ref(''), rankingIssuing = ref(false), rankingPeriods = ref([])
const router = useRouter()
// 上线检查仅在本地开发工作台展示，线上运营页面隐藏部署信息。
const showReadinessPanel = import.meta.env.DEV

const active = ref(''); const saving = ref(false); const exportingCodes = ref(false); const exportingBatchId = ref(''); const lotteryLoading = ref(false); const prizeLoading = ref(false); const activities = ref([]); const prizes = ref([]); const codes = ref([]); const pointRules = ref([]); const campaigns = ref([]); const couponTemplateOptions = ref([]); const storeOptions = ref([]); const settlements = ref([]); const rankingRewards = ref([]); const rankRewards = ref([]); const productOptions = ref([]); const skuRows = ref([]); const skuProductId = ref(null); const dashboard = reactive({}); const trend = ref([]); const promotion = reactive({}); const ranking = reactive({}); const channel = reactive({}); const readiness = reactive({ checks: [], readyCount: 0, verificationCount: 0, pendingCount: 0, productionReady: false }); const readinessLoading = ref(false); const campaignForm = reactive({ campaignType: 'promotion', audience: 'vip', channels: 'subscribe', title: '', content: '', scheduledAt: '', couponTemplateId: null }); const ruleDialog = ref(false); const ruleForm = reactive({}); const activityDialog = ref(false); const activityForm = reactive({ activityCode: '', activityName: '', startTime: '', endTime: '', dailyLimit: 1, totalLimit: -1, status: '0', codeReusable: false, rewardValidityDays: 0, ruleJson: '{}' }); const prizeDialog = ref(false); const prizeForm = reactive({ prizeType: 'goods', probabilityBp: 0, amountMinCent: 1, amountMaxCent: 1, cashAmountRules: [], stock: -1, points: 0, redeemStoreId: null })
const lotteryForm = reactive({ activityCode: '', count: 100 });
const codeBatches = ref([]), selectedBatchId = ref(''), batchLoading = ref(false)
const codeBatchPage = ref(1), codeBatchPageSize = 20, codeBatchTotal = ref(0)
const selectedBatchSummary = computed(() => codeBatches.value.find(batch => batch.batchId === selectedBatchId.value))
let pendingGeneration = null
const videoChecking = ref(false); const videoShopCheck = ref(null)
const verifyingKey = ref('')
const reconcileLoading = ref('')
const pendingGroupQrIds = computed(() => {
  const stored = String(channel['wechat.work.groupQrPreviousConfigId'] || '').trim()
  if (!stored) return []
  if (!stored.startsWith('[')) return [stored]
  try { return JSON.parse(stored).filter(id => typeof id === 'string' && id) } catch { return [] }
})
const videoExternalProductId = ref(''); const videoSyncing = ref(false); const videoSyncResult = ref(null)
const skuMappingBaseline = ref({}); const skuMappingSaving = ref(false)
const videoMapping = reactive({ publishStatus: 'draft', publishError: '', externalStatus: '', publishPayloadJson: '', publishedAt: '' }); const videoPublishDialog = ref(false); const videoPublishPayload = ref(''); const videoMappingSaving = ref(false); const videoPublishing = ref(false); const videoListing = ref(false); const videoRefreshing = ref(false)
const videoOrders = ref([]); const videoOrdersLoading = ref(false); const videoOrdersSyncing = ref(false); const videoOrdersTotal = ref(0)
const videoAftersales = ref([]); const videoAftersalesLoading = ref(false); const videoAftersalesSyncing = ref(false); const videoAftersalesTotal = ref(0); const aftersaleRejectReasons = ref([])
const videoMounts = ref([]); const videoMountsLoading = ref(false); const mountForm = reactive({ productId: null, externalProductId: '', feedId: '', nonceId: '', mountTitle: '' })
const shipDialog = ref(false); const shippingOrder = ref(false); const shipForm = reactive({ orderId: '', itemSummary: '', deliveryId: '', waybillId: '' })
const priceDialog = ref(false); const changingPrice = ref(false); const priceForm = reactive({ orderId: '', items: [], changeExpress: false, expressFeeCent: 0 })
const rejectAftersaleDialog = ref(false); const rejectingAftersale = ref(false); const rejectAftersaleForm = reactive({ aftersaleId: '', reasonType: 0, reason: '' })
const deliveryDrawer = ref(false); const deliveryLoading = ref(false); const deliveryCampaign = ref(null); const socialDeliveries = ref([])
async function copyQrLink(value) {
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success('链接已复制')
  } catch { ElMessage.error('复制失败，请选中链接手动复制') }
}
const statItems = [{ key: 'orders', label: '订单总数' }, { key: 'salesCent', label: '净销售额' }, { key: 'members', label: '会员数' }, { key: 'draws', label: '抽奖次数' }, { key: 'redemptions', label: '确认核销' }, { key: 'commissionCent', label: '累计佣金' }]
const canSeeDashboard = computed(() => checkPermi(['business:dashboard:query']))
const visibleStatItems = computed(() => statItems.filter(item => item.key in dashboard))
const trendSeries = [{ key: 'orders', label: '订单' }, { key: 'draws', label: '抽奖' }, { key: 'redemptions', label: '核销' }]
const visibleTrendSeries = computed(() => trendSeries.filter(series => trend.value.some(item => Object.prototype.hasOwnProperty.call(item, series.key))))
const selectedProductName = computed(() => productOptions.value.find(item => Number(item.productId) === Number(skuProductId.value))?.productName || '')
const videoPublishStatusLabel = computed(() => ({ draft: '待完善资料', submitting: '提交中', submitted: '资料已提交', unknown: '结果待核对', listing_submitting: '申请上架中', listing_submitted: '已申请上架', listing_unknown: '上架结果待核对' })[videoMapping.publishStatus] || videoMapping.publishStatus || '未配置')
const videoPublishTagType = computed(() => ['unknown', 'listing_unknown'].includes(videoMapping.publishStatus) ? 'warning' : ['submitted', 'listing_submitted'].includes(videoMapping.publishStatus) ? 'success' : 'info')
const canEditPromotion = computed(() => checkPermi(['business:promotion:edit']))
const promotionSchedules = computed(() => [
  { key: 'customerRates', label: '客户推广佣金梯度', total: (promotion.customerRates || []).reduce((sum, value) => sum + Number(value || 0), 0) },
  { key: 'staffRates', label: '员工推广佣金梯度', total: (promotion.staffRates || []).reduce((sum, value) => sum + Number(value || 0), 0) }
])
const canEditRanking = computed(() => checkPermi(['business:ranking:edit']))
const canEditChannel = computed(() => checkPermi(['business:channel:edit']))
const tabPermissions = { overview: ['business:dashboard:query', 'business:channel:query'], lottery: ['business:lottery:list'], videoStock: ['business:product:list'], videoOrders: ['business:channel:query'], videoAftersales: ['business:channel:query'], points: ['business:pointRule:list'], promotion: ['business:promotion:query'], social: ['business:social:list'], ranking: ['business:ranking:query'], settlements: ['business:settlement:list'], channel: ['business:channel:query'] }
function canSeeTab(key) { return checkPermi(tabPermissions[key] || []) }
function firstVisibleTab() { return Object.keys(tabPermissions).find(canSeeTab) || '' }
function readinessStatusLabel(status) { return ({ ready: '已就绪', verify: '待验证', pending: '待处理' })[status] || '待检查' }
function readinessTagType(status) { return ({ ready: 'success', verify: 'warning', pending: 'info' })[status] || 'info' }
const readinessProgress = computed(() => {
  const total = Number(readiness.readyCount || 0) + Number(readiness.verificationCount || 0) + Number(readiness.pendingCount || 0)
  return total ? Math.round(Number(readiness.readyCount || 0) / total * 100) : 0
})
function readinessTarget(item) { return ['social', 'work', 'video'].includes(item?.key) && canSeeTab('channel') ? 'channel' : '' }
async function focusReadiness(item) {
  const target = readinessTarget(item)
  if (!target) return
  active.value = target
  await nextTick()
  document.getElementById(`channel-section-${item.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const amountKeys = new Set(['salesCent', 'commissionCent'])
function statValue(key) { const value = Number(dashboard[key] || 0); return amountKeys.has(key) ? `¥${(value / 100).toFixed(2)}` : value.toLocaleString() }
const hasTrendData = computed(() => trend.value.some(item => visibleTrendSeries.value.some(series => Number(item[series.key] || 0) > 0)))
const trendMax = computed(() => Math.max(1, ...trend.value.flatMap(item => visibleTrendSeries.value.map(series => Number(item[series.key] || 0)))))
function barHeight(item, key) { return Math.round(Number(item[key] || 0) / trendMax.value * 100) }
let tableScrollCleanup = []
function syncOperationsTableScroll() {
  tableScrollCleanup.forEach(cleanup => cleanup())
  tableScrollCleanup = []
  document.querySelectorAll('.operations-page .el-table').forEach(table => {
    const bodyWrap = table.querySelector('.el-table__body-wrapper .el-scrollbar__wrap')
    const headerWrap = table.querySelector('.el-table__header-wrapper')
    if (!bodyWrap || !headerWrap) return
    const onScroll = () => { headerWrap.scrollLeft = bodyWrap.scrollLeft }
    bodyWrap.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    tableScrollCleanup.push(() => bodyWrap.removeEventListener('scroll', onScroll))
  })
}
watch(active, () => nextTick(syncOperationsTableScroll))
async function loadLotteryPrizes() {
  prizes.value = []
  if (!lotteryForm.activityCode) return
  prizeLoading.value = true
  try {
    const rows = (await listLotteryPrizes(lotteryForm.activityCode)) || []
    prizes.value = rows.filter(item => String(item.status) === '0')
  } finally {
    prizeLoading.value = false
  }
}
async function load() {
  const tasks = []; const failures = [];
  const schedule = (permissions, label, task) => { if (checkPermi(permissions)) tasks.push(Promise.resolve().then(task).catch(error => { if (error?.code !== 401) failures.push(label + '：' + (error.message || '加载失败')) })) };
  schedule(['business:dashboard:query'], '经营概览', async () => { const overview = await getDashboard(); Object.keys(dashboard).forEach(key => delete dashboard[key]); Object.assign(dashboard, overview); trend.value = overview?.trend || [] });
  schedule(['business:lottery:list'], '扫码抽奖', async () => { lotteryLoading.value = true; try { activities.value = (await listLotteryActivities()) || []; if (!lotteryForm.activityCode && activities.value[0]) lotteryForm.activityCode = activities.value[0].activityCode; await Promise.all([loadLotteryPrizes(), loadCodeBatches()]) } finally { lotteryLoading.value = false } });
  schedule(['business:product:list'], '微信小店库存映射', async () => { const products = await listBusiness('product', { pageNum: 1, pageSize: 1000 }); productOptions.value = products.rows || []; if (!skuProductId.value && productOptions.value[0]) skuProductId.value = productOptions.value[0].productId; if (skuProductId.value) await loadSkus() });
  schedule(['business:pointRule:list'], '积分规则', async () => { pointRules.value = (await getPointRules()) || [] });
  schedule(['business:promotion:query'], '分销规则', async () => { Object.assign(promotion, (await getPromotionConfig()) || {}); hydratePromotionRates() });
  schedule(['business:ranking:query'], '销冠排行', async () => { Object.assign(ranking, (await getRankingConfig()) || {}); try { rankRewards.value = typeof ranking.rewardJson === 'string' ? JSON.parse(ranking.rewardJson) : ranking.rewardJson || [] } catch { rankRewards.value = [] }; rankingRewards.value = ranking.configId ? (await listRankingRewards(ranking.configId)) || [] : []; rankingPeriods.value = ranking.configId ? (await listRankingPeriods(ranking.configId)) || [] : [] });
  schedule(['business:social:list'], 'VIP 社群', async () => { campaigns.value = (await listSocialCampaigns()) || [] });
  schedule(['business:channel:query'], '微信渠道', async () => { Object.assign(channel, (await getChannelConfig()) || {}) });
  if (showReadinessPanel) schedule(['business:channel:query'], '上线检查', loadReadiness);
  schedule(['business:channel:query'], '微信小店订单', async () => { await loadVideoOrders() });
  schedule(['business:channel:query'], '微信小店售后', async () => { await loadVideoAftersales() });
  schedule(['business:settlement:list'], '佣金提现', async () => { settlements.value = (await listPromotionSettlements({ pageNum: 1, pageSize: 100 }))?.rows || [] });
  await Promise.all(tasks);
  await nextTick()
  syncOperationsTableScroll()
  if (failures.length) ElMessage.warning('部分运营模块加载失败：' + failures.join('；'));
}
async function loadReadiness() {
  if (!showReadinessPanel || !canSeeTab('channel')) return
  readinessLoading.value = true
  try { Object.assign(readiness, (await getReadiness()) || {}) } catch (error) { ElMessage.error(error.message || '上线检查失败') } finally { readinessLoading.value = false }
}
function openPasswordReset() { router.push({ name: 'Profile', params: { activeTab: 'resetPwd' } }) }
async function confirmReadiness(item) {
  try {
    const { value } = await ElMessageBox.prompt(`请填写 ${item.label} 的真实平台回执、测试时间及可追溯单号。`, '登记上线验收', {
      inputType: 'textarea',
      inputPlaceholder: '真实交易单号、消息回执或平台操作记录',
      inputValidator: text => {
        const length = String(text || '').trim().length
        return (length >= 10 && length <= 1000) || '验收证据须填写 10 至 1000 个字'
      },
      confirmButtonText: '登记验收',
      cancelButtonText: '取消'
    })
    verifyingKey.value = item.key
    await verifyReadiness(item.key, value.trim())
    await loadReadiness()
    ElMessage.success('平台验收记录已保存')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '验收记录保存失败') }
  finally { verifyingKey.value = '' }
}
async function changeLotteryActivity() {
  codes.value = []; codeBatches.value = []; selectedBatchId.value = ''; codeBatchPage.value = 1; codeBatchTotal.value = 0
  await Promise.all([loadLotteryPrizes(), loadCodeBatches()])
}
function changeCodeBatchPage(page) {
  codeBatchPage.value = page
  codes.value = []; selectedBatchId.value = ''
  loadCodeBatches()
}
async function loadCodeBatches() {
  if (!lotteryForm.activityCode || !checkPermi(['business:lottery:generate'])) return
  const activity = lotteryForm.activityCode
  const page = codeBatchPage.value
  batchLoading.value = true
  try {
    const result = await listLotteryCodeBatches(activity, page, codeBatchPageSize)
    if (activity === lotteryForm.activityCode && page === codeBatchPage.value) {
      codeBatches.value = result?.rows || []
      codeBatchTotal.value = Number(result?.total || 0)
    }
  } catch (error) { ElMessage.error(error.message || '批次加载失败') }
  finally { batchLoading.value = false }
}
async function loadCodeBatch(batchId) {
  if (!batchId) return
  const activity = lotteryForm.activityCode
  selectedBatchId.value = batchId
  codes.value = []
  saving.value = true
  try {
    const result = await getLotteryCodeBatch(batchId)
    if (activity !== lotteryForm.activityCode || selectedBatchId.value !== batchId) return
    codes.value = result.codes || []
  } catch (error) { codes.value = []; ElMessage.error(error.message || '批次加载失败') }
  finally { saving.value = false }
}
async function generateCodes() {
  if (saving.value || exportingCodes.value) return
  if (!lotteryForm.activityCode) return ElMessage.warning('请选择活动')
  if (lotteryForm.count === null || lotteryForm.count === undefined) return ElMessage.warning('请输入生成数量')
  if (!Number.isInteger(lotteryForm.count) || lotteryForm.count < 1 || lotteryForm.count > 100) return ElMessage.warning('生成数量必须为1至100的整数')
  // A retry after a lost response retrieves the same persisted batch.
  if (!pendingGeneration || pendingGeneration.activityCode !== lotteryForm.activityCode || pendingGeneration.count !== lotteryForm.count) {
    const requestId = crypto.randomUUID().replace(/-/g, '')
    pendingGeneration = { ...lotteryForm, requestId }
  }
  saving.value = true
  try {
    const result = await generateLotteryCodes({ ...pendingGeneration })
    const generatedCount = (result.codes || []).length || lotteryForm.count
    codes.value = []
    selectedBatchId.value = ''
    codeBatchPage.value = 1
    pendingGeneration = null
    ElMessage.success(`已生成 ${generatedCount} 个码，中奖 ${result.winCount} 个，结果已固定；批次概览已更新`)
    await Promise.all([loadCodeBatches(), loadLotteryPrizes().catch(() => ElMessage.warning('生成成功，库存列表刷新失败，请手动刷新'))])
  } catch (error) { ElMessage.error(error.message || '生成失败，请重试；同一次请求不会重复生成') }
  finally { saving.value = false }
}
async function downloadCodeExcel(batchSummary) {
  if (exportingCodes.value || saving.value) return
  const batchId = batchSummary?.batchId || selectedBatchId.value
  if (!batchId) return ElMessage.warning('请先选择要导出的批次')
  exportingCodes.value = true
  exportingBatchId.value = batchId
  try {
    const detail = await getLotteryCodeBatch(batchId)
    const batch = detail?.codes
    if (detail?.batchId !== batchId || !Array.isArray(batch) || batch.length !== Number(detail.codeCount))
      throw new Error('批次二维码数量不一致，请刷新列表后重试')
    const batchActivityCode = detail.activityCode
    const activity = String(batchActivityCode || 'lottery').replace(/[^A-Za-z0-9_-]/g, '')
    const content = await buildLotteryCodeExcel(batch)
    saveAs(new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${activity}-qrcodes-${batchId}.xlsx`)
    ElMessage.success(`已导出 ${batch.length} 条二维码字符串 Excel`)
  } catch (error) { ElMessage.error(error.message || '二维码字符串 Excel 导出失败，请重试') }
  finally { exportingCodes.value = false; exportingBatchId.value = '' }
}
function editActivity(row) {
  const ruleText = typeof row.ruleJson === 'string' ? row.ruleJson : JSON.stringify(row.ruleJson || {}, null, 2)
  let rule = {}
  try { rule = JSON.parse(ruleText || '{}') } catch { rule = {} }
  Object.assign(activityForm, row, { status: String(row.status ?? '0'), codeReusable: rule.codeReusable === true, rewardValidityDays: Number(rule.rewardValidityDays || 0), ruleJson: ruleText })
  activityDialog.value = true
}
async function saveActivity() {
  if (!String(activityForm.activityName || '').trim()) return ElMessage.warning('请输入活动名称')
  if (activityForm.dailyLimit === null || activityForm.dailyLimit === undefined) return ElMessage.warning('请输入每日次数')
  if (activityForm.totalLimit === null || activityForm.totalLimit === undefined) return ElMessage.warning('请输入总次数')
  if (activityForm.rewardValidityDays === null || activityForm.rewardValidityDays === undefined) return ElMessage.warning('请输入奖品有效期')
  if (!activityForm.status) return ElMessage.warning('请选择活动状态')
  if (activityForm.startTime && activityForm.endTime && new Date(activityForm.startTime.replace(' ', 'T')) >= new Date(activityForm.endTime.replace(' ', 'T'))) return ElMessage.warning('结束时间必须晚于开始时间')
  let rule
  try { rule = JSON.parse(String(activityForm.ruleJson || '{}')) || {} } catch { return ElMessage.warning('规则 JSON 格式不正确') }
  if (typeof rule !== 'object' || Array.isArray(rule)) return ElMessage.warning('规则 JSON 必须是对象')
  rule.codeReusable = activityForm.codeReusable === true
  if (Number(activityForm.rewardValidityDays) > 0) rule.rewardValidityDays = Number(activityForm.rewardValidityDays)
  else delete rule.rewardValidityDays
  saving.value = true
  try {
    await updateLotteryActivity({ ...activityForm, activityName: activityForm.activityName.trim(), ruleJson: JSON.stringify(rule) })
    activityDialog.value = false
    activities.value = (await listLotteryActivities()) || []
    if (lotteryForm.activityCode === activityForm.activityCode) await loadLotteryPrizes()
    ElMessage.success('抽奖活动已保存')
  } catch (error) { ElMessage.error(error.message || '抽奖活动保存失败') } finally { saving.value = false }
}
async function loadSkus() { videoSyncResult.value = null; if (!skuProductId.value) { skuRows.value = []; skuMappingBaseline.value = {}; videoExternalProductId.value = ''; videoMounts.value = []; Object.assign(videoMapping, { publishStatus: 'draft', publishError: '', externalStatus: '', publishPayloadJson: '', publishedAt: '' }); return }; const [skus, mapping] = await Promise.all([getProductSkus(skuProductId.value), getVideoProductMapping(skuProductId.value), loadVideoMounts()]); skuRows.value = skus || []; skuMappingBaseline.value = Object.fromEntries(skuRows.value.map(row => [String(row.skuId), row.externalSkuId || ''])); videoExternalProductId.value = mapping?.externalId || ''; Object.assign(videoMapping, { publishStatus: 'draft', publishError: '', externalStatus: '', publishPayloadJson: '', publishedAt: '' }, mapping || {}) }
async function loadVideoMounts() { if (!skuProductId.value) return; videoMountsLoading.value = true; try { const page = await getVideoFeedMounts({ productId: skuProductId.value, pageNum: 1, pageSize: 100 }); videoMounts.value = page?.rows || [] } finally { videoMountsLoading.value = false } }
function clearExternalSkuSelections() { skuRows.value.forEach(row => { row.externalSkuId = '' }) }
function rememberProduct(item) { if (item && !productOptions.value.some(row => String(row.productId) === String(item.value))) productOptions.value.push({ productId: item.value, productName: item.label }) }
function openVideoPublishEditor() { videoPublishPayload.value = videoMapping.publishPayloadJson || ''; videoPublishDialog.value = true }
async function generateVideoPublishTemplate() { if (!skuProductId.value) return ElMessage.warning('请先选择商品'); try { videoPublishPayload.value = await getVideoProductTemplate(skuProductId.value); ElMessage.success('已生成模板，请补充微信素材、类目、运费模板、SKU 属性及所需资质') } catch (error) { ElMessage.error(error.message || '发布模板生成失败') } }
async function saveVideoPublishMapping() { if (!skuProductId.value) return ElMessage.warning('请先选择商品'); videoMappingSaving.value = true; try { const result = await saveVideoProductMapping(skuProductId.value, videoExternalProductId.value.trim(), videoPublishPayload.value); Object.assign(videoMapping, result || {}); videoPublishDialog.value = false; ElMessage.success('商品映射与发布资料已保存') } catch (error) { ElMessage.error(error.message || '发布资料保存失败') } finally { videoMappingSaving.value = false } }
async function saveVideoMapping() { if (!skuProductId.value) return ElMessage.warning('请先选择商品'); await saveVideoProductMapping(skuProductId.value, videoExternalProductId.value.trim(), videoMapping.publishPayloadJson || undefined); await loadSkus(); ElMessage.success('微信小店商品映射已保存') }
async function saveVideoSkuMappings() {
  if (!skuProductId.value) return ElMessage.warning('请先选择商品')
  if (skuMappingSaving.value) return
  const productId = skuProductId.value
  const mappings = skuRows.value
    .filter(row => (row.externalSkuId || '') !== skuMappingBaseline.value[String(row.skuId)])
    .map(row => ({ skuId: row.skuId, externalSkuId: row.externalSkuId || '', previousExternalSkuId: skuMappingBaseline.value[String(row.skuId)] }))
  if (!mappings.length) return ElMessage.info('规格映射没有变更')
  skuMappingSaving.value = true
  try {
    await saveProductSkuMappings(productId, videoExternalProductId.value, mappings)
    if (String(skuProductId.value) === String(productId)) await loadSkus()
    ElMessage.success('微信小店 SKU 映射已保存')
  } catch (error) { ElMessage.error(error.message || '微信小店 SKU 映射保存失败') }
  finally { skuMappingSaving.value = false }
}
async function syncVideoStock() {
  if (!skuProductId.value) return ElMessage.warning('请先选择商品')
  videoSyncing.value = true
  try {
    videoSyncResult.value = await syncVideoProductStock(skuProductId.value)
    await loadSkus()
    ElMessage[videoSyncResult.value.failed ? 'warning' : 'success'](videoSyncResult.value.message)
  } catch (error) { await loadSkus().catch(() => {}); ElMessage.error(error.message || '库存同步失败') }
  finally { videoSyncing.value = false }
}
async function submitVideoPublish() { if (!skuProductId.value) return; try { await ElMessageBox.confirm('微信小店将创建或更新商品资料。接口结果不代表审核通过或已上架；结果未知时请刷新平台状态，不要重复提交。', '提交商品资料', { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '再检查' }); videoPublishing.value = true; const result = await submitVideoProduct(skuProductId.value); await loadSkus(); ElMessage[result?.publishStatus === 'unknown' ? 'warning' : 'success'](result?.message || '商品资料提交完成') } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '商品资料提交失败') } finally { videoPublishing.value = false } }
async function refreshVideoProduct() { if (!skuProductId.value) return; videoRefreshing.value = true; try { const result = await refreshVideoProductApi(skuProductId.value); await loadSkus(); ElMessage.success(result?.message || '平台状态已刷新') } catch (error) { ElMessage.error(error.message || '平台状态刷新失败') } finally { videoRefreshing.value = false } }
async function requestVideoListing() { if (!skuProductId.value) return; try { await ElMessageBox.confirm('将单独向微信小店提交上架申请。商品是否在售以平台状态回读为准。', '申请上架', { type: 'warning', confirmButtonText: '提交申请', cancelButtonText: '取消' }); videoListing.value = true; const result = await requestVideoProductListing(skuProductId.value); await loadSkus(); ElMessage[result?.publishStatus === 'listing_unknown' ? 'warning' : 'success'](result?.message || '上架申请已提交') } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '申请上架失败') } finally { videoListing.value = false } }
async function saveMount() { if (!skuProductId.value) return ElMessage.warning('请选择商品'); if (!mountForm.feedId.trim()) return ElMessage.warning('请输入短视频 Feed ID'); if (!mountForm.nonceId.trim()) return ElMessage.warning('请输入 Nonce ID'); try { await saveVideoFeedMount({ ...mountForm, productId: skuProductId.value, externalProductId: mountForm.externalProductId.trim() || videoExternalProductId.value.trim() }); mountForm.feedId = ''; mountForm.nonceId = ''; mountForm.externalProductId = ''; mountForm.mountTitle = ''; await loadVideoMounts(); ElMessage.success('短视频挂载配置已保存') } catch (error) { ElMessage.error(error.message || '挂载配置保存失败') } }
async function submitMount(row) { try { await ElMessageBox.confirm('系统会生成挂载清单并进入待平台确认状态。请在视频号助手完成商品挂载后再确认结果。', '生成挂载清单', { type: 'warning', confirmButtonText: '继续', cancelButtonText: '取消' }); const result = await submitVideoFeedMount(row.mountId); await loadVideoMounts(); ElMessage.warning(result?.message || '已进入待平台确认') } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '挂载清单生成失败') } }
async function verifyMount(row, status) { if (status === 'verified') { try { await ElMessageBox.confirm('请确认你已经在视频号助手看到该商品挂载成功。确认后系统才会作为已核验记录。', '确认平台结果', { type: 'warning', confirmButtonText: '确认成功', cancelButtonText: '取消' }) } catch (error) { return } } else { const reason = await ElMessageBox.prompt('请填写平台失败原因', '记录挂载失败', { inputPlaceholder: '例如：商品审核未通过或 Feed 已失效', inputValidator: value => value?.trim() ? true : '失败原因不能为空' }).catch(() => null); if (!reason) return; await verifyVideoFeedMount(row.mountId, { status, platformConfirmed: false, lastError: reason.value }); await loadVideoMounts(); ElMessage.warning('已记录平台失败结果'); return } try { await verifyVideoFeedMount(row.mountId, { status, platformConfirmed: true }); await loadVideoMounts(); ElMessage.success('短视频挂载已核验') } catch (error) { ElMessage.error(error.message || '挂载结果保存失败') } }
function mountStatusLabel(status) { return ({ draft: '待提交', submitting: '待平台确认', verified: '已核验', failed: '平台失败', unknown: '待核对' })[status] || status || '未知' }
function mountStatusType(status) { return ({ verified: 'success', failed: 'danger', submitting: 'warning' })[status] || 'info' }
async function loadVideoOrders() { videoOrdersLoading.value = true; try { const page = await getVideoOrders({ pageNum: 1, pageSize: 100 }); videoOrders.value = page?.rows || []; videoOrdersTotal.value = Number(page?.total || 0) } finally { videoOrdersLoading.value = false } }
async function syncVideoOrderPage() { videoOrdersSyncing.value = true; try { const result = await syncVideoOrders(); await loadVideoOrders(); ElMessage.success(`${result?.message || '订单同步完成'}，本页导入 ${result?.imported || 0} 笔`) } catch (error) { ElMessage.error(error.message || '微信小店订单同步失败') } finally { videoOrdersSyncing.value = false } }
async function loadVideoAftersales() { videoAftersalesLoading.value = true; try { const page = await getVideoAftersales({ pageNum: 1, pageSize: 100 }); videoAftersales.value = page?.rows || []; videoAftersalesTotal.value = Number(page?.total || 0) } finally { videoAftersalesLoading.value = false } }
async function syncVideoAftersalePage() { videoAftersalesSyncing.value = true; try { const result = await syncVideoAftersales(); await loadVideoAftersales(); ElMessage.success(`${result?.message || '售后同步完成'}，本页导入 ${result?.imported || 0} 笔`) } catch (error) { ElMessage.error(error.message || '微信小店售后同步失败') } finally { videoAftersalesSyncing.value = false } }
function openShipDialog(row) { Object.assign(shipForm, { orderId: row.externalOrderId, itemSummary: videoOrderItems(row), deliveryId: '', waybillId: '' }); shipDialog.value = true }
async function submitVideoShipment() {
  if (!shipForm.deliveryId.trim()) return ElMessage.warning('请选择快递公司')
  if (!shipForm.waybillId.trim()) return ElMessage.warning('请输入物流单号')
  try {
    await ElMessageBox.confirm('将订单全部商品和物流单号提交至微信小店，提交后不能通过本页面撤回。', '确认发货', { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '再检查' })
    shippingOrder.value = true
    const result = await shipVideoOrder(shipForm.orderId, { deliveryId: shipForm.deliveryId.trim(), waybillId: shipForm.waybillId.trim() })
    shipDialog.value = false
    await loadVideoOrders()
    ElMessage[result?.status === 'unknown' ? 'warning' : 'success'](result?.message || '发货请求已处理')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '发货请求失败') }
  finally { shippingOrder.value = false }
}
function openPriceDialog(row) {
  const items = videoOrderItemList(row)
  if (!items.length) return ElMessage.warning('订单缺少商品行，无法安全提交改价')
  Object.assign(priceForm, { orderId: row.externalOrderId, items: items.map(item => ({ ...item, changePriceCent: Number(item.realPriceCent ?? item.unitPriceCent ?? 0) })), changeExpress: false, expressFeeCent: Number(row.freightCent || 0) })
  priceDialog.value = true
}
async function submitVideoPriceChange() {
  if (!priceForm.items.length || priceForm.items.some(item => !Number.isSafeInteger(Number(item.changePriceCent)) || Number(item.changePriceCent) < 0)) return ElMessage.warning('请检查每个商品行的改价金额')
  try {
    await ElMessageBox.confirm('微信小店将向买家显示新的应付金额，确认已与买家沟通并核对所有商品行。', '确认改价', { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '再检查' })
    changingPrice.value = true
    const result = await changeVideoOrderPrice(priceForm.orderId, {
      items: priceForm.items.map(item => ({ productId: item.productId, skuId: item.skuId, changePriceCent: Number(item.changePriceCent) })),
      changeExpress: priceForm.changeExpress,
      expressFeeCent: Number(priceForm.expressFeeCent || 0)
    })
    priceDialog.value = false
    await loadVideoOrders()
    ElMessage.success(result?.message || '微信小店改价请求已提交')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '微信小店改价失败') }
  finally { changingPrice.value = false }
}
async function acceptAftersale(row) {
  try {
    await ElMessageBox.confirm('将向微信小店提交同意售后申请；退货类售后会使用渠道配置中的退货地址 ID。', '确认同意售后', { type: 'warning', confirmButtonText: '提交同意', cancelButtonText: '取消' })
    await acceptVideoAftersale(row.externalAftersaleId, channel['wechat.video.returnAddressId'] || '')
    await loadVideoAftersales()
    ElMessage.success('已提交微信小店，售后状态已回读')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '同意售后失败') }
}
async function openRejectAftersale(row) {
  try {
    if (!aftersaleRejectReasons.value.length) aftersaleRejectReasons.value = (await getVideoAftersaleRejectReasons()) || []
    if (!aftersaleRejectReasons.value.length) return ElMessage.warning('微信小店未返回可用拒绝原因')
    Object.assign(rejectAftersaleForm, { aftersaleId: row.externalAftersaleId, reasonType: aftersaleRejectReasons.value[0].reject_reason_type, reason: aftersaleRejectReasons.value[0].reject_reason || '' })
    rejectAftersaleDialog.value = true
  } catch (error) { ElMessage.error(error.message || '读取微信拒绝原因失败') }
}
async function submitRejectAftersale() {
  const option = aftersaleRejectReasons.value.find(item => Number(item.reject_reason_type) === Number(rejectAftersaleForm.reasonType))
  if (!option) return ElMessage.warning('请选择微信小店返回的拒绝原因')
  rejectingAftersale.value = true
  try {
    await rejectVideoAftersale(rejectAftersaleForm.aftersaleId, { reasonType: rejectAftersaleForm.reasonType, reason: rejectAftersaleForm.reason.trim() || option.reject_reason || '' })
    rejectAftersaleDialog.value = false
    await loadVideoAftersales()
    ElMessage.success('已提交微信小店，售后状态已回读')
  } catch (error) { ElMessage.error(error.message || '拒绝售后失败') }
  finally { rejectingAftersale.value = false }
}
function money(value) { return (Number(value || 0) / 100).toFixed(2) }
function parseYuanInput(value) { const amount = Number(String(value || '').replace(/[^\d.-]/g, '')); return Number.isFinite(amount) ? Math.round(amount * 100) : 0 }
function prizeTypeLabel(type) { return ({ cash: '现金红包', goods: '实物奖品', points: '积分奖励', coupon: '优惠券', none: '谢谢参与' })[type] || '其他奖项' }
function prizeTypeTag(type) { return ({ cash: 'warning', goods: 'success', points: 'primary', coupon: '', none: 'info' })[type] || 'info' }
function probabilityLabel(value) { return `${(Number(value || 0) / 100).toFixed(2)}%` }
function prizeAmountLabel(row) { if (row.prizeType !== 'cash') return '—'; const rules = Array.isArray(row.cashAmountRules) ? row.cashAmountRules : []; return rules.length ? rules.map(rule => `¥${money(rule.amountCent)}×${rule.count}`).join('、') : `¥${money(row.amountMinCent)} - ¥${money(row.amountMaxCent)}` }
function stockLabel(value) { return Number(value) < 0 ? '不限' : Number(value || 0).toLocaleString() }
function pointSourceLabel(type) { return ({ order_paid: '商城订单', order: '商城订单', daily_sign: '每日签到', invite_register: '邀请注册', lottery: '扫码抽奖', exchange: '积分兑换', ranking: '销冠奖励', manual: '运营调整' })[type] || type || '其他' }
function limitLabel(value) { return Number(value) < 0 ? '不限' : Number(value || 0).toLocaleString() }
function validityLabel(value) { return Number(value) > 0 ? `${Number(value)}天` : '永久有效' }
function rankingRewardStatus(status) { return ({ pending: '待发放', processing: '待确认', issued: '已发放', paid: '已发放', failed: '发放失败' })[status] || status || '待处理' }
function rankingRewardStatusType(status) { return ({ issued: 'success', paid: 'success', failed: 'danger', processing: 'warning' })[status] || 'info' }
function settlementStatus(status) { return ({ pending: '待审核', processing: '待转账', paid: '已支付', failed: '已退回' })[status] || status || '待处理' }
function settlementStatusType(status) { return ({ paid: 'success', failed: 'danger', processing: 'warning' })[status] || 'info' }
function videoOrderStatus(status) { return ({ 10: '待付款', 12: '待收礼', 13: '待成团', 17: '待核销', 20: '待发货', 21: '部分发货', 30: '待收货', 100: '已完成', 200: '售后取消', 250: '已取消' })[Number(status)] || `状态 ${status}` }
function videoOrderStatusType(status) { return ({ 100: 'success', 200: 'warning', 250: 'info' })[Number(status)] || 'primary' }
function fulfillmentStatus(status) { return ({ submitting: '正在提交', submitted: '平台已接受', unknown: '结果待核实', verified: '平台状态已核验' })[status] || '未发货' }
function fulfillmentStatusType(status) { return ({ submitted: 'success', verified: 'success', unknown: 'warning', submitting: 'info' })[status] || 'info' }
function aftersaleStatus(status) { return ({ MERCHANT_PROCESSING: '商家处理中', USER_WAIT_RETURN: '待买家退货', MERCHANT_WAIT_RECEIPT: '待商家收货', MERCHANT_OVERDUE_REFUND: '商家退款超时', MERCHANT_REFUND_SUCCESS: '退款完成', MERCHANT_RETURN_SUCCESS: '退货退款完成', USER_WAIT_CONFIRM: '待买家确认', MERCHANT_REFUND_RETRY_FAIL: '退款失败待处理', MERCHANT_FAIL: '售后关闭', USER_WAIT_CONFIRM_UPDATE: '待买家处理协商', USER_WAIT_HANDLE_MERCHANT_AFTER_SALE: '待买家处理售后', WAIT_PACKAGE_INTERCEPT: '物流拦截中', MERCHANT_REJECT_EXCHANGE: '商家拒绝换货', MERCHANT_REJECT_RESHIP: '商家拒绝补寄', USER_WAIT_RECEIPT: '待买家收货', MERCHANT_EXCHANGE_SUCCESS: '换货完成', MERCHANT_REJECT_REFUND: '商家拒绝退款', MERCHANT_REJECT_RETURN: '商家拒绝退货退款' })[status] || status || '未知状态' }
function aftersaleStatusType(status) { return /SUCCESS$/.test(status || '') ? 'success' : /REJECT|FAIL|OVERDUE/.test(status || '') ? 'danger' : 'warning' }
function aftersaleType(type) { return ({ REFUND: '仅退款', RETURN: '退货退款', EXCHANGE: '换货', RESHIP: '补寄' })[type] || type || '—' }
function videoOrderItemList(row) { try { const value = typeof row.itemsJson === 'string' ? JSON.parse(row.itemsJson) : row.itemsJson || []; return Array.isArray(value) ? value : [] } catch { return [] } }
function videoOrderItems(row) { return videoOrderItemList(row).map(item => `${item.title || item.skuCode || item.productId} × ${item.quantity}`).join('；') || '—' }
function resetPrize() { Object.assign(prizeForm, { prizeId: undefined, prizeName: '', prizeType: 'goods', probabilityBp: 0, amountMinCent: 1, amountMaxCent: 1, cashAmountRules: [], stock: -1, points: 0, couponTemplateId: null, imageUrl: '', redeemStoreId: null }) }
function openNewPrize() { resetPrize(); prizeDialog.value = true }
function editPrize(row) { Object.assign(prizeForm, row, { cashAmountRules: Array.isArray(row.cashAmountRules) ? row.cashAmountRules.map(rule => ({ amountCent: Number(rule.amountCent), count: Number(rule.count) })) : [] }); prizeDialog.value = true }
async function savePrize() {
  if (pendingImageUploads.value) return ElMessage.warning('请等待图片上传完成')
  if (!String(prizeForm.prizeName || '').trim()) return ElMessage.warning('请输入奖项名称')
  if (!prizeForm.prizeType) return ElMessage.warning('请选择奖项类型')
  if (prizeForm.probabilityBp === null || prizeForm.probabilityBp === undefined) return ElMessage.warning('请输入中奖概率')
  if (prizeForm.prizeType === 'cash' && prizeForm.cashAmountRules.some(rule => Number(rule.amountCent) < 1 || Number(rule.count) < 1)) return ElMessage.warning('固定红包金额最低为0.01元，数量必须大于0')
  if (prizeForm.prizeType === 'coupon' && !prizeForm.couponTemplateId) return ElMessage.warning('请选择优惠券模板')
  if (prizeForm.prizeType === 'points' && Number(prizeForm.points) <= 0) return ElMessage.warning('请输入大于零的积分')
  const payload = { ...prizeForm, amountMinCent: prizeForm.prizeType === 'cash' ? 1 : 0, amountMaxCent: prizeForm.prizeType === 'cash' ? 1 : 0, stock: Number.isInteger(Number(prizeForm.stock)) ? Number(prizeForm.stock) : -1, cashAmountRules: prizeForm.prizeType === 'cash' ? prizeForm.cashAmountRules.map(rule => ({ amountCent: Number(rule.amountCent), count: Number(rule.count) })) : [], redeemStoreId: prizeForm.prizeType === 'goods' ? prizeForm.redeemStoreId : null, activityCode: lotteryForm.activityCode }
  if (prizeForm.prizeId) await updateLotteryPrize(payload); else await createLotteryPrize(payload)
  prizeDialog.value = false; await loadLotteryPrizes(); ElMessage.success('奖项已保存'); resetPrize()
}
async function disablePrize(row) { await disableLotteryPrize(row.prizeId); await loadLotteryPrizes(); ElMessage.success('奖项已停用') }
function orderPointsPerYuan(ruleJson) {
  try { return JSON.parse(String(ruleJson || '{}')).per_cent ?? 1 } catch { return '规则异常' }
}
function editRule(row) {
  let ruleJson = row.ruleJson
  let rate = orderPointsPerYuan(ruleJson)
  if (row.ruleCode === 'order_paid') {
    try {
      const rules = JSON.parse(String(ruleJson || '{}'))
      if (rules && !Array.isArray(rules) && typeof rules === 'object') {
        delete rules.per_cent
        ruleJson = JSON.stringify(rules, null, 2)
      }
    } catch { /* Keep malformed historical rules visible for correction. */ }
  }
  Object.assign(ruleForm, row, { ruleJson, orderPointsPerYuan: rate })
  ruleDialog.value = true
}
async function saveRule() {
  if (!String(ruleForm.ruleName || '').trim()) return ElMessage.warning('请输入规则名称')
  if (ruleForm.ruleCode !== 'order_paid' && (ruleForm.points === null || ruleForm.points === undefined)) return ElMessage.warning('请输入积分')
  if (ruleForm.dailyLimit === null || ruleForm.dailyLimit === undefined) {
    const label = ruleForm.ruleCode === 'order_paid' ? '每日奖励单数' : ruleForm.ruleCode === 'invite_register' ? '每日奖励次数' : '每日上限'
    return ElMessage.warning('请输入' + label)
  }
  if (ruleForm.validityDays === null || ruleForm.validityDays === undefined) return ElMessage.warning('请输入有效天数')
  if (!ruleForm.status) return ElMessage.warning('请选择规则状态')
  if (Number(ruleForm.points) < 0) return ElMessage.warning('积分不能小于零')
  if (Number(ruleForm.dailyLimit) < -1) return ElMessage.warning('每日上限不能小于 -1')
  if (Number(ruleForm.validityDays) < 0) return ElMessage.warning('有效天数不能小于零')
  let rules
  try { rules = JSON.parse(String(ruleForm.ruleJson || '{}')) } catch { return ElMessage.warning('扩展参数必须是有效 JSON') }
  if (ruleForm.ruleCode === 'order_paid') {
    const rate = Number(ruleForm.orderPointsPerYuan)
    if (!Number.isInteger(rate) || rate < 0 || rate > 1000) return ElMessage.warning('每消费1元积分须为0至1000的整数')
    if (!rules || Array.isArray(rules) || typeof rules !== 'object') return ElMessage.warning('扩展参数必须是 JSON 对象')
    rules.per_cent = rate
    ruleForm.points = rate
  }
  await updatePointRule({ ...ruleForm, ruleName: String(ruleForm.ruleName).trim(), ruleJson: JSON.stringify(rules) }); ruleDialog.value = false; pointRules.value = await getPointRules(); ElMessage.success('积分规则已保存')
}
function hydratePromotionRates() {
  let stored = []
  try { stored = typeof promotion.levelRatesJson === 'string' ? JSON.parse(promotion.levelRatesJson) : promotion.levelRatesJson || [] } catch { stored = [] }
  const count = Math.max(1, Number(promotion.maxLevel || 1))
  const read = (role, firstRate) => Array.from({ length: count }, (_, index) => {
    const source = Array.isArray(stored) ? stored : stored?.[role]
    const value = index === 0 ? firstRate : Array.isArray(source) ? source[index] : 0
    return Math.max(0, Math.min(10000, Number(value ?? 0)))
  })
  promotion.customerRates = read('customer', Number(promotion.customerRateBp || 0))
  promotion.staffRates = read('staff', Number(promotion.staffRateBp || 0))
}
function resizePromotionRates() {
  const count = Math.max(1, Number(promotion.maxLevel || 1))
  for (const key of ['customerRates', 'staffRates']) promotion[key] = Array.from({ length: count }, (_, index) => Number(promotion[key]?.[index] || 0))
  promotion.customerRateBp = promotion.customerRates[0] || 0
  promotion.staffRateBp = promotion.staffRates[0] || 0
}
async function savePromotion() {
  if (promotion.maxLevel === null || promotion.maxLevel === undefined) return ElMessage.warning('请输入最大分销层级')
  if (promotion.settlementDays === null || promotion.settlementDays === undefined) return ElMessage.warning('请输入结算等待天数')
  if (!promotion.refundPolicy) return ElMessage.warning('请选择退款佣金策略')
  resizePromotionRates()
  for (const schedule of promotionSchedules.value) if (schedule.total > 10000) return ElMessage.warning(`${schedule.label}累计比例不能超过 10000 万分比`)
  await updatePromotionConfig({ ...promotion, customerRateBp: promotion.customerRates[0], staffRateBp: promotion.staffRates[0], levelRatesJson: JSON.stringify({ customer: promotion.customerRates, staff: promotion.staffRates }) })
  ElMessage.success('分销规则已保存')
}
function campaignStatus(status) { return ({ draft: '草稿', queued: '待发送', sending: '发送中', sent: '已完成', partial: '部分失败', failed: '发送失败' })[status] || status || '未知' }
function campaignStatusType(status) { return ({ sent: 'success', partial: 'warning', failed: 'danger', sending: 'primary' })[status] || 'info' }
function campaignTypeLabel(type) { return ({ promotion: '促销活动', coupon: '优惠券提醒', points: '积分提醒' })[type] || type || '活动' }
function campaignChannels(value) { return ({ subscribe: '小程序订阅通知', group: '企业微信群', both: '订阅通知 + 企业微信群' })[value || 'subscribe'] || '小程序订阅通知' }
function deliveryStatusLabel(status) { return ({ pending: '待发送', retry: '待重试', sending: '发送中', sent: '已送达', failed: '明确失败', unknown: '结果未知' })[status] || status || '未知' }
function deliveryStatusType(status) { return ({ sent: 'success', failed: 'danger', unknown: 'warning', retry: 'warning', sending: 'primary' })[status] || 'info' }
async function publishCampaign() {
  if (!campaignForm.campaignType) return ElMessage.warning('请选择活动类型')
  if (campaignForm.campaignType === 'coupon' && !campaignForm.couponTemplateId) return ElMessage.warning('请选择券模板')
  if (!campaignForm.audience) return ElMessage.warning('请选择受众')
  if (!campaignForm.channels) return ElMessage.warning('请选择发送通道')
  if (!String(campaignForm.title || '').trim()) return ElMessage.warning('请输入活动标题')
  if (!String(campaignForm.content || '').trim()) return ElMessage.warning('请输入活动内容')
  await createSocialCampaign({ ...campaignForm, title: campaignForm.title.trim(), content: campaignForm.content.trim(), scheduledAt: campaignForm.scheduledAt || null })
  campaigns.value = await listSocialCampaigns()
  campaignForm.title = ''
  campaignForm.content = ''
  campaignForm.scheduledAt = ''
  campaignForm.couponTemplateId = null
  ElMessage.success('活动草稿已保存')
}
async function sendCampaign(row) { try { const result = await sendSocialCampaign(row.campaignId); campaigns.value = await listSocialCampaigns(); ElMessage.success(result?.message || `已创建 ${result?.queued || 0} 条发送任务`) } catch (error) { campaigns.value = await listSocialCampaigns().catch(() => campaigns.value); ElMessage.error(error.message || '创建发送任务失败') } }
async function openCampaignDeliveries(row) {
  deliveryCampaign.value = row
  socialDeliveries.value = []
  deliveryDrawer.value = true
  deliveryLoading.value = true
  try { socialDeliveries.value = (await listSocialDeliveries(row.campaignId)) || [] }
  catch (error) { ElMessage.error(error.message || '投递明细加载失败') }
  finally { deliveryLoading.value = false }
}
async function saveRanking() {
  if (!['week', 'month', 'quarter'].includes(ranking.periodType)) return ElMessage.warning('请选择有效的排行榜周期')
  if (ranking.startTime && !ranking.endTime) return ElMessage.warning('请选择周期结束时间')
  if (ranking.endTime && !ranking.startTime) return ElMessage.warning('请选择周期开始时间')
  if (ranking.startTime && ranking.endTime && new Date(ranking.startTime.replace(' ', 'T')) >= new Date(ranking.endTime.replace(' ', 'T'))) return ElMessage.warning('周期结束时间必须晚于开始时间')
  if (!rankRewards.value.length || new Set(rankRewards.value.map(item => Number(item.rank))).size !== rankRewards.value.length || rankRewards.value.some(item => !Number.isInteger(item.rank) || item.rank < 1 || item.rank > 100 || !Number.isInteger(item.points) || item.points < 0 || item.points > 2147483647 || !Number.isInteger(item.subsidyCent) || item.subsidyCent < 0 || item.subsidyCent > 2147483647)) return ElMessage.warning('名次不能重复；名次、积分及补贴分值须为有效整数')
  await updateRankingConfig({ ...ranking, rewardJson: JSON.stringify(rankRewards.value) }); ElMessage.success('排行榜周期与奖励已保存')
}
async function issueRewards() {
  if (rankingIssuing.value) return
  if (!ranking.startTime && !ranking.endTime && !rankingPeriodDate.value) return ElMessage.warning('请选择待结算周期内的日期')
  rankingIssuing.value = true
  try {
    const saved = await getRankingConfig()
    const savedRewards = typeof saved.rewardJson === 'string' ? JSON.parse(saved.rewardJson) : saved.rewardJson
    if (['periodType', 'startTime', 'endTime'].some(key => String(saved[key] || '') !== String(ranking[key] || '')) || JSON.stringify(savedRewards) !== JSON.stringify(rankRewards.value)) {
      ElMessage.warning('请先保存周期与奖励配置，再进行结算')
      return
    }
    const target = saved.startTime ? `${saved.startTime} 至 ${saved.endTime}（结束时间不含）` : `${rankingPeriodDate.value} 所在的${{ week: '自然周', month: '自然月', quarter: '自然季度' }[saved.periodType]}`
    await ElMessageBox.confirm(`确认结算 ${target}？结算会按当前净佣金排名发放积分并登记补贴，结果固定后不会因名次变化重复发奖。`, '结算排行榜奖励', { type: 'warning', confirmButtonText: '确认结算', cancelButtonText: '取消' })
    const result = await issueRanking({ configId: saved.configId, periodDate: rankingPeriodDate.value })
    rankingRewards.value = (await listRankingRewards(saved.configId)) || []
    rankingPeriods.value = (await listRankingPeriods(saved.configId)) || []
    if (result.alreadyIssued) ElMessage.info(`该周期已结算，共 ${result.count} 人获奖，本次未重复发放`)
    else ElMessage.success(`周期已结算，共生成 ${result.count} 人的奖励记录`)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '周期结算失败，请稍后重试')
  } finally { rankingIssuing.value = false }
}
async function confirmRankingReward(row) {
  try {
    await ElMessageBox.confirm('请确认补贴已经实际发放，再完成此操作。系统会要求保存转账单号或财务凭证号。', '确认补贴发放', { type: 'warning' })
    const result = await ElMessageBox.prompt('请输入转账单号或财务凭证号', '补贴发放凭证', { inputValue: row.issueReference || '', inputPattern: /^.{1,128}$/, inputErrorMessage: '凭证号不能为空且最多128字', confirmButtonText: '确认已发', cancelButtonText: '取消' })
    await issueRankingReward(row.rewardId, result.value.trim()); rankingRewards.value = (await listRankingRewards(ranking.configId)) || []; ElMessage.success('奖励状态已更新')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '奖励确认失败') }
}
async function settlementAction(row, status) {
  try {
    let payload = { status }
    if (status === 'paid') {
      await ElMessageBox.confirm('请先在线下完成实际转账，再登记凭证。系统状态不会代替银行到账回执。', '确认提现已付款', { type: 'warning' })
      const result = await ElMessageBox.prompt('请输入转账单号或财务凭证号', '付款凭证', { inputValue: row.paymentReference || '', inputPattern: /^(?=.*\S).{1,128}$/, inputErrorMessage: '凭证号不能为空且最多128字', confirmButtonText: '确认已转账' })
      payload.paymentReference = result.value.trim()
    } else if (status === 'failed') {
      const result = await ElMessageBox.prompt('请输入退回原因，系统会释放本次占用的佣金', '退回提现', { inputValue: row.failureReason || '', inputPattern: /^(?=.*\S).{1,500}$/, inputErrorMessage: '退回原因不能为空且最多500字', confirmButtonText: '退回并释放佣金', type: 'warning' })
      payload.failureReason = result.value.trim()
    } else {
      await ElMessageBox.confirm('确认通过提现审核？审核通过后请完成线下转账并登记凭证。', '佣金提现处理', { type: 'info' })
    }
    await updatePromotionSettlement(row.settlementId, payload)
    settlements.value = (await listPromotionSettlements({ pageNum: 1, pageSize: 100 }))?.rows || []
    ElMessage.success('提现状态已更新')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '处理失败') }
}
const editableChannelKeys = [
  'wechat.mini.socialTemplateId', 'wechat.mini.socialTitleField', 'wechat.mini.socialContentField',
  'wechat.customer.serviceQr', 'wechat.video.finderUserName', 'wechat.video.shopId',
  'wechat.video.syncEnabled', 'wechat.video.liveFeedId', 'wechat.video.liveNonceId',
  'wechat.video.feedId', 'wechat.video.nonceId', 'wechat.video.returnAddressId',
]
async function saveChannel() {
  if (pendingImageUploads.value) return ElMessage.warning('请等待图片上传完成')
  saving.value = true
  try {
    const payload = Object.fromEntries(editableChannelKeys.filter(key => Object.prototype.hasOwnProperty.call(channel, key)).map(key => [key, channel[key]]))
    await updateChannelConfig(payload)
    ElMessage.success('渠道配置已保存')
  } catch (error) { ElMessage.error(error.message || '渠道配置保存失败') }
  finally { saving.value = false }
}
async function checkVideoShopAction() { videoChecking.value = true; try { videoShopCheck.value = await checkVideoShop(); ElMessage.success('微信小店授权校验通过') } catch (error) { videoShopCheck.value = null; ElMessage.error(error.message || '微信小店授权校验失败') } finally { videoChecking.value = false } }
async function makeGroupQr() { saving.value = true; try { const result = await createGroupQr({ chatIds: channel['wechat.work.groupChatIds'] }); Object.assign(channel, await getChannelConfig()); ElMessage[result.oldCodeRevoked ? 'success' : 'warning'](`企业微信群二维码已生成，覆盖 ${result.chatCount} 个群${result.pendingRevocations ? `，${result.pendingRevocations} 个旧码待撤销` : ''}`) } catch (error) { ElMessage.error(error.message || '企业微信群二维码生成失败') } finally { saving.value = false } }
async function reconcileGroupQrAction(configId) {
  try {
    const { value: evidence } = await ElMessageBox.prompt(`确认已在企业微信管理端核验旧码 ${configId} 不再有效，并填写核验证据。`, '登记旧码撤销', { inputPlaceholder: '平台检查时间、操作记录或工单号', inputValidator: value => String(value || '').trim().length >= 10 || '核验证据至少填写 10 个字' })
    reconcileLoading.value = configId
    await reconcileGroupQr({ configId, evidence: evidence.trim() })
    Object.assign(channel, await getChannelConfig())
    ElMessage.success('旧码撤销已登记')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '旧码核验登记失败') }
  finally { reconcileLoading.value = '' }
}
onMounted(() => { active.value = firstVisibleTab(); load().catch(error => ElMessage.error(error.message || '加载失败')) })
onBeforeUnmount(() => { tableScrollCleanup.forEach(cleanup => cleanup()); tableScrollCleanup = [] })
</script>

<style scoped>
.operations-page { min-height: calc(100vh - 84px); padding: 18px 20px 26px; color: var(--el-text-color-primary); background: var(--el-bg-color-page); }
.delivery-drawer-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
.delivery-drawer-heading strong { color: var(--el-text-color-primary); font-size: 16px; }
.delivery-drawer-heading p { margin: 6px 0 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
.dashboard-heading { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin: 2px 0 20px; padding: 18px 22px; border: 1px solid var(--el-border-color-light); border-top: 2px solid #c59a57; border-radius: 8px; background: var(--el-bg-color-overlay); box-shadow: 0 6px 20px rgba(32, 53, 44, .045); }
.dashboard-kicker { color: #a47b3e; font-size: 11px; font-weight: 700; letter-spacing: .12em; }
.dashboard-heading h2 { margin: 4px 0 3px; color: var(--el-text-color-primary); font-size: 23px; line-height: 1.35; }
.dashboard-heading p { margin: 0; color: var(--el-text-color-secondary); font-size: 13px; }
.readiness-panel { margin-bottom: 16px; padding: 18px 20px 16px; border: 1px solid #e4e9e2; border-radius: 8px; background: var(--el-bg-color-overlay); box-shadow: 0 2px 8px rgba(32, 53, 44, .035); }
.readiness-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.readiness-kicker { color: #a47b3e; font-size: 11px; font-weight: 700; letter-spacing: .12em; }
.readiness-heading h3 { margin: 4px 0 3px; color: #2f4138; font-size: 16px; }
.readiness-heading p { margin: 0; color: var(--el-text-color-secondary); font-size: 12px; }
.readiness-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 16px; padding: 10px 12px; border: 1px solid #edf0ec; border-radius: 6px; background: #fafbf9; }
.readiness-summary-item { display: inline-flex; align-items: baseline; gap: 5px; color: #6d7972; font-size: 12px; }
.readiness-summary-item b { font-size: 20px; font-weight: 650; font-variant-numeric: tabular-nums; }
.readiness-summary-item.ready b { color: #3e8060; }
.readiness-summary-item.verify b { color: #a47b3e; }
.readiness-summary-item.pending b { color: #7c8580; }
.readiness-progress { margin-top: 14px; padding: 10px 12px 11px; border: 1px solid #edf0ec; border-radius: 6px; background: #fff; }
.readiness-progress-label { display: flex; align-items: center; justify-content: space-between; color: #59675f; font-size: 12px; }
.readiness-progress-label strong { color: #8d3f39; font-size: 13px; font-variant-numeric: tabular-nums; }
.readiness-progress-track { height: 5px; margin-top: 8px; overflow: hidden; border-radius: 99px; background: #edf0ec; }
.readiness-progress-track span { display: block; height: 100%; min-width: 3px; border-radius: inherit; background: linear-gradient(90deg, #245a4a, #b78c48); transition: width .25s ease; }
.readiness-progress small { display: block; margin-top: 7px; color: #8a958e; font-size: 11px; }
.readiness-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.readiness-item { min-width: 0; padding: 12px 14px; border: 1px solid #edf0ec; border-radius: 6px; background: #fff; }
.readiness-item-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.readiness-item-top strong { overflow: hidden; color: #34483e; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.readiness-item p { min-height: 36px; margin: 9px 0 6px; color: #6e7a73; font-size: 12px; line-height: 1.55; }
.readiness-item-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; }
.readiness-item-footer small { flex: 1 1 auto; min-width: 0; overflow: hidden; color: #9a6f32; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.readiness-item-footer :deep(.el-button) { flex: none; margin-left: 0; }
.readiness-empty { grid-column: 1 / -1; padding: 16px; color: var(--el-text-color-secondary); text-align: center; }
.operations-page :deep(.el-card), .operations-page :deep(.el-tabs--border-card) { border-color: #e4e9e2; }
.operations-page :deep(.el-tabs--border-card) { overflow: hidden; border-radius: 8px; box-shadow: 0 5px 18px rgba(32, 53, 44, .045); }
.operations-page :deep(.el-tabs__header) { background: #f7f8f5; }
.operations-page :deep(.el-tabs__nav-wrap) { overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
.operations-page :deep(.el-tabs__nav-wrap::-webkit-scrollbar) { display: none; }
.operations-page :deep(.el-tabs__nav) { min-width: max-content; }
.operations-page :deep(.el-tabs__item) { white-space: nowrap; }
.operations-page :deep(.el-tabs__item.is-active) { color: #1c4a3d; font-weight: 600; }
.operations-page :deep(.el-card) { border-radius: 8px; box-shadow: 0 5px 18px rgba(32, 53, 44, .04); }
.operations-page :deep(.el-tabs__content) { min-height: 430px; padding: 18px 20px 14px; }
.operations-page :deep(.el-form--inline) { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
.operations-page :deep(.el-table) { margin-top: 12px; }
.operations-page :deep(.el-tab-pane) { padding: 4px 2px 12px; }
.overview-content { padding: 2px 0 0; }
.promotion-form { max-width: 1040px; }
.rate-schedules { display: grid; grid-template-columns: repeat(2, minmax(280px, 1fr)); gap: 14px; margin: 0 0 18px 140px; }
.rate-schedule { min-width: 0; padding: 14px 16px; border: 1px solid var(--el-border-color-light); border-radius: 6px; background: var(--el-fill-color-lighter); }
.schedule-heading { display: flex; justify-content: space-between; gap: 10px; color: #33453c; font-size: 14px; }
.schedule-heading span, .schedule-foot { color: #77837c; font-size: 12px; }
.rate-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin-top: 14px; }
.rate-row { display: grid; grid-template-columns: 52px minmax(100px, 1fr) 44px; align-items: center; gap: 6px; color: #526159; font-size: 12px; }
.rate-row :deep(.el-input-number) { width: 100%; }
.rate-row small { color: #89938d; }
.schedule-foot { margin-top: 12px; }
.stat-row { margin-bottom: 16px; }
.stat-row :deep(.el-col) { margin-bottom: 12px; }
@media (max-width: 900px) { .rate-schedules { grid-template-columns: 1fr; margin-left: 0; } }
.stat-card { height: 100%; overflow: hidden; border-left: 3px solid #b78c48; }
.stat-card.metric-draws { border-left-color: #1c4a3d; }
.stat-card.metric-members { border-left-color: #7d9b90; }
.stat-card.metric-commissionCent { border-left-color: #7787a0; }
.stat-card :deep(.el-card__body) { padding: 17px 18px 19px; }
.stat-label { color: var(--el-text-color-secondary); font-size: 13px; }
.stat-value { margin-top: 8px; color: var(--el-text-color-primary); font-size: 25px; font-variant-numeric: tabular-nums; font-weight: 650; }
.stat-card.metric-salesCent .stat-value, .stat-card.metric-commissionCent .stat-value { color: #946d34; }
.trend-card { margin-bottom: 16px; border-radius: 8px; }
.trend-heading { display: flex; justify-content: space-between; align-items: center; color: var(--el-text-color-primary); font-weight: 600; }
.trend-note { color: var(--el-text-color-secondary); font-size: 12px; font-weight: 400; }
.trend-chart { display: flex; align-items: flex-end; height: 142px; gap: 14px; margin-top: 18px; border-bottom: 1px solid var(--el-border-color-light); background: repeating-linear-gradient(to top, transparent 0, transparent 34px, var(--el-fill-color-light) 35px); }
.trend-empty { display: flex; width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--el-text-color-secondary); font-size: 13px; }
.trend-empty-mark { color: #b78c48; font-size: 24px; line-height: 1; }
.trend-empty small { color: var(--el-text-color-placeholder); font-size: 11px; }
.trend-day { display: flex; flex: 1; min-width: 32px; height: 100%; flex-direction: column; justify-content: flex-end; align-items: center; gap: 7px; }
.trend-bars { display: flex; height: 112px; width: 100%; align-items: flex-end; justify-content: center; gap: 3px; }
.trend-bar { display: block; width: 10px; border-radius: 3px 3px 0 0; transition: height .2s ease; }
.trend-bar.orders, .trend-legend i.orders { background: #b78c48; }
.trend-bar.draws, .trend-legend i.draws { background: #1c4a3d; }
.trend-bar.redemptions, .trend-legend i.redemptions { background: #7d9b90; }
.trend-label { color: var(--el-text-color-secondary); font-size: 11px; }
.trend-legend { display: flex; gap: 18px; margin-top: 12px; color: var(--el-text-color-secondary); font-size: 12px; }
.trend-legend span { display: inline-flex; align-items: center; gap: 5px; }
.trend-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.result-alert { margin-bottom: 16px; }
.lottery-batches { margin-bottom: 18px; }
.lottery-batches-heading, .batch-detail-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.lottery-batch-pagination { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.lottery-batches-heading strong, .batch-detail-heading strong { color: #263b31; font-size: 15px; font-weight: 600; }
.batch-prize-counts { display: flex; flex-wrap: wrap; gap: 6px; padding: 3px 0; }
.batch-detail-heading { margin: 22px 0 10px; }
.batch-detail-heading > div { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; }
.batch-detail-heading span { color: #7b857f; font-size: 13px; }
.channel-alert { margin-bottom: 18px; }
.inventory-toolbar { margin-bottom: 14px; }
.inventory-alert { margin-bottom: 14px; }
.publish-status { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.publish-summary { margin: 0 0 20px; }
.publish-editor-help { display: grid; gap: 5px; margin-bottom: 16px; padding: 12px 14px; border-left: 3px solid #b78c48; background: #f7f8f4; color: #5f6d64; font-size: 12px; line-height: 1.6; }
.inline-help { margin-left: 8px; color: #7a877f; font-size: 12px; white-space: nowrap; }
.publish-editor-help strong { color: #34483e; font-size: 13px; }
.publish-dialog-actions { display: flex; align-items: center; gap: 8px; }
.publish-dialog-actions span { flex: 1; }
.channel-section { scroll-margin-top: 72px; padding: 18px 0 16px; border-bottom: 1px solid #edf0ec; }
.channel-section:last-child { border-bottom: 0; }
.channel-section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.channel-section-heading h3 { margin: 0; color: #2f4138; font-size: 15px; font-weight: 650; }
.channel-section-heading p { margin: 5px 0 0; color: #7a8780; font-size: 12px; line-height: 1.5; }
.field-hint { display: block; margin-top: 5px; color: #7a8780; font-size: 12px; line-height: 1.45; }
.channel-form-grid { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); column-gap: 18px; }
.required-column { color: var(--el-color-danger); }
.channel-form-grid :deep(.el-form-item) { margin-bottom: 10px; }
.channel-form-grid :deep(.el-form-item__label), .group-qr-form :deep(.el-form-item__label) { color: #68766e; font-size: 12px; }
.group-qr-layout { display: grid; grid-template-columns: minmax(0, 1fr) 220px; align-items: start; gap: 24px; }
.group-qr-form { min-width: 0; }
.group-qr-form :deep(.el-form-item) { max-width: 540px; margin-bottom: 12px; }
.group-qr-pending { display: grid; gap: 8px; margin-top: 14px; max-width: 540px; }
.group-qr-pending-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; }
.group-qr-pending-row :deep(.el-tag) { flex: 1 1 auto; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.group-qr-pending-row :deep(.el-button) { flex: none; }
.channel-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.fulfillment-error { display: block; max-width: 180px; overflow: hidden; color: #9d4944; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.price-change-list { display: grid; width: 100%; gap: 8px; }
.price-change-row { display: grid; grid-template-columns: minmax(160px, 1fr) 150px 42px; align-items: center; gap: 8px; }
.price-change-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price-change-row small { color: #7a8780; }
.group-qr-preview { display: flex; min-height: 210px; flex-direction: column; align-items: center; justify-content: center; padding: 12px; border: 1px solid var(--el-border-color-light); border-radius: 6px; background: var(--el-fill-color-lighter); }
.group-qr-image { width: 180px; height: 180px; }
.group-qr-caption { margin-top: 8px; color: #758179; font-size: 12px; }
.generated-codes { max-width: 100%; }
.lottery-qr { width: 92px; height: 92px; }
.subsection-head { display: flex; align-items: center; justify-content: space-between; margin: 22px 0 8px; color: #303133; font-weight: 600; }
.payment-reconcile-pagination { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.operations-page :deep(.el-table__empty-text) { position: relative; z-index: 2; width: auto; max-width: calc(100% - 24px); white-space: nowrap; }
@media (max-width: 600px) {
  .operations-page { padding: 12px; }
  .operations-page { overflow-x: hidden; }
  .dashboard-heading { padding: 14px 16px; }
  .operations-page :deep(.el-tabs__content) { padding: 14px 12px; }
  .trend-note { display: none; }
  .dashboard-heading { align-items: flex-start; }
  .dashboard-heading h2 { font-size: 20px; }
  .stat-value { font-size: 20px; }
  .operations-page :deep(.el-tabs__item) { padding: 0 12px; }
  .operations-page :deep(.el-form--inline) { align-items: stretch; }
  .operations-page :deep(.el-form--inline .el-form-item) { max-width: 100%; margin-right: 0; }
  .operations-page :deep(.el-form--inline .el-form-item__content) { min-width: 0; max-width: 100%; }
  .operations-page :deep(.el-form--inline .el-input),
  .operations-page :deep(.el-form--inline .el-input-number),
  .operations-page :deep(.el-form--inline .el-select),
  .operations-page :deep(.el-form--inline .el-date-editor) { max-width: 100%; }
  .operations-page :deep(.el-form--inline .el-button) { margin-left: 0; }
  .operations-page :deep(.el-table) { width: 100%; }
}
@media (max-width: 900px) { .channel-form-grid { grid-template-columns: repeat(2, minmax(160px, 1fr)); } }
@media (max-width: 900px) { .readiness-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 900px) {
  /* Keep dense operations tables readable on narrow screens. The fixed action
   * column stays available while the data columns can be swiped horizontally. */
  .operations-page :deep(.el-table) {
    overflow-x: auto;
    scrollbar-color: #b8c5bd transparent;
    scrollbar-width: thin;
  }
  .operations-page :deep(.el-table__inner-wrapper) {
    width: 100%;
    min-width: 0;
    overflow: visible;
  }
  .operations-page :deep(.el-table__header-wrapper) {
    overflow-x: auto;
    scrollbar-width: none;
  }
  .operations-page :deep(.el-table__header-wrapper::-webkit-scrollbar) { display: none; }
  .operations-page :deep(.el-table__body-wrapper) { overflow: visible; }
  .operations-page :deep(.el-table__body-wrapper .el-scrollbar),
  .operations-page :deep(.el-table__body-wrapper .el-scrollbar__wrap) { width: 100%; }
  .operations-page :deep(.el-table__body-wrapper .el-scrollbar__wrap) {
    overflow-x: auto !important;
    overflow-y: hidden;
  }
  .operations-page :deep(.el-table__body-wrapper .el-scrollbar__view) {
    width: max-content;
    min-width: 100%;
  }
  .operations-page :deep(.el-table__header),
  .operations-page :deep(.el-table__body) { min-width: max-content; }
  .operations-page :deep(.el-table__fixed-right) { box-shadow: -6px 0 12px rgba(24, 50, 40, .08); }
}
.operations-page :deep(.el-tabs--border-card) { box-shadow: 0 2px 8px rgba(32, 53, 44, .035); }
.operations-page :deep(.el-tabs__header) { border-bottom: 1px solid #e3e7e2; }
.operations-page :deep(.el-tabs__nav-wrap) { padding: 0 12px; }
.operations-page :deep(.el-tabs__item) {
  height: 46px;
  color: #68736d;
  transition: color .18s ease, background-color .18s ease;
}
.operations-page :deep(.el-tabs__item.is-active) {
  color: #8d3f39;
  background: #fff;
  border-top-color: #8d3f39;
}
.operations-page :deep(.el-tabs__content) { background: var(--el-bg-color-overlay); }
.operations-page :deep(.el-table th.el-table__cell) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.operations-page :deep(.el-table .el-table__row) { transition: background-color .18s ease; }
.operations-page :deep(.el-input__wrapper),
.operations-page :deep(.el-select__wrapper),
.operations-page :deep(.el-textarea__inner) { border-radius: 6px; }
.operations-page :deep(.el-button--primary) {
  --el-button-bg-color: #245a4a;
  --el-button-border-color: #245a4a;
  --el-button-hover-bg-color: #306e5b;
  --el-button-hover-border-color: #306e5b;
}
.stat-card.metric-draws { border-left-color: #9d4944; }
.trend-bar.draws, .trend-legend i.draws { background: #9d4944; }
.trend-bar.redemptions, .trend-legend i.redemptions { background: #4d8290; }
html.dark .operations-page .stat-card.metric-salesCent .stat-value,
html.dark .operations-page .stat-card.metric-commissionCent .stat-value { color: #d6ab5c; }
@media (max-width: 600px) {
  .operations-page :deep(.el-tabs__nav-wrap) { padding: 0 6px; }
  .operations-page :deep(.el-tabs__item) { padding: 0 10px; }
  .channel-form-grid { grid-template-columns: 1fr; }
  .group-qr-layout { grid-template-columns: 1fr; }
  .group-qr-preview { justify-self: start; width: 100%; max-width: 240px; }
  .channel-section-heading { align-items: flex-start; flex-direction: column; }
  .publish-status { justify-content: flex-start; }
  .publish-dialog-actions { flex-wrap: wrap; }
  .publish-dialog-actions span { flex-basis: 100%; }
  .readiness-grid { grid-template-columns: 1fr; }
  .readiness-panel { padding: 14px 15px; }
  .readiness-heading { flex-direction: column; gap: 8px; }
}

/* Element Plus dark mode changes the panel surface but the operations page has
 * branded light-mode accents; keep those accents readable on dark surfaces. */
html.dark .operations-page .dashboard-heading,
html.dark .operations-page .readiness-panel,
html.dark .operations-page :deep(.el-tabs--border-card) {
  background: #1d1e1f;
  border-color: #434343;
}
html.dark .operations-page .dashboard-heading { border-top-color: #d6ab5c; }
html.dark .operations-page .stat-card,
html.dark .operations-page .trend-card,
html.dark .operations-page :deep(.el-card) {
  background: #1b201e;
  border-color: #3b4841;
  box-shadow: 0 8px 22px rgba(0, 0, 0, .16);
}
html.dark .operations-page .stat-card.metric-salesCent,
html.dark .operations-page .stat-card.metric-commissionCent { border-left-color: #c59a57; }
html.dark .operations-page .stat-card.metric-draws { border-left-color: #b55c55; }
html.dark .operations-page .stat-card.metric-members { border-left-color: #83a99a; }
html.dark .operations-page .trend-card .trend-chart { border-bottom-color: #3b4841; }
html.dark .operations-page :deep(.el-table),
html.dark .operations-page :deep(.el-table tr),
html.dark .operations-page :deep(.el-table th.el-table__cell),
html.dark .operations-page :deep(.el-table td.el-table__cell) {
  background: #1b201e;
  border-color: #35423b;
  color: #dce6df;
}
html.dark .operations-page :deep(.el-table th.el-table__cell) { background: #252d28; color: #eef5ef; }
html.dark .operations-page :deep(.el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell) { background: #26332c; }
html.dark .operations-page .readiness-summary,
html.dark .operations-page .readiness-item,
html.dark .operations-page .readiness-progress,
html.dark .operations-page :deep(.el-tabs__header) {
  background: #242526;
  border-color: #434343;
}
html.dark .operations-page .readiness-heading h3,
html.dark .operations-page .readiness-item-top strong,
html.dark .operations-page .channel-section-heading h3,
html.dark .operations-page .schedule-heading,
html.dark .operations-page .subsection-head {
  color: #e4ece6;
}
html.dark .operations-page .readiness-heading p,
html.dark .operations-page .readiness-item p,
html.dark .operations-page .readiness-summary-item,
html.dark .operations-page .schedule-heading span,
html.dark .operations-page .schedule-foot,
html.dark .operations-page .field-hint,
html.dark .operations-page .channel-section-heading p {
  color: #b7c3bb;
}
html.dark .operations-page .readiness-item small,
html.dark .operations-page .readiness-progress small,
html.dark .operations-page .readiness-summary-item.verify b,
html.dark .operations-page .readiness-summary-item.pending b {
  color: #e0b765;
}
html.dark .operations-page .readiness-progress-track { background: #3b4841; }
html.dark .operations-page :deep(.el-tabs__item) { color: #b7c3bb; }
html.dark .operations-page :deep(.el-tabs__item.is-active) {
  color: #f0c875;
  background: #2b2d2e;
  border-top-color: #d6ab5c;
}
.ranking-finalization { margin: 20px 0; padding: 18px; border: 1px solid var(--el-border-color-light); border-radius: 10px; background: var(--el-fill-color-light); }
.ranking-period-table { margin-top: 16px; }
.inline-form-row, .cash-rule-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cash-rule-editor { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.cash-rule-row .el-input-number { width: 132px; }
.form-tip { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
</style>

import defaultSettings from '@/settings'
import { useDark, useToggle } from '@vueuse/core'
import { useDynamicTitle } from '@/utils/dynamicTitle'

// 运营后台默认使用浅色工作区，保证数据表格、趋势图和状态标签在首次打开时有清晰层级。
// 仍保留用户主动切换深色模式的能力，偏好会写入独立的后台主题存储键。
const isDark = useDark({
  storageKey: 'jinse-wine-admin-theme',
  initialValue: 'light'
})
const toggleDark = useToggle(isDark)

const { sideTheme, showSettings, navType, tagsView, tagsIcon, fixedHeader, sidebarLogo, dynamicTitle, footerVisible, footerContent } = defaultSettings

const storageSetting = JSON.parse(localStorage.getItem('layout-setting')) || ''
const brandTheme = '#245A4A'
const savedTheme = storageSetting.theme === '#409EFF' ? brandTheme : storageSetting.theme

const useSettingsStore = defineStore(
  'settings',
  {
    state: () => ({
      title: '',
      theme: savedTheme || brandTheme,
      sideTheme: storageSetting.sideTheme || sideTheme,
      showSettings: showSettings,
      navType: storageSetting.navType === undefined ? navType : storageSetting.navType,
      tagsView: storageSetting.tagsView === undefined ? tagsView : storageSetting.tagsView,
      tagsIcon: storageSetting.tagsIcon === undefined ? tagsIcon : storageSetting.tagsIcon,
      fixedHeader: storageSetting.fixedHeader === undefined ? fixedHeader : storageSetting.fixedHeader,
      sidebarLogo: storageSetting.sidebarLogo === undefined ? sidebarLogo : storageSetting.sidebarLogo,
      dynamicTitle: storageSetting.dynamicTitle === undefined ? dynamicTitle : storageSetting.dynamicTitle,
      footerVisible: storageSetting.footerVisible === undefined ? footerVisible : storageSetting.footerVisible,
      footerContent: footerContent,
      isDark: isDark.value
    }),
    actions: {
      // 修改布局设置
      changeSetting(data) {
        const { key, value } = data
        if (this.hasOwnProperty(key)) {
          this[key] = value
        }
      },
      // 设置网页标题
      setTitle(title) {
        this.title = title
        useDynamicTitle()
      },
      // 切换暗黑模式
      toggleTheme() {
        this.isDark = !this.isDark
        toggleDark()
      }
    }
  })

export default useSettingsStore

<template>
  <div class="login">
    <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
      <div class="login-brand" aria-label="金色酒业">
        <span class="brand-mark">金</span>
        <span class="brand-name">金色酒业</span>
      </div>
      <h3 class="title">{{ title }}</h3>
      <p class="login-subtitle">统一管理商品、订单与门店运营</p>
      <el-form-item prop="username">
        <el-input
          v-model="loginForm.username"
          type="text"
          size="large"
          auto-complete="off"
          placeholder="账号"
        >
          <template #prefix><svg-icon icon-class="user" class="el-input__icon input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          size="large"
          auto-complete="off"
          placeholder="密码"
          @keyup.enter="handleLogin"
        >
          <template #prefix><svg-icon icon-class="password" class="el-input__icon input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-checkbox v-model="loginForm.rememberMe" style="margin:0px 0px 25px 0px;">记住账号</el-checkbox>
      <el-form-item style="width:100%;">
        <el-button
          :loading="loading"
          size="large"
          type="primary"
          style="width:100%;"
          @click.prevent="handleLogin"
        >
          <span v-if="!loading">登录</span>
          <span v-else>登录中...</span>
        </el-button>
        <div style="float: right;" v-if="register">
          <router-link class="link-type" :to="'/register'">立即注册</router-link>
        </div>
      </el-form-item>
    </el-form>
    <!--  底部  -->
    <div class="el-login-footer">
      <span>{{ footerContent }}</span>
    </div>
  </div>
</template>

<script setup>
import Cookies from "js-cookie"
import useUserStore from '@/store/modules/user'
import defaultSettings from '@/settings'

const title = import.meta.env.VITE_APP_TITLE
const footerContent = defaultSettings.footerContent
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()

const loginForm = ref({
  username: "",
  password: "",
  rememberMe: false
})

const loginRules = {
  username: [{ required: true, trigger: "blur", message: "请输入您的账号" }],
  password: [{ required: true, trigger: "blur", message: "请输入您的密码" }]
}

const loading = ref(false)
// 注册开关
const register = ref(false)
const redirect = ref(undefined)

watch(route, (newRoute) => {
    redirect.value = newRoute.query && newRoute.query.redirect
}, { immediate: true })

function handleLogin() {
  proxy.$refs.loginRef.validate(valid => {
    if (valid) {
      loading.value = true
      // 仅保存账号，密码交由浏览器密码管理器处理
      if (loginForm.value.rememberMe) {
        Cookies.set("username", loginForm.value.username, { expires: 30 })
        Cookies.set("rememberMe", loginForm.value.rememberMe, { expires: 30 })
      } else {
        // 否则移除
        Cookies.remove("username")
        Cookies.remove("password")
        Cookies.remove("rememberMe")
      }
      Cookies.remove("password")
      // 调用action的登录方法
      userStore.login(loginForm.value).then(() => {
        const query = route.query
        const otherQueryParams = Object.keys(query).reduce((acc, cur) => {
          if (cur !== "redirect") {
            acc[cur] = query[cur]
          }
          return acc
        }, {})
        router.push({ path: redirect.value || "/index", query: otherQueryParams })
      }).catch(() => {
        loading.value = false
      })
    }
  })
}

function getCookie() {
  const username = Cookies.get("username")
  Cookies.remove("password")
  const rememberMe = Cookies.get("rememberMe")
  loginForm.value = {
    username: username === undefined ? loginForm.value.username : username,
    password: "",
    rememberMe: rememberMe === "true"
  }
}

getCookie()
</script>

<style lang='scss' scoped>
.login {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-image: url("../assets/images/login-background.jpg");
  background-size: cover;
  background-position: center;
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(11, 35, 28, 0.58);
  }
}
.login-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-bottom: 14px;
  color: #173c30;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 1px;
}
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #b28a4d;
  border-radius: 50%;
  color: #b28a4d;
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 18px;
}
.title {
  margin: 0 auto 7px;
  text-align: center;
  color: #173c30;
  font-size: 24px;
  font-weight: 600;
}
.login-subtitle {
  margin: 0 0 28px;
  color: #7c857f;
  font-size: 13px;
  text-align: center;
}

.login-form {
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  width: 420px;
  padding: 30px 32px 12px;
  z-index: 1;
  box-shadow: 0 22px 55px rgba(0, 0, 0, 0.24);
  .el-input {
    height: 44px;
    input {
      height: 44px;
    }
  }
  .input-icon {
    height: 42px;
    width: 14px;
    margin-left: 0px;
  }
  :deep(.el-input__wrapper) {
    border-radius: 8px;
    background: #f8faf7;
    box-shadow: 0 0 0 1px #e5e7e2 inset;
  }
  :deep(.el-input__inner) {
    color: #24372e;
  }
  :deep(.el-input__inner::placeholder) {
    color: #9aa39d;
  }
  :deep(.el-input__prefix-inner) {
    color: #738078;
  }
  :deep(.el-checkbox__label) {
    color: #68756d;
  }
  :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    border-color: #245a4a;
    background: #245a4a;
  }
  :deep(.el-button--primary) {
    border: 0;
    border-radius: 8px;
    background: #a47a3f;
    box-shadow: 0 7px 16px rgba(164, 122, 63, 0.22);
  }
  :deep(.el-button--primary:hover) {
    background: #8e6735;
  }
}
.login-tip {
  font-size: 13px;
  text-align: center;
  color: #bfbfbf;
}
.el-login-footer {
  height: 40px;
  line-height: 40px;
  position: fixed;
  bottom: 0;
  width: 100%;
  text-align: center;
  color: #fff;
  font-family: Arial;
  font-size: 12px;
  letter-spacing: 1px;
}
</style>

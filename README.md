# jinse-wine-admin

金色酒业 Web 管理后台，基于 Vue 3 和 Element Plus 实现运营人员使用的管理界面。

## 项目简介

本项目基于 RuoYi-Vue3 3.9.1，现有页面包含登录注册、个人中心、用户、角色、菜单、部门、岗位、字典、参数、公告、操作日志、登录日志、在线用户及服务器/缓存监控，并提供动态路由、权限指令、多页签和布局设置。

当前为系统管理基础工程，商品、订单、营销活动、积分与红包等酒业专属管理页面尚未开发。定时任务页面源码仍保留，但关联后端的 Quartz 模块处于停用状态，需启用对应后端后才能使用。

## 技术栈

- Vue 3.5.26、JavaScript（当前不是 TypeScript 项目）。
- Vite 6.4.1、Element Plus 2.13.1、Sass。
- Vue Router 4.6.4、Pinia 3.0.4、Axios 1.13.2。
- ECharts 5.6、VueUse、Quill 富文本编辑器、SVG 图标。

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| jinse-wine-backend | 后端服务 | [jinse-wine-backend](https://github.com/jiangyi3265/jinse-wine-backend) |
| jinse-wine-admin | 管理后台 | [jinse-wine-admin](https://github.com/jiangyi3265/jinse-wine-admin) |
| jinse-wine-app | 用户端 | [jinse-wine-app](https://github.com/jiangyi3265/jinse-wine-app) |

本管理端通过 `jinse-wine-backend` 的系统 API 工作；`jinse-wine-app` 提供用户端演示页面，后续三端将围绕酒业业务联调。

## 快速启动

准备 Node.js 22 或 24 和 npm，先启动后端。首次克隆时复制开发环境示例：

```powershell
Copy-Item config/examples/development.env.example .env.development
npm ci
npm run dev
```

默认开发端口为 `80`，`/dev-api` 代理到 `http://localhost:8080`，配置见 `vite.config.js`。如端口占用，可运行 `npm run dev -- --port 5174`。首次登录使用自己在后端初始化的账号和密码；登录页不预填口令，仅支持记住账号。

生产构建：

```powershell
Copy-Item config/examples/production.env.example .env.production
npm run build:prod
```

产物位于 `dist/`。部署服务需配置 `/prod-api` 的后端反向代理及 history 路由回退。测试环境命令为 `npm run build:stage`，对应 `config/examples/staging.env.example`。`npm run preview` 可本地查看构建结果，但仍需自行配置可访问的后端接口。

## 项目结构

```text
src/api/           系统与监控接口封装
src/views/         登录、个人中心、系统管理和监控页面
src/layout/        导航、侧栏、页签和整体布局
src/router/        路由及权限页面
src/store/         Pinia 用户、权限、布局状态
src/components/    表格工具栏、上传、编辑器等通用组件
src/directive/     权限等自定义指令
src/utils/         请求、认证、字典和通用工具
vite/              构建插件配置
config/examples/   不含密钥的环境示例
public/            静态资源
```

## 简历描述示例

参与金色酒业管理后台基础工程整理，基于 Vue 3、Element Plus 和 Pinia 维护系统管理页面、动态权限路由与 API 请求层；清理默认登录口令与密码 Cookie 存储，建立分环境配置和独立仓库。

此描述限于现有基础工程与实际贡献，不包含尚未开发的商品、订单和营销后台功能。

## 配置与许可

`.env` 及所有 `.env.*` 本地配置均不入库，使用 `config/examples/` 中的示例初始化。`VITE_*` 变量会进入浏览器，不能放入服务端 Secret 或私钥。原有内嵌密钥的 `src/utils/jsencrypt.js` 保留在本地但已排除且不再被登录页引用。依赖目录、构建结果、IDE 配置和日志均已忽略。

保留上游 RuoYi 的 MIT 许可与版权声明，见 [LICENSE](LICENSE)。

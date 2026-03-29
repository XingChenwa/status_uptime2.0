# PulseBoard

[English](./README.md) | **中文**

自托管、实时服务监控状态页面。监控 HTTP 接口、TCP 端口和 Ping（ICMP）——一切尽在美观、响应式的仪表板中。

![PulseBoard 截图](https://via.placeholder.com/900x500?text=PulseBoard+Screenshot)

## 功能特性

- **多协议监控** — HTTP/HTTPS、TCP 端口、Ping（ICMP）
- **90 天在线率历史** — 每日柱状图，悬停显示详细信息
- **事件管理** — 创建事件、追加时间线更新、跟踪处理进度
- **管理员身份验证** — 邮件 OTP 登录
- **站点自定义** — 站点名称、描述、刷新间隔、数据保留天数
- **深色 / 浅色主题** — 跟随系统偏好或手动切换
- **国际化** — 内置英文和中文支持
- **隐藏 Host/IP** — 每个服务可单独设置是否对公众隐藏内部地址
- **响应式 UI** — 支持桌面端和移动端

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18 + Vite + TailwindCSS |
| 后端 | Node.js + Express |
| 数据库 | sql.js（SQLite，无需原生依赖） |
| 认证 | 邮件 OTP（Nodemailer） |
| 图标 | Lucide React |
| 国际化 | i18next |

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装

```bash
git clone https://github.com/XingChenwa/status_uptime2.0.git
cd status_uptime2.0
npm install
```

### 开发模式

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001

### 生产构建

```bash
npm run build   # 将前端构建到 dist/
npm start       # 在 :3001 端口同时托管前后端
```

## 初始配置

首次运行后，访问 `http://localhost:3001/sadmin` 完成初始化：

1. 配置 SMTP 服务器以发送邮件
2. 设置管理员邮箱地址
3. 通过发送到邮箱的 OTP 验证码登录

站点设置（名称、描述、刷新间隔等）可在管理员仪表板中修改。

## 项目结构

```
pulseboard/
├── public/
│   └── favicon.svg          # 站点图标
├── src/
│   ├── components/
│   │   ├── ConfirmDialog.jsx # 通用确认弹窗
│   │   ├── Header.jsx        # 顶部导航栏
│   │   ├── ServiceCard.jsx   # 服务状态卡片
│   │   ├── ServiceModal.jsx  # 添加 / 编辑服务弹窗
│   │   ├── SettingsModal.jsx # 站点设置弹窗
│   │   └── UptimeBar.jsx     # 90 天在线率柱状图
│   ├── contexts/
│   │   ├── AuthContext.jsx   # 管理员认证状态
│   │   └── ThemeContext.jsx  # 深色 / 浅色主题
│   ├── i18n/
│   │   ├── index.js          # i18next 配置
│   │   └── locales/
│   │       ├── en.json       # 英文翻译
│   │       └── zh.json       # 中文翻译
│   ├── pages/
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminLogin.jsx
│   │   ├── AdminPage.jsx
│   │   ├── AdminSetup.jsx
│   │   └── StatusPage.jsx    # 主状态页面（公开）
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── server.js                 # Express API + 定时检测
├── status.db                 # SQLite 数据库（自动创建）
├── package.json
└── vite.config.js
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3001` | 服务器监听端口 |

## 数据存储

所有数据持久化存储在项目根目录的 `status.db` 文件中（sql.js SQLite）。请定期备份此文件以保留服务历史记录和配置。

## 开源协议

MIT © [XingChenwa](https://github.com/XingChenwa/status_uptime2.0/blob/main/LICENSE)

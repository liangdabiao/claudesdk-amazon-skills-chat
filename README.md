# AmazonSkillsChat — AI 亚马逊卖家全链路助手

基于 **Claude Agent SDK** 的亚马逊卖家全链路 AI 助手。集成 **54 个专业技能**，通过自然语言对话即可完成选品调研、关键词挖掘、Listing 优化、FBA 费用计算、PPC 广告等全链路工作。

## 架构

```
用户浏览器 ←WebSocket→ Express Server ←→ Claude Agent SDK ←→ 54 个 Amazon Skills
                          │                              │
                    reports/                    Playwright MCP + WebSearch
                   (分析报告)                  + Bash/Python 脚本
```

## 核心技能

### 🎯 一站式调研（Playwright 浏览器自动化）

| 技能 | 输入 | 输出 |
|------|------|------|
| **amazon-one-shot** | ASIN 或 Amazon URL | 9 份报告（产品信息/关键词/竞品/评论/销量/Listing/图片/模板/选品评分） |
| **amazon-category-research** | Best Sellers URL | 5 份报告（利基/竞品/SEO/利润/综合） |
| **amazon-store-research** | Store URL | 5 份报告（产品组合/竞争/营收/增长/综合） |

### 🔍 关键词与选品

| 技能 | 说明 |
|------|------|
| **amazon-keyword-research** ✅ | 长尾关键词挖掘（100-200词）+ 竞争分析 + 机会评分，12 个市场 |
| amazon-trending-products | 热门产品趋势、BSR 模式、新兴利基 |
| amazon-product-research | 产品研究与机会分析 |
| amazon-niche-finder | 利基市场发现 |
| amazon-seller-analytics | 卖家店铺分析 |

### 📝 Listing 优化

| 技能 | 说明 |
|------|------|
| **amazon-listing-optimization** ✅ | 创建/优化 Listing，8 维度评分，竞品关键词提取 |
| amazon-a-plus-content | A+ 内容规划 |
| amazon-backend-keywords | 后台搜索词优化（250 字节限制） |
| amazon-search-optimization | A9 算法排名优化 |
| amazon-listing-images | 产品图片策划 |

### 💰 费用与利润

| 技能 | 说明 |
|------|------|
| **amazon-fba-calculator** ✅ | FBA 费用明细（尺寸层级/仓储/推荐费）+ 利润分析 |
| **tariff-calculator-amazon** ✅ | 关税计算 + 到岸成本（全球贸易路线） |
| amazon-profit-analyzer | 综合利润分析 |
| amazon-repricing-strategy | 重新定价策略 |
| amazon-buy-box | Buy Box 策略 |
| amazon-deal-finder | 促销规划 |
| amazon-shipping-calculator | 物流成本计算 |

### 📢 广告

| 技能 | 说明 |
|------|------|
| **amazon-ppc-campaign** ✅ | PPC 广告结构搭建 + ACoS 目标 + 出价策略 |
| amazon-advertising-strategy | 综合广告策略 |
| amazon-negative-keywords | 否定关键词管理 |
| amazon-display-ads | Sponsored Display 广告 |

### 📊 分析与监控

| 技能 | 说明 |
|------|------|
| **amazon-sales-estimator** ✅ | BSR → 月销量估算，3 种模式 |
| amazon-rank-tracker | 关键词排名追踪 |
| amazon-review-analyzer | 评论深度分析 |
| amazon-competitor-analysis | 竞品全景分析 |

### 🚀 扩展

| 技能 | 说明 |
|------|------|
| amazon-global-selling | 国际市场扩展 |
| amazon-fba-prep | FBA 备货指南 |

> ✅ = 生产就绪 | 其余 = Beta 功能可用

## 快速开始

### 1. 环境要求

- Node.js >= 18
- Python 3（FBA 计算器 / 关税计算器）
- curl（关键词研究脚本）

### 2. 配置环境变量

```env
ANTHROPIC_API_KEY=your-key
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
MODEL=deepseek-v4-flash
PORT=3014
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动开发模式

```bash
npm run dev
```

访问 Vite 显示的地址（自动代理到 3014 端口）。

### 5. 生产构建

```bash
npm run build
npm start
```

访问 `http://localhost:3014`。

## 使用方式

### 自然语言对话

直接输入需求，AI 自动选择合适的技能：

```
深度调研 B07PWTJ4H1
```
```
研究关键词 "portable blender" 在亚马逊美国的机会
```
```
帮我计算 FBA 费用：售价 $29.99，成本 $8，重量 1.2 磅
```
```
帮我搭建 PPC 广告结构，产品 B0D72TSM62，预算 $50/天
```

### 欢迎模板

首页提供 6 个快捷入口：

| 模板 | 用途 |
|------|------|
| 🎯 一站式调研 | 输入 ASIN，生成 9 份深度分析报告 |
| 🔍 关键词研究 | 挖掘长尾词 + 机会评分 |
| 📝 Listing 优化 | 创建或优化产品 Listing |
| 💰 FBA 计算 | 费用明细 + 利润分析 |
| 📊 销量估算 | 估算月销量和营收 |
| 📢 PPC 广告 | 搭建广告结构 + 出价策略 |

### 报告查看

- 左侧边栏实时展示 `reports/` 目录下的分析报告
- 点击文件名即可预览内容
- 支持复制文件内容

## 支持的亚马逊市场

🇺🇸 US · 🇬🇧 UK · 🇩🇪 DE · 🇫🇷 FR · 🇮🇹 IT · 🇪🇸 ES · 🇯🇵 JP · 🇨🇦 CA · 🇦🇺 AU · 🇮🇳 IN · 🇲🇽 MX · 🇧🇷 BR

## MCP 配置

`amazon-one-shot`、`category-research`、`store-research` 需要 Playwright MCP 进行浏览器自动化（已配置在 `.claude/settings.json`）：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-playwright"]
    }
  }
}
```

## 项目结构

```
amazon-skills-chat/
├── .claude/
│   ├── settings.json              # Playwright MCP 配置
│   └── skills/                    # 54 个 Amazon 技能
│       ├── amazon-one-shot/
│       ├── amazon-keyword-research/
│       │   └── scripts/research.sh
│       ├── amazon-fba-calculator/
│       │   └── scripts/calculator.py
│       ├── amazon-listing-optimization/
│       ├── ... (54 个技能)
├── server/
│   ├── index.ts                   # Express + WebSocket (port 3014)
│   ├── agent-client.ts            # Claude Agent SDK 封装
│   ├── message-queue.ts           # 消息队列
│   └── logger.ts                  # 文件日志
├── src/
│   ├── App.tsx                    # 三栏 Amazon 橙色主题
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   └── useFileUpload.ts
│   └── types.ts
├── reports/                       # 分析报告（自动创建）
├── uploads/                       # 上传文件（自动创建）
├── .env                           # API Key + Model
└── package.json
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Claude Agent SDK | ^0.1.11 | AI Agent 调度 + 技能系统 |
| Playwright MCP | latest | 浏览器自动化（产品页面抓取） |
| Express | ^4.21 | HTTP + WebSocket 服务器 |
| React | ^18.3 | 前端 UI |
| Tailwind CSS | ^4.0 | Amazon 橙色主题样式 |
| Vite | ^6.0 | 构建工具 |
| TypeScript | ^5.7 | 类型安全 |

## 注意事项

- **Playwright 必需**：一站式调研 / 品类调研 / 店铺调研 依赖浏览器自动化
- **Python 3 环境**：FBA 计算器和关税计算器使用 Python 3 stdlib
- **curl 依赖**：关键词研究脚本使用 curl 调用 Amazon autocomplete
- 所有分析报告使用 **中文（简体）** 输出
- 技能来源：[Amazon-Skills-n](https://github.com/nexscope-ai/Amazon-Skills)

## 感谢和参考

https://linux.do/  感谢佬友

https://github.com/liangdabiao/claudesdk-skill  AI生成claude-agent-sdk 项目

# 群聊年度报告生成器

将微信群聊数据转换为精美的可视化 HTML 年度报告，支持 AI 增强生成创意内容。

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

## ✨ 功能特性

- 📊 **多维度数据分析**：消息统计、用户活跃度、时间分布、词频分析
- 🎨 **精美可视化报告**：带动画效果的 HTML 报告，ECharts 图表 + 词云
- 🤖 **AI 增强内容**（可选）：
  - 热点事件解读与标题生成
  - 月度主题总结
  - 年度奖项颁奖词
  - 群友画像生成
  - 年度金句精选
  - 群聊情感分析

## 🚀 快速开始

### 前置要求

- Node.js 18+
- 微信群聊导出的 JSON 数据文件（通过 EchoTrace 导出）

### 第一步：导出微信聊天记录

本项目需要使用 [EchoTrace](https://github.com/ycccccccy/echotrace) 导出微信群聊数据。

EchoTrace 是一个本地、安全的微信聊天记录导出工具，特点：
- 🔒 **完全本地运行**，数据不会上传到任何服务器
- 💻 **跨平台支持** Windows / macOS
- 📦 **一键导出** JSON 格式数据

#### 导出步骤

1. 前往 [EchoTrace Releases](https://github.com/ycccccccy/echotrace/releases) 下载最新版本
2. 运行 EchoTrace，登录微信账号
3. 选择要导出的群聊
4. 导出为 JSON 格式
5. 将导出的 JSON 文件重命名为 `data.json`，放置到本项目根目录

> 💡 详细使用说明请参考 [EchoTrace 文档](https://github.com/ycccccccy/echotrace)

### 第二步：安装本项目

```bash
# 克隆项目
git clone https://github.com/kianaaaaaa/wechat-group-report.git
cd wechat-group-report

# 无需安装依赖（纯 Node.js 原生模块）
```

### 第三步：确认数据格式

EchoTrace 导出的 JSON 文件格式如下（本项目已完全兼容）：
```json
{
  "session": {
    "displayName": "群聊名称"
  },
  "messages": [
    {
      "localId": 1,
      "createTime": 1755139838,
      "formattedTime": "2025-08-14 10:50:38",
      "type": "文本消息",
      "content": "消息内容",
      "senderDisplayName": "发送者昵称"
    }
  ]
}
```

### 第四步：生成报告

1. 复制并配置环境变量：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入 OpenAI API 配置：

```bash
OPENAI_BASE_URL="https://api.openai.com"  # 或第三方代理地址
OPENAI_API_KEY="sk-xxx"                    # 你的 API Key
OPENAI_MODEL="gpt-4o-mini"                 # 模型名称
```

3. 一键生成：

```bash
node run-all.js
```

执行流程：
1. 生成任务包 → 分析数据并创建 AI 任务
2. 调用 AI API → 批量处理所有任务
3. 生成报告 → 整合 AI 内容到最终报告

## 📁 项目结构

```
年度报告/
├── run-all.js              # 一键执行脚本（推荐入口）
├── index.html              # 生成的报告预览
├── data.json               # 输入数据文件
├── .env.example            # 环境变量模板
├── .env                    # 环境变量配置（需自行创建）
├── src/
│   ├── index.js            # 报告生成主入口
│   ├── config.js           # 配置模块
│   ├── analyzer/
│   │   └── ChatAnalyzer.js # 数据分析器
│   ├── generator/
│   │   ├── ReportGenerator.js  # 报告生成器
│   │   ├── css.js          # CSS 样式
│   │   ├── sections.js     # HTML 段落
│   │   └── js.js           # JavaScript 代码
│   └── ai/
│       ├── generate-batch.js       # 生成 AI 任务包
│       ├── process-events-sync.js  # 调用 AI API
│       ├── parse-batch-output.js   # 解析 AI 输出
│       ├── prompts.js              # Prompt 定义
│       └── README.md               # AI 模块详细文档
└── ai/
    ├── all_packs.json      # 所有任务数据包
    ├── batch_all.jsonl     # API 请求输入
    └── batch_output.jsonl  # API 输出结果
```

## ⚙️ 配置说明

### 基础配置

通过环境变量或直接修改 `src/config.js`：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `INPUT_FILE` | `data.json` | 输入数据文件名 |
| `OUTPUT_FILE` | `index.html` | 输出报告文件名 |
| `TARGET_YEAR` | `2025` | 统计的目标年份 |

### AI 配置

在 `.env` 文件中配置：

| 变量名 | 说明 |
|--------|------|
| `OPENAI_BASE_URL` | API 地址（支持第三方代理） |
| `OPENAI_API_KEY` | API 密钥 |
| `OPENAI_MODEL` | 模型名称 |
| `AI_STYLE` | 风格：`roast`（毒舌）/ `normal`（正常） |
| `AI_ROAST_LEVEL` | 毒舌程度 1-5 |
| `AI_CONCURRENCY` | 并发请求数 |

更多 AI 配置请参考 [AI 模块文档](src/ai/README.md)。

## 🔥 毒舌模式

设置 `AI_STYLE=roast` 启用孙笑川贴吧老哥风格：

- 使用抽象话 / 贴吧梗
- 适度调侃但不人身攻击
- 可用经典梗：太典了🐔、带带、寄、似友等

通过 `AI_ROAST_LEVEL` 控制毒舌程度（1-5）。

## 🛠️ 分步执行

如需单独执行某个步骤：

```bash
# 仅生成任务包
node src/ai/generate-batch.js

# 仅调用 AI API
node src/ai/process-events-sync.js

# 仅生成报告
node src/index.js
```

## ❓ 常见问题

### Q: 报告生成失败提示找不到文件？
A: 检查 `data.json` 是否存在于项目根目录，或通过环境变量 `INPUT_FILE` 指定正确路径。

### Q: 如何统计其他年份的数据？
A: 设置环境变量 `TARGET_YEAR=2024` 或修改 `src/config.js`。

### Q: AI 调用超时怎么办？
A: 增大 `OPENAI_HTTP_TIMEOUT_MS` 的值（默认 20 分钟），或检查网络连接。

### Q: 词云显示的词不准确？
A: 在 `src/config.js` 的 `STOP_WORDS` 中添加需要过滤的词。

### Q: 如何自定义报告样式？
A: 编辑 `src/generator/css.js` 中的样式函数。

## 🔗 相关项目

- [EchoTrace](https://github.com/ycccccccy/echotrace) - 微信聊天记录导出工具（数据来源）

## 📄 License

MIT

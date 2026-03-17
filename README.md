# AI Requirement Assistant

用于练习 AI 应用开发的 Next.js 项目骨架，当前阶段目标是完成第一次模型调用，并为后续的需求拆解助手做准备。

## Current Stack

- Next.js App Router
- TypeScript
- Tailwind CSS 4
- OpenAI Responses API

## Run Locally

1. 安装依赖

```bash
npm install
```

2. 创建环境变量文件

```bash
copy .env.example .env.local
```

3. 在 `.env.local` 中填写 `OPENAI_API_KEY`

4. 启动开发环境

```bash
npm run dev
```

5. 打开 [http://localhost:3000](http://localhost:3000)

## Current Structure

```txt
src/
  app/
    api/
      chat/
        route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    chat/
    common/
  lib/
  types/
```

## Current Goal

- 完成服务端环境变量配置
- 打通 `POST /api/chat`
- 从页面发送输入并显示模型返回
- 记录输入、输出、错误

# ---------- 阶段 1: 安装依赖 ----------
FROM node:22-alpine AS deps
WORKDIR /app

# pnpm 的版本由 package.json 的 packageManager 字段钉住(11.17.0),
# 所以这里只 enable。prepare pnpm@latest 既不可复现,也会被 corepack
# 按 packageManager 覆盖掉,等于白做一步。
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# 只复制依赖声明文件,利用 Docker 缓存层。
# pnpm-workspace.yaml 必须一起复制: 它的 allowBuilds 决定 esbuild、@swc/core
# 这类原生依赖是否允许执行构建脚本。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# ---------- 阶段 2: 构建项目 ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.ts 只在这个变量为 "true" 时才输出 standalone 产物,而阶段 3
# 拷贝的正是 .next/standalone —— 漏掉它,构建会在那一步因源路径不存在而失败。
ENV DOCKER_BUILD=true

# NEXT_PUBLIC_* 是构建时内联的,必须在 build 之前就位: 缺了它们
# lib/sanity/client.ts 拿不到 projectId,getSanityClient() 返回 null,
# 画廊会静默退回 data/artworks.json 的兜底数据 —— 一个看起来正常、
# 实际上没连 CMS 的镜像。两个值都不是密钥(sanity/sanity.config.ts 里
# 同样是硬编码的),所以给默认值让 docker build 开箱可用;换数据集时用
# --build-arg NEXT_PUBLIC_SANITY_DATASET=... 覆盖。
ARG NEXT_PUBLIC_SANITY_PROJECT_ID=s3wn2p8r
ARG NEXT_PUBLIC_SANITY_DATASET=production
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID
ENV NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET

RUN pnpm build

# ---------- 阶段 3: 生产运行环境 ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户,提升安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 只拷贝运行所需的产物(Next.js standalone 模式)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 服务端密钥(ESV_API_KEY、SANITY_REVALIDATE_SECRET 等)只在运行时注入,
# 不打进镜像层: docker run -e ... 或 compose 的 env_file。
CMD ["node", "server.js"]

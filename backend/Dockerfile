# 使用跨平台基础镜像（支持 ARM 和 X86）
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 编译 TypeScript
RUN npm run build

# 生产阶段
FROM --platform=$TARGETPLATFORM node:20-alpine AS production

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm install --only=production

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 8042

# 启动应用
CMD ["node", "dist/main"]

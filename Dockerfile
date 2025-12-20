# 前端 Dockerfile - Node.js 部署方案
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build

# 生產階段
FROM node:18-alpine

WORKDIR /app

# 安裝 serve 來提供靜態文件
RUN npm install -g serve

# 從 builder 階段複製構建結果
COPY --from=builder /app/build ./build

# 暴露端口
EXPOSE 3000

# 啟動應用
CMD ["serve", "-s", "build", "-l", "3000"]

# 前端 Dockerfile - Node.js 部署方案
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝所有依賴（包括 devDependencies，構建時需要）
RUN npm ci

# 複製源代碼
COPY . .

# 接收構建時的環境變數
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# 構建應用（環境變數會被編譯進 JavaScript）
RUN npm run build

# 生產階段
FROM node:18-alpine

WORKDIR /app

# 安裝 wget（用於健康檢查）和 serve
RUN apk add --no-cache wget && \
    npm install -g serve

# 從 builder 階段複製構建結果
COPY --from=builder /app/build ./build

# 暴露端口（Zeabur 會動態分配）
EXPOSE 3000

# 啟動應用（使用環境變數 PORT，默認 3000）
CMD serve -s build -l ${PORT:-3000}

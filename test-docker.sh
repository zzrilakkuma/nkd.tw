#!/bin/bash
# 測試前端 Docker 構建腳本

echo "🔨 開始構建 Docker 鏡像..."
docker build -t hookah-frontend:test .

if [ $? -eq 0 ]; then
    echo "✅ 構建成功！"
    echo ""
    echo "🚀 啟動容器測試..."
    docker run -p 3000:3000 --name hookah-test hookah-frontend:test
else
    echo "❌ 構建失敗，請檢查錯誤信息"
    exit 1
fi

# 清理
# docker rm -f hookah-test
# docker rmi hookah-frontend:test

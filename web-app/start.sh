#!/bin/bash

echo "🚀 啟動翻譯管理系統 Web 介面..."

# 檢查 Node.js 版本
NODE_VERSION=$(node -v)
echo "✅ Node.js 版本檢查通過: $NODE_VERSION"

# 檢查是否為部署模式
if [ "$1" = "deploy" ]; then
    echo "📦 部署模式：安裝依賴..."
    npm install
    
    echo "📦 安裝前端依賴..."
    cd client
    npm install
    
    echo "🔨 建置前端..."
    npm run build
    cd ..
    
    echo "✅ 部署完成！"
    echo "🌐 啟動 Web 伺服器..."
    echo "📱 開啟瀏覽器訪問: http://localhost:3001"
    echo "🛑 按 Ctrl+C 停止伺服器"
    
    node server.js
else
    echo "📦 安裝後端依賴..."
    npm install
    
    echo "📦 安裝前端依賴..."
    cd client
    npm install
    
    echo "🔨 建置前端..."
    npm run build
    cd ..
    
    echo "✅ 安裝完成！"
    echo "🌐 啟動 Web 伺服器..."
    echo "📱 開啟瀏覽器訪問: http://localhost:3001"
    echo "🛑 按 Ctrl+C 停止伺服器"
    
    npm start 
#!/bin/bash

# 检查 .gitignore 是否正确工作

echo "🔍 检查 .gitignore 配置..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查计数
ISSUES=0

# 1. 检查 node_modules
echo "📦 检查 node_modules..."
NODE_MODULES_COUNT=$(git ls-files | grep "node_modules" | wc -l | xargs)
if [ "$NODE_MODULES_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ node_modules 已正确忽略${NC}"
else
    echo -e "${RED}❌ 发现 $NODE_MODULES_COUNT 个 node_modules 文件被跟踪${NC}"
    git ls-files | grep "node_modules" | head -5
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 2. 检查环境变量文件
echo "🔐 检查环境变量文件..."
ENV_COUNT=$(git ls-files | grep -E "\.env$|\.env\.local|\.env\.development$|\.env\.production$|\.env\.staging$|\.dev\.vars" | grep -v "\.env\.example" | wc -l | xargs)
if [ "$ENV_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 环境变量文件已正确忽略${NC}"
else
    echo -e "${RED}❌ 发现 $ENV_COUNT 个环境变量文件被跟踪${NC}"
    git ls-files | grep -E "\.env" | grep -v "\.env\.example"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 3. 检查 .DS_Store
echo "🍎 检查 .DS_Store..."
DS_STORE_COUNT=$(git ls-files | grep "\.DS_Store" | wc -l | xargs)
if [ "$DS_STORE_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ .DS_Store 已正确忽略${NC}"
else
    echo -e "${RED}❌ 发现 $DS_STORE_COUNT 个 .DS_Store 文件被跟踪${NC}"
    git ls-files | grep "\.DS_Store"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 4. 检查构建文件
echo "🏗️  检查构建文件..."
BUILD_COUNT=$(git ls-files | grep -E "dist/|build/|\.wrangler/|target/release/|target/debug/" | wc -l | xargs)
if [ "$BUILD_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 构建文件已正确忽略${NC}"
else
    echo -e "${YELLOW}⚠️  发现 $BUILD_COUNT 个构建文件被跟踪${NC}"
    git ls-files | grep -E "dist/|build/|\.wrangler/|target/" | head -5
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 5. 检查日志文件
echo "📝 检查日志文件..."
LOG_COUNT=$(git ls-files | grep "\.log$" | wc -l | xargs)
if [ "$LOG_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 日志文件已正确忽略${NC}"
else
    echo -e "${RED}❌ 发现 $LOG_COUNT 个日志文件被跟踪${NC}"
    git ls-files | grep "\.log$"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 6. 测试 .gitignore 规则
echo "🧪 测试 .gitignore 规则..."
echo ""

# 测试常见文件
TEST_FILES=(
    "node_modules/test"
    ".env"
    ".env.local"
    ".DS_Store"
    "dist/test"
    "target/debug/test"
    ".wrangler/test"
    "test.log"
)

ALL_IGNORED=true
for file in "${TEST_FILES[@]}"; do
    if git check-ignore -q "$file"; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo -e "${RED}❌${NC} $file"
        ALL_IGNORED=false
    fi
done
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ISSUES" -eq 0 ] && [ "$ALL_IGNORED" = true ]; then
    echo -e "${GREEN}🎉 .gitignore 配置正确!${NC}"
    echo ""
    echo "所有应该被忽略的文件都已正确配置。"
    exit 0
else
    echo -e "${RED}⚠️  发现 $ISSUES 个问题${NC}"
    echo ""
    echo "建议运行以下命令修复:"
    echo ""
    echo "  # 清理所有缓存并重新应用 .gitignore"
    echo "  git rm -r --cached ."
    echo "  git add ."
    echo "  git commit -m \"fix: 重新应用 .gitignore\""
    echo ""
    exit 1
fi

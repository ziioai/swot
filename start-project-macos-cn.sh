#!/bin/bash

echo "正在检查 Node.js 是否已安装..."
if ! command -v node &> /dev/null; then
    echo ""
    echo "Node.js 未安装。"
    echo "请访问 https://nodejs.org/ 下载并安装 Node.js (推荐 LTS 版本)。"
    echo "对于 macOS 用户，您也可以考虑使用 Homebrew: brew install node"
    echo "安装完成后，请打开新的终端窗口并重新运行此脚本。"
    echo ""
    exit 1
fi
echo "Node.js 已安装: $(node -v)"

echo ""
echo "正在检查 npm 是否已安装..."
if ! command -v npm &> /dev/null; then
    echo ""
    echo "npm 未安装。这通常与 Node.js 一起安装。"
    echo "请确保 Node.js 已正确安装，或者尝试重新安装 Node.js。"
    echo "安装完成后，请打开新的终端窗口并重新运行此脚本。"
    echo ""
    exit 1
fi
echo "npm 已安装: $(npm -v)"

echo ""
echo "正在检查 pnpm 是否已安装..."
if ! command -v pnpm &> /dev/null; then
    echo ""
    echo "pnpm 未安装。"
    read -p "是否要尝试使用 npm 全局安装 pnpm? (y/N): " choice
    case "$choice" in
      y|Y )
        echo ""
        echo "正在全局安装 pnpm (npm install -g pnpm)..."
        if npm install -g pnpm; then
            echo "pnpm 安装成功。"
            echo "请注意：新安装的 pnpm 可能需要打开一个新的终端窗口才能使用。"
            echo "如果后续步骤失败，请尝试打开新的终端，然后重新运行此脚本。"
            # Attempt to find pnpm again in common global paths if not immediately available
            if ! command -v pnpm &> /dev/null; then
                 export PATH="$HOME/.local/bin:$PATH" # Common user global path
                 if ! command -v pnpm &> /dev/null && [ -d "$(npm get prefix)/bin" ]; then
                    export PATH="$(npm get prefix)/bin:$PATH" # npm global bin
                 fi
            fi
            if ! command -v pnpm &> /dev/null; then
                echo "pnpm 已安装，但可能未在当前终端的 PATH 中。"
                echo "请尝试打开一个新的终端窗口并重新运行此脚本，或将 pnpm 的全局安装路径添加到您的 PATH 环境变量中。"
            fi
            echo ""
        else
            echo ""
            echo "pnpm 安装失败。请检查 npm 是否工作正常，或尝试手动运行 '''npm install -g pnpm''' 进行安装。"
            echo "如果问题依旧，请查阅 pnpm 的官方安装文档。"
            echo ""
            exit 1
        fi
        ;;
      * )
        echo ""
        echo "用户选择不安装 pnpm。脚本将退出。"
        echo ""
        exit 0
        ;;
    esac
else
    echo "pnpm 已安装: $(pnpm -v)"
fi

echo ""
echo "正在安装项目依赖 (pnpm install)..."
if ! pnpm install; then
    echo ""
    echo "\"pnpm install\" 执行失败。请检查上面的错误信息。"
    echo ""
    exit 1
fi
echo "项目依赖安装完成。"

echo ""
echo "正在启动开发服务器 (pnpm dev)..."
echo ""
echo "=================================================="
echo "  要停止开发服务器，请在此窗口中按 CTRL+C 组合键。"
echo "=================================================="
echo ""
pnpm dev

echo ""
echo "开发服务器已停止或启动失败。"
exit 0

@echo off
REM 设置代码页为 UTF-8 以正确显示中文字符
chcp 65001 > nul

echo 正在检查 Node.js 是否已安装...
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Node.js 未安装。
    echo 请访问 https://nodejs.org/ 下载并安装 Node.js (推荐 LTS 版本)。
    echo 安装完成后，请关闭此窗口并重新运行此脚本。
    echo.
    pause
    exit /b
)
echo Node.js 已安装。

echo.
echo 正在检查 npm 是否已安装...
npm -v > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo npm 未安装。这通常与 Node.js 一起安装。
    echo 请确保 Node.js 已正确安装，或者尝试重新安装 Node.js。
    echo 安装完成后，请关闭此窗口并重新运行此脚本。
    echo.
    pause
    exit /b
)
echo npm 已安装。

echo.
echo 正在检查 pnpm 是否已安装...
pnpm -v > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo pnpm 未安装。
    set /p install_pnpm="是否要尝试使用 npm 全局安装 pnpm? (Y/N 然后按 Enter): "
    if /i "%install_pnpm%"=="Y" (
        echo.
        echo 正在全局安装 pnpm (npm install -g pnpm)...
        npm install -g pnpm
        if %errorlevel% neq 0 (
            echo.
            echo pnpm 安装失败。请检查 npm 是否工作正常，或尝试手动在新的命令提示符窗口运行 "npm install -g pnpm"。
            echo 如果问题依旧，请查阅 pnpm 的官方安装文档。
            echo.
            pause
            exit /b
        )
        echo pnpm 安装成功。
        echo 请注意：新安装的 pnpm 可能需要打开一个新的命令提示符窗口才能在当前路径下直接使用。
        echo 如果后续步骤失败，请尝试关闭此窗口，打开新的命令提示符，然后重新运行此脚本。
        echo.
        pause
    ) else (
        echo.
        echo 用户选择不安装 pnpm。脚本将退出。
        echo.
        pause
        exit /b
    )
) else (
    echo pnpm 已安装。
)

echo.
echo 正在安装项目依赖 (pnpm install)...
pnpm install
if %errorlevel% neq 0 (
    echo.
    echo "pnpm install" 执行失败。请检查上面的错误信息。
    echo.
    pause
    exit /b
)
echo 项目依赖安装完成。

echo.
echo 正在启动开发服务器 (pnpm dev)...
echo.
echo ==================================================
echo   要停止开发服务器，请在此窗口中按 CTRL+C 组合键。
echo ==================================================
echo.
pnpm dev

echo.
echo 开发服务器已停止或启动失败。
pause

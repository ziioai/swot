@echo off
REM Set code page to UTF-8 to correctly display characters (optional for English)
chcp 65001 > nul

echo Checking if Node.js is installed...
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Node.js is not installed.
    echo Please visit https://nodejs.org/ to download and install Node.js (LTS version recommended).
    echo After installation, please close this window and re-run this script.
    echo.
    pause
    exit /b
)
echo Node.js is installed.

echo.
echo Checking if npm is installed...
npm -v > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo npm is not installed. This is usually installed вместе with Node.js.
    echo Please ensure Node.js is installed correctly, or try reinstalling Node.js.
    echo After installation, please close this window and re-run this script.
    echo.
    pause
    exit /b
)
echo npm is installed.

echo.
echo Checking if pnpm is installed...
pnpm -v > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo pnpm is not installed.
    set /p install_pnpm="Do you want to try installing pnpm globally using npm? (Y/N then press Enter): "
    if /i "%install_pnpm%"=="Y" (
        echo.
        echo Installing pnpm globally (npm install -g pnpm)...
        npm install -g pnpm
        if %errorlevel% neq 0 (
            echo.
            echo pnpm installation failed. Please check if npm is working correctly, or try running "npm install -g pnpm" manually in a new command prompt window.
            echo If the problem persists, please consult the official pnpm installation documentation.
            echo.
            pause
            exit /b
        )
        echo pnpm installed successfully.
        echo Please note: The newly installed pnpm might require opening a new command prompt window to be used directly in the current path.
        echo If subsequent steps fail, please try closing this window, opening a new command prompt, and then re-running this script.
        echo.
        pause
    ) else (
        echo.
        echo User chose not to install pnpm. The script will exit.
        echo.
        pause
        exit /b
    )
) else (
    echo pnpm is installed.
)

echo.
echo Installing project dependencies (pnpm install)...
pnpm install
if %errorlevel% neq 0 (
    echo.
    echo "pnpm install" failed. Please check the error messages above.
    echo.
    pause
    exit /b
)
echo Project dependencies installed successfully.

echo.
echo Starting development server (pnpm dev)...
echo.
echo ==================================================
echo   To stop the development server, press CTRL+C in this window.
echo ==================================================
echo.
pnpm dev

echo.
echo Development server has stopped or failed to start.
pause

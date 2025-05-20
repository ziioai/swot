#!/bin/bash

echo "Checking if Node.js is installed..."
if ! command -v node &> /dev/null; then
    echo ""
    echo "Node.js is not installed."
    echo "Please visit https://nodejs.org/ to download and install Node.js (LTS version recommended)."
    echo "For macOS users, you can also consider using Homebrew: brew install node"
    echo "After installation, please open a new terminal window and re-run this script."
    echo ""
    exit 1
fi
echo "Node.js is installed: $(node -v)"

echo ""
echo "Checking if npm is installed..."
if ! command -v npm &> /dev/null; then
    echo ""
    echo "npm is not installed. This is usually installed with Node.js."
    echo "Please ensure Node.js is installed correctly, or try reinstalling Node.js."
    echo "After installation, please open a new terminal window and re-run this script."
    echo ""
    exit 1
fi
echo "npm is installed: $(npm -v)"

echo ""
echo "Checking if pnpm is installed..."
if ! command -v pnpm &> /dev/null; then
    echo ""
    echo "pnpm is not installed."
    read -p "Do you want to try installing pnpm globally using npm? (y/N): " choice
    case "$choice" in
      y|Y )
        echo ""
        echo "Installing pnpm globally (npm install -g pnpm)..."
        if npm install -g pnpm; then
            echo "pnpm installed successfully."
            echo "Please note: The newly installed pnpm might require opening a new terminal window to be used."
            echo "If subsequent steps fail, please try opening a new terminal and then re-running this script."
            # Attempt to find pnpm again in common global paths if not immediately available
            if ! command -v pnpm &> /dev/null; then
                 export PATH="$HOME/.local/bin:$PATH" # Common user global path
                 if ! command -v pnpm &> /dev/null && [ -d "$(npm get prefix)/bin" ]; then
                    export PATH="$(npm get prefix)/bin:$PATH" # npm global bin
                 fi
            fi
            if ! command -v pnpm &> /dev/null; then
                echo "pnpm is installed, but may not be in the PATH of the current terminal."
                echo "Please try opening a new terminal window and re-running this script, or add pnpm's global installation path to your PATH environment variable."
            fi
            echo ""
        else
            echo ""
            echo "pnpm installation failed. Please check if npm is working correctly, or try running '''npm install -g pnpm''' manually."
            echo "If the problem persists, please consult the official pnpm installation documentation."
            echo ""
            exit 1
        fi
        ;;
      * )
        echo ""
        echo "User chose not to install pnpm. The script will exit."
        echo ""
        exit 0
        ;;
    esac
else
    echo "pnpm is installed: $(pnpm -v)"
fi

echo ""
echo "Installing project dependencies (pnpm install)..."
if ! pnpm install; then
    echo ""
    echo "\"pnpm install\" failed. Please check the error messages above."
    echo ""
    exit 1
fi
echo "Project dependencies installed successfully."

echo ""
echo "Starting development server (pnpm dev)..."
echo ""
echo "=================================================="
echo "  To stop the development server, press CTRL+C in this window."
echo "=================================================="
echo ""
pnpm dev

echo ""
echo "Development server has stopped or failed to start."
exit 0

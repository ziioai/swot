# How to Run the Project

This document explains how to use the provided scripts to start this project on different operating systems.

## Windows Users

1.  Ensure you have [Node.js](https://nodejs.org/) installed (LTS version recommended). The script will check automatically, but pre-installing can prevent interruptions.
2.  Double-click the `start-project-en.bat` file located in the project's root directory.
3.  The script will automatically check for the required `node`, `npm`, and `pnpm`.
    *   If `node` or `npm` is not installed, the script will prompt you to install them, and you will need to re-run the script afterwards.
    *   If `pnpm` is not installed, the script will ask if you want to install it globally via `npm`. Enter `Y` and press Enter to proceed with the installation.
4.  Once the installation checks pass, the script will automatically execute `pnpm install` to install project dependencies.
5.  Then, it will execute `pnpm dev` to start the development server.
6.  The terminal will display the development server's address (usually `http://localhost:xxxx`).
7.  **How to stop the server:** In the command prompt window where the script is running, press `CTRL+C`, then confirm if prompted, to stop the development server.

## macOS Users

1.  Ensure you have [Node.js](https://nodejs.org/) installed (LTS version recommended). You can download it from the official website or use Homebrew (`brew install node`).
2.  Open your Terminal.
3.  Navigate to the project's root directory. For example, if your project is in `~/Projects/swot`, type `cd ~/Projects/swot`.
4.  Before running the script for the first time, you need to give it execution permissions. Run the following command in the terminal:
    ```bash
    chmod +x start-project-macos-en.sh
    ```
5.  Now, you can run the script:
    ```bash
    ./start-project-macos-en.sh
    ```
6.  The script will automatically check for the required `node`, `npm`, and `pnpm`.
    *   If `node` or `npm` is not installed, the script will prompt you to install them. You will then need to close the current terminal, open a new one, and re-run the script.
    *   If `pnpm` is not installed, the script will ask if you want to install it globally via `npm`. Enter `y` and press Enter to proceed.
7.  Once the installation checks pass, the script will automatically execute `pnpm install`.
8.  Then, it will execute `pnpm dev` to start the development server.
9.  The terminal will display the development server's address (usually `http://localhost:xxxx`).
10. **How to stop the server:** In the terminal window where the script is running, press `CTRL+C` to stop the development server.

## Linux Users

1.  Ensure you have [Node.js](https://nodejs.org/) installed (LTS version recommended). You can download it from the official website or use your distribution's package manager (e.g., `apt`, `dnf`, `pacman`).
2.  Open your terminal.
3.  Navigate to the project's root directory.
4.  Before running the script for the first time, you need to give it execution permissions. Run the following command in the terminal:
    ```bash
    chmod +x start-project-linux-en.sh
    ```
5.  Now, you can run the script:
    ```bash
    ./start-project-linux-en.sh
    ```
6.  The script will automatically check for the required `node`, `npm`, and `pnpm`.
    *   If `node` or `npm` is not installed, the script will prompt you to install them. You will then need to close the current terminal, open a new one, and re-run the script.
    *   If `pnpm` is not installed, the script will ask if you want to install it globally via `npm`. Enter `y` and press Enter to proceed.
7.  Once the installation checks pass, the script will automatically execute `pnpm install`.
8.  Then, it will execute `pnpm dev` to start the development server.
9.  The terminal will display the development server's address (usually `http://localhost:xxxx`).
10. **How to stop the server:** In the terminal window where the script is running, press `CTRL+C` to stop the development server.

## Notes

*   If, after installing `pnpm`, the script fails to find the `pnpm` command in the same session, try closing the current terminal/command prompt window, opening a new one, and then re-running the startup script. This is often because the path to the newly installed command has not yet been recognized in the current session.
*   All interactive prompts in these scripts are in English.
*   If you encounter any issues, check the error messages output in the terminal; they usually provide clues for resolving the problem.

# AI SWOT: Practical demonstration of the System Prompt Learning paradigm.

[中文说明](README-cn.md)

SWOT (meaning "Small-Town Overachiever") is an AI training system focused on Self-Prompt Training, following the System Prompt Learning paradigm. It provides a comprehensive platform for users to train and manage AI models through the following features.

## Core Features

*   **Training and Answering:**
    *   Users can load question sets, and the AI will answer based on the provided notes.
    *   The system records the AI's answering performance, including accuracy, error analysis, etc.
    *   Users can control the training process, such as starting and pausing training, and adjusting training parameters.
*   **Note Management:**
    *   **Current Notes:** The system displays notes autonomously learned and recorded by the AI during the problem-solving process. Users can view these notes and observe how the AI iterates and optimizes its notes based on problem-solving results and error analysis.
    *   **Note History:** The system automatically saves historical versions of AI notes. Users can easily view the evolution of notes and restore to previous versions if needed.
    *   **Note Import/Export:** Supports importing and exporting note data.
*   **Prompt Configuration:**
    *   Users can edit and manage prompt templates used in various stages of the training process to optimize AI training effectiveness.
*   **Question Bank Configuration:**
    *   Users can manage question bank data for training or testing, supporting the import of processed data.
*   **Model Interface Configuration:**
    *   Manage AI model providers, API keys, and selected models.
*   **Conversation History:**
    *   Saves historical conversation records with the AI model, allowing users to easily review and analyze previous interactions.
*   **Storage Management:**
    *   View and manage various data stored locally by the system, including trainer status, question sets, prompt templates, etc. Supports data import and export.
*   **Debugging Tools:**
    *   Provides a series of debugging tools for developers to perform data operations and status checks.

## Design Philosophy

The SWOT system aims to enhance AI models' capabilities in specific knowledge domains by simulating a cycle of "problem-solving - learning - improving notes - problem-solving again." Users provide question sets, and the AI autonomously records and iterates on its notes during the problem-solving process. Through this learning cycle, the goal is to ultimately improve the model's performance. This design philosophy aligns with the [System Prompt Learning paradigm proposed by Andrej Karpathy](https://x.com/karpathy/status/1921368644069765486).

## Tech Stack

*   Vue.js (Frontend Framework)
*   PrimeVue (UI Component Library)
*   TypeScript (Programming Language)
*   Vite (Build Tool)
*   UnoCSS (CSS Engine)

## How to Run

Please refer to the `HOW_TO_RUN-cn.md` (Chinese) or `HOW_TO_RUN-en.md` (English) files in the project for detailed running instructions. The project provides various startup scripts, such as `start-project-macos-en.sh`, `start-project-linux-en.sh`, `start-project-en.bat`, etc., for launching the project on different operating systems.

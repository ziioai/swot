export default {
  memoBoard: {
    memoBoardContent: `
# AI SWOT: Practical demonstration of the System Prompt Learning paradigm.

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

## Training Process Logic

- O Has the maximum number of cycles been reached?
  - Reached: End training
  - Not reached:
    - Is the set of all [not skipped, not simple, not reached maximum validation count] empty?
      - Yes: End training
      - No: Continue executing the core process
    - Core process: Process all [not skipped, not simple, not reached maximum validation count] questions in parallel
      - Did they all fail?
        - Yes: Forced end of training
        - No: Continue
      - For each correctly answered question:
        - This question version practice count += 1
        - This question total practice count += 1
        - This question version correct count += 1
        - This question total correct count += 1
        - If 'this question version practice count = this question version correct count >= version simple threshold', mark as [version simple question]
        - If 'this question total practice count = this question total correct count >= total simple threshold', mark as [total simple question]
      - For each incorrectly answered question:
        - This question version error count += 1
          - If version difficult threshold is reached, mark as [version skipped question]
        - This question total error count += 1
          - If total difficult threshold is reached, mark as [total skipped question]
      - Were all questions answered correctly?
        - All correct: Version validation count += 1
        - Not all correct: Do not increase validation count
      - For each incorrectly answered question:
        - Update notes
      - Total cycle count += 1
      - Return to O to continue the next cycle

Reference: [SpaCE2025](https://pku-space.github.io/SpaCE2025/)
`.trim(),
  }
};

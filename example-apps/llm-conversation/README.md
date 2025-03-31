# LLM Conversation Example Application

This example application demonstrates how to use the `@ubc-genai-toolkit/llm` module to create a simple, interactive command-line chat application that can connect to different Large Language Model (LLM) providers like OpenAI or a local Ollama instance.

## Overview

The application allows you to have a conversation with an LLM. It:

-   Loads configuration from a `.env` file.
-   Initializes the `LLMModule` from the toolkit.
-   Creates a `Conversation` object to manage chat history.
-   Enters a loop where it takes user input and streams the LLM's response back to the console.
-   Supports exiting the conversation with `exit` or `quit`.

## Prerequisites

-   **Node.js and npm:** Required to install dependencies and run the application.
-   **Access to an LLM:**
    -   **OpenAI:** You need an API key from OpenAI.
    -   **Ollama:** You need to have [Ollama](https://ollama.com/) installed and running locally, with the desired model pulled (e.g., `ollama pull llama3.1`).

## Setup

1.  **Navigate to the root of the toolkit workspace:**
    ```bash
    cd /path/to/ubc-genai-toolkit-ts
    ```
2.  **Install all dependencies** (including those for this example app and the core/llm modules):
    ```bash
    npm install
    ```
3.  **Build all modules and applications:**
    ```bash
    npm run build
    ```

## Configuration

Configuration is managed through a `.env` file located in this directory (`example-apps/llm-conversation/.env`). Create this file if it doesn't exist.

The following variables are used:

-   `LLM_PROVIDER`: Specifies the LLM provider to use. Supported values: `openai`, `ollama`. (Defaults to `openai` if not set).
-   `LLM_DEFAULT_MODEL`: The specific model name to use for the chosen provider (e.g., `gpt-4o`, `llama3.1`). **Required**.
-   `LLM_API_KEY`: Your API key. **Required** for `openai`.
-   `LLM_ENDPOINT`: The API endpoint URL. **Required** for `ollama` (e.g., `http://localhost:11434`) and optional for `openai` if using a compatible proxy/endpoint.
-   `DEBUG`: Set to `true` to enable debug logging from the toolkit modules.

### Example `.env` for OpenAI

```dotenv
# .env for OpenAI provider
LLM_PROVIDER=openai
LLM_API_KEY=YOUR_OPENAI_API_KEY_HERE
LLM_DEFAULT_MODEL=gpt-4o

# Optional: Enable debug logging
# DEBUG=true
```

_(Replace `YOUR_OPENAI_API_KEY_HERE` with your actual key)_

### Example `.env` for Ollama

```dotenv
# .env for Ollama provider
LLM_PROVIDER=ollama
LLM_ENDPOINT=http://localhost:11434 # Default Ollama endpoint
LLM_DEFAULT_MODEL=llama3.1 # Or any other model you have pulled

# Optional: Enable debug logging
# DEBUG=true
```

_(Ensure Ollama is running and the specified model is available)_

## Running the Application

After setup and configuration, you can run the application from the **root** of the toolkit workspace:

```bash
npm run start:llm-convo
```

The application will start, display the provider being used, and prompt you for input (`You: `). Type your messages and press Enter. Type `exit` or `quit` to end the conversation.

## Code Structure

-   **`src/index.ts`**: The entry point. Loads configuration and starts the `ConversationApp`.
-   **`src/config.ts`**: Handles loading environment variables from `.env` and creating the `LLMConfig` object.
-   **`src/app.ts`**: Contains the main `ConversationApp` class, which manages the user interface loop, interacts with the `LLMModule`, and displays the conversation.
-   **`README.md`**: This file.
-   **`.env`**: (You create this) Stores configuration secrets and settings.
-   **`package.json`**: Defines dependencies and scripts for this specific example app.

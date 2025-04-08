# UBC GenAI Toolkit - Embedding CLI Example

This application demonstrates how to use the `@ubc-genai-toolkit/embeddings` module to generate text embeddings using different providers.

## Setup

1.  Navigate to the root of the `ubc-genai-toolkit-ts` repository.
2.  Install dependencies: `npm install`
3.  Create a `.env` file in the root directory.
4.  Add the necessary configuration variables to your `.env` file (see Configuration below).

## Configuration (`.env` file)

Set the following environment variables:

```dotenv
# Choose the provider: 'ubc-genai-toolkit-llm' or 'fastembed'
EMBEDDING_PROVIDER=

# --- Required if EMBEDDING_PROVIDER='ubc-genai-toolkit-llm' ---
# Choose the underlying LLM provider: 'openai', 'ollama', 'ubc-llm-sandbox'
LLM_PROVIDER=
LLM_DEFAULT_MODEL=<default_chat_model> # e.g., gpt-3.5-turbo or llama3
LLM_EMBEDDING_MODEL=<embedding_model> # Optional: e.g., text-embedding-3-small or nomic-embed-text
LLM_API_KEY=<your_api_key> # Required for openai, ubc-llm-sandbox
LLM_ENDPOINT=<your_endpoint> # Required for ollama, ubc-llm-sandbox

# --- Optional if EMBEDDING_PROVIDER='fastembed' ---
FASTEMBED_MODEL= # e.g., BGESmallENV15, AllMiniLML6V2 (defaults to BGESmallENV15)
FASTEMBED_CACHE_DIR= # Defaults to 'local_cache' in the project root

# --- Optional General Settings ---
DEBUG=false # Set to true for verbose logging
```

Replace `<...>` placeholders with your actual values.

## Running

From the root directory:

```bash
npm run start:embedding-cli
```

The application will prompt you to enter text. Type your text and press Enter to see the generated embedding. Type `exit` or `quit` to stop.

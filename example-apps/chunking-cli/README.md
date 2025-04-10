# UBC GenAI Toolkit - Chunking CLI Example

This application demonstrates how to use the `@ubc-genai-toolkit/chunking` module to split text documents into smaller chunks using various strategies.

## Setup

1.  **Install Dependencies:** Run `npm install` in the workspace root.
2.  **Configure:** Copy `.env.example` to `.env` and set the desired chunking strategy and options:
    -   `CHUNKING_DEFAULT_STRATEGY`: (Optional) `simple`, `recursiveCharacter`, `token` (default: `recursiveCharacter`).
    -   `CHUNKING_DEFAULT_CHUNK_SIZE`: (Optional) Default chunk size (default depends on strategy, e.g., 1000 for `recursiveCharacter`).
    -   `CHUNKING_DEFAULT_CHUNK_OVERLAP`: (Optional) Default chunk overlap (default depends on strategy, e.g., 200 for `recursiveCharacter`).
    -   `DEBUG`: (Optional) Set to `true` for verbose logging.
3.  **Add Data:** Place `.txt` or `.md` files into the `src/data/` directory. Example files (`example.txt`, `example.md`) are provided.

## Running

1.  **Build:** Run `npm run build --workspace=@ubc-genai-toolkit/chunking-cli` (or `npm run build` from the root).
2.  **Start:** Run `npm start --workspace=@ubc-genai-toolkit/chunking-cli` (or `npm run start:chunking-cli` from the root if configured).

The application will read files from `src/data/`, chunk them according to the configured strategy, and print the resulting chunks to the console.

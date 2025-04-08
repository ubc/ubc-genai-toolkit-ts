# RAG Example Application

This application demonstrates how to use the `@ubc-genai-toolkit/rag` module in conjunction with the `@ubc-genai-toolkit/llm` module to build a simple Retrieval-Augmented Generation (RAG) command-line interface.

## Purpose

-   Showcases initialization and configuration of the `RAGModule` and `LLMModule`.
-   Demonstrates adding documents to a vector store (`Qdrant` in this case) using `RAGModule.addDocument()`.
-   Illustrates retrieving relevant context using `RAGModule.retrieveContext()`.
-   Compares a standard LLM response with a RAG-enhanced response for the same user query.

## Setup

1.  **Install Dependencies:**
    Navigate to the root of the `ubc-genai-toolkit-ts` repository and run:

    ```bash
    npm install
    ```

2.  **Configure Environment:**
    Copy the `.env.example` file in this directory to a new file named `.env`:

    ```bash
    cp example-apps/rag-app/.env.example example-apps/rag-app/.env
    ```

    Edit the `.env` file with your specific configuration:

    -   Set up your conversational LLM provider details (`LLM_*` variables).
    -   Ensure you have a running Qdrant instance and provide its details (`QDRANT_*` variables).
        -   _Important:_ `QDRANT_VECTOR_SIZE` MUST match the dimensionality of the embedding model specified by `EMBEDDINGS_MODEL`.
    -   Configure the provider details for generating embeddings internally within the RAG module (`EMBEDDINGS_*` variables).
    -   Set `DEBUG=true` for verbose logging.

3.  **Add Data:**
    Place one or more Markdown (`.md`) files containing the text you want to index into the `example-apps/rag-app/src/data/` directory. (This directory needs to be created if it doesn't exist).

## Running the Application

1.  **Build the Toolkit and App:**
    From the root of the repository, run the build command:

    ```bash
    npm run build
    ```

    _(This ensures all toolkit modules and the example app are compiled)_

2.  **Start the Application:**
    From the root of the repository, run:
    ```bash
    npm run start:rag-app
    ```

The application will first initialize the modules and index the documents from the `src/data` directory. Then, it will prompt you to enter questions.

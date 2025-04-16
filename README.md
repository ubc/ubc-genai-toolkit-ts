# UBC GenAI Toolkit (TypeScript)

The UBC GenAI Toolkit (TypeScript) is a modular library designed to simplify the integration of Generative AI capabilities into web applications at UBC. It provides standardized interfaces for common GenAI tasks, shielding applications from underlying implementations and ensuring API stability even as technologies evolve.

This toolkit follows the Facade pattern, offering simplified interfaces over potentially complex underlying libraries or services. This allows developers of applications that consume this toolkit to focus on application logic rather than GenAI infrastructure, and enables easier adoption of new technologies or providers in the future without requiring changes to consuming applications.

## Table of Contents

-   [Installation](#installation)
-   [Core Concepts](#core-concepts)
-   [Modules](#modules)
    -   [Core Module](#core-module)
    -   [LLM Module](#llm-module)
    -   [Embeddings Module](#embeddings-module)
    -   [Chunking Module](#chunking-module)
    -   [Document Parsing Module](#document-parsing-module)
    -   [RAG Module](#rag-module)
-   [Example Applications](#example-applications)
-   [Future Modules](#future-modules)
-   [Contributing](#contributing)
-   [License](#license)

## Installation

**Note:** This toolkit is currently under active development and is not yet published on npm. The following instructions are temporary.

Our goal is to publish this toolkit to npm as `@ubc-genai-toolkit/PACKAGE_NAME` (e.g., `@ubc-genai-toolkit/llm`) in the future.

For now, to use the toolkit in your project:

1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/ubc/ubc-genai-toolkit-ts.git
    ```
2.  In your project's `package.json`, add the desired toolkit modules as dependencies using relative `file:` paths pointing to the corresponding directories within your cloned toolkit repository:
    ```json
    {
    	"dependencies": {
    		"@ubc-genai-toolkit/core": "file:/path/to/your/cloned/ubc-genai-toolkit-ts/modules/core",
    		"@ubc-genai-toolkit/llm": "file:/path/to/your/cloned/ubc-genai-toolkit-ts/modules/llm",
    		"@ubc-genai-toolkit/embeddings": "file:/path/to/your/cloned/ubc-genai-toolkit-ts/modules/embeddings"
    		// Add other modules as needed
    	}
    }
    ```
    _Replace `/path/to/your/cloned/` with the actual path on your system._
3.  Run `npm install` (or `yarn install`, `pnpm install`) in your project directory.

## Core Concepts

The toolkit is built upon several core design principles:

-   **Modular Design**: Capabilities are encapsulated in distinct modules (`core`, `llm`, `embeddings`, etc.).
-   **Stable API**: Public interfaces aim for stability, abstracting underlying changes.
-   **Implementation Agnostic**: Core APIs are defined independently of specific technologies.
-   **Configurable**: Modules accept configuration options at initialization.
-   **Multi-instance**: Supports multiple simultaneous instances of modules.
-   **Observable**: Follows consistent patterns for logging and error handling.
-   **Well-documented**: Aims for comprehensive documentation and examples.

Refer to the `modules/core/src` directory for common patterns like error handling (`error.ts`), configuration (`config.ts`), and logging (`logger.ts`).

## Modules

The toolkit consists of several modules, each providing specific functionality:

### Core Module (`@ubc-genai-toolkit/core`)

Location: `modules/core`

This module provides foundational interfaces and utilities used by other modules, including standardized error handling, configuration management, and logging interfaces. It establishes the common patterns that other modules adhere to.

### LLM Module (`@ubc-genai-toolkit/llm`)

Location: `modules/llm`

Provides a consistent interface for interacting with various Large Language Models (LLMs). It simplifies managing conversations and handling responses.

-   **Providers:**
    -   Anthropic (via `@anthropic-ai/sdk`)
    -   OpenAI (via `openai`)
    -   Ollama (via `ollama`)
    -   UBC LLM Sandbox (via a custom Ollama/LiteLLM proxy)
-   **Example App:** `example-apps/llm-conversation` demonstrates basic conversational interaction.

### Embeddings Module (`@ubc-genai-toolkit/embeddings`)

Location: `modules/embeddings`

Handles the creation of text embeddings using different models. Embeddings are crucial for tasks like semantic search and Retrieval-Augmented Generation (RAG).

-   **Underlying Library:** `fastembed`
-   **Example App:** `example-apps/embedding-cli` shows how to generate embeddings for text.

### Chunking Module (`@ubc-genai-toolkit/chunking`)

Location: `modules/chunking`

Provides strategies for splitting large texts into smaller, manageable chunks, often a necessary preprocessing step for embedding or LLM processing.

-   **Underlying Library:** `langchain` (specifically its text splitters)
-   **Example App:** `example-apps/chunking-cli` demonstrates text chunking strategies.

### Document Parsing Module (`@ubc-genai-toolkit/document-parsing`)

Location: `modules/document-parsing`

Extracts text content from various document formats.

-   **Supported Formats/Libraries:**
    -   PDF (via `@opendocsg/pdf2md`)
    -   DOCX (via `mammoth`)
    -   HTML (via `turndown`)
    -   Markdown/Text (via `markdown-to-text`, `file-type`)
-   **Example App:** `example-apps/document-parsing-cli` shows how to parse different file types.

### RAG Module (`@ubc-genai-toolkit/rag`)

Location: `modules/rag`

Facilitates building Retrieval-Augmented Generation systems. It integrates embedding generation and vector storage/retrieval to provide relevant context to LLMs.

-   **Vector Store Interaction:** Currently supports Qdrant (via `@qdrant/js-client-rest`).
-   **Dependencies:** Relies on the `Embeddings Module`.
-   **Example App:** `example-apps/rag-app` demonstrates a basic RAG implementation.

## Example Applications

The `example-apps/` directory contains simple applications demonstrating how to use each non-core module:

-   `llm-conversation`: Basic chat interface using the LLM module.
-   `embedding-cli`: Command-line tool for generating text embeddings.
-   `chunking-cli`: Command-line tool for splitting text documents.
-   `document-parsing-cli`: Command-line tool for extracting text from files.
-   `rag-app`: Simple application showcasing RAG principles.

These examples serve as starting points for integrating the toolkit into your own applications.

## Future Modules

We are actively working on expanding the toolkit with additional modules relevant to the UBC context, including:

-   **Authentication Module**: Integration with UBC's Shibboleth/SAML2 infrastructure.
-   **LTI Module**: Support for Learning Tools Interoperability (LTI) to connect with Learning Management Systems (LMS) like Canvas.

## Contributing

Contribution guidelines will be added soon. In the meantime, feel free to open issues or pull requests.

## License

This project is licensed under the GNU General Public License v2.0. See the [LICENSE](LICENSE) file for details.

# UBC GenAI Toolkit (TypeScript)

**(Mid 2025: See update below!)**

The UBC GenAI Toolkit (TypeScript) is a modular library designed to simplify the integration of Generative AI capabilities into web applications at UBC. It provides standardized interfaces for common GenAI tasks, shielding applications from underlying implementations and ensuring API stability even as technologies evolve.

This toolkit follows the Facade pattern, offering simplified interfaces over potentially complex underlying libraries or services. This allows developers of applications that consume this toolkit to focus on application logic rather than GenAI infrastructure, and enables easier adoption of new technologies or providers in the future without requiring changes to consuming applications.

## Update Mid-2025

Rather than one monolithic toolkit, we have instead released each module as its own distinct dependency you can use in your projects.

Core: https://github.com/ubc/ubc-genai-toolkit-core
LLM: https://github.com/ubc/ubc-genai-toolkit-llm
Document Parsing: https://github.com/ubc/ubc-genai-toolkit-document-parsing
Chunking: https://github.com/ubc/ubc-genai-toolkit-chunking
Embeddings: https://github.com/ubc/ubc-genai-toolkit-embeddings
RAG: https://github.com/ubc/ubc-genai-toolkit-rag

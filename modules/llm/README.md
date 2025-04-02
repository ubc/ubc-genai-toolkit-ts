# UBC GenAI Toolkit - LLM Module

## Overview

This module provides a standardized interface for interacting with various Large Language Models (LLMs). It follows the Facade pattern, simplifying interactions with different LLM providers like OpenAI, Anthropic, Ollama, and the UBC LLM Sandbox, while shielding your application from underlying SDK changes.

Applications can use this module to send single messages, manage conversation history, stream responses, and list available models, all through a consistent API.

## Installation

```bash
# Link locally if developing within the monorepo
# (Adjust path as needed)
npm install file:../core file:../llm
```

## Core Concepts

-   **`LLMModule`**: The main class and entry point for interacting with LLMs. You configure it once with your provider details.
-   **Providers**: The module supports different LLM providers (`openai`, `anthropic`, `ollama`, `ubc-llm-sandbox`). The specific provider implementation is handled internally based on your configuration.
-   **`Conversation`**: A helper class obtained via `llmModule.createConversation()` to easily manage multi-turn chat history and interact with the LLM contextually.
-   **`LLMOptions`**: An interface defining parameters you can pass to customize LLM requests (e.g., `model`, `temperature`, `maxTokens`, `systemPrompt`).
-   **`LLMResponse`**: A standardized response format returned by the module, containing the LLM's content, model used, usage statistics (where available), and metadata.

## Configuration

The `LLMModule` is configured during instantiation with an `LLMConfig` object.

```typescript
import { LLMModule, LLMConfig } from '@ubc-genai-toolkit/llm';
import { ConsoleLogger } from '@ubc-genai-toolkit/core'; // Example logger

// General Structure
interface LLMConfig {
	provider: 'openai' | 'anthropic' | 'ollama' | 'ubc-llm-sandbox' | string; // Specify the provider
	apiKey?: string; // Required for OpenAI, Anthropic, UBC LLM Sandbox
	endpoint?: string; // Required for Ollama, UBC LLM Sandbox, optional for OpenAI-compatible APIs
	defaultModel: string; // Default model ID to use for requests
	logger?: LoggerInterface; // Optional: Provide a logger instance
	defaultOptions?: LLMOptions; // Optional: Default parameters for all requests
}

interface LLMOptions {
	model?: string; // Override the default model for a specific request
	temperature?: number; // Sampling temperature
	maxTokens?: number; // Maximum tokens to generate
	systemPrompt?: string; // System prompt to guide the model
	responseFormat?: 'text' | 'json'; // Specify response format (provider support varies)
	// Other provider-specific options might be passed here
	[key: string]: any;
}

// --- Example Configurations ---

// OpenAI
const openAIConfig: LLMConfig = {
	provider: 'openai',
	apiKey: process.env.OPENAI_API_KEY, // Use environment variables
	defaultModel: 'gpt-4o',
	logger: new ConsoleLogger(),
	defaultOptions: {
		temperature: 0.7,
	},
};

// Anthropic
const anthropicConfig: LLMConfig = {
	provider: 'anthropic',
	apiKey: process.env.ANTHROPIC_API_KEY, // Use environment variables
	defaultModel: 'claude-3-5-sonnet-latest',
	logger: new ConsoleLogger(),
};

// Ollama
const ollamaConfig: LLMConfig = {
	provider: 'ollama',
	// Ensure the Ollama service is running at this endpoint
	endpoint: 'http://localhost:11434',
	// Ensure this model is pulled (`ollama pull llama3`)
	defaultModel: 'llama3',
	logger: new ConsoleLogger(),
};

// UBC LLM Sandbox (using an OpenAI-compatible API)
const ubcSandboxConfig: LLMConfig = {
	provider: 'ubc-llm-sandbox',
	apiKey: process.env.UBC_LLM_SANDBOX_API_KEY, // Use environment variables
	endpoint: process.env.UBC_LLM_SANDBOX_ENDPOINT, // Use environment variables
	defaultModel: 'llama3.1', // Example model available in the sandbox
	logger: new ConsoleLogger(),
};

// Instantiate the module
// const llm = new LLMModule(openAIConfig);
// const llm = new LLMModule(anthropicConfig);
const llm = new LLMModule(ollamaConfig); // Example using Ollama
```

## Usage Examples

### Initialization

```typescript
import { LLMModule } from '@ubc-genai-toolkit/llm';
import { ConsoleLogger } from '@ubc-genai-toolkit/core';

const config: LLMConfig = {
	provider: 'ubc-llm-sandbox', // Or 'openai', 'anthropic', 'ollama'
	apiKey: process.env.UBC_LLM_SANDBOX_API_KEY,
	endpoint: process.env.UBC_LLM_SANDBOX_ENDPOINT,
	defaultModel: 'llama3.1', // Ensure this model is available in the sandbox
	logger: new ConsoleLogger(),
};

const llm = new LLMModule(config);
```

### Sending a Single Message

```typescript
async function askQuestion(question: string) {
	try {
		const response = await llm.sendMessage(question, {
			// Optional: override default model or add options
			// model: 'claude-3-haiku-latest',
			temperature: 0.5,
			maxTokens: 150,
		});
		console.log('Assistant:', response.content);
		console.log('Usage:', response.usage);
	} catch (error) {
		console.error('Error sending message:', error);
	}
}

askQuestion('What is the UBC GenAI Toolkit?');
```

### Managing Conversations

```typescript
async function runConversation() {
	const conversation = llm.createConversation();

	conversation.addMessage('system', 'You are a helpful assistant.');
	conversation.addMessage('user', 'What is the capital of France?');

	try {
		let response = await conversation.send({ maxTokens: 50 });
		console.log('Assistant:', response.content);

		// The assistant's response is automatically added to history.
		console.log('History:', conversation.getHistory());

		conversation.addMessage('user', 'What is its population?');
		response = await conversation.send({ maxTokens: 100 });
		console.log('Assistant:', response.content);
	} catch (error) {
		console.error('Error during conversation:', error);
	}
}

runConversation();
```

### Streaming Responses

Use `streamConversation` directly or the `conversation.stream()` helper.

```typescript
async function streamChat() {
	const conversation = llm.createConversation();
	conversation.addMessage(
		'user',
		'Tell me a short story about a robot learning to paint.'
	);

	try {
		process.stdout.write('Assistant: ');
		const finalResponse = await conversation.stream(
			(chunk: string) => {
				// Process each chunk as it arrives
				process.stdout.write(chunk);
			},
			{ maxTokens: 500 }
		);
		process.stdout.write('\n'); // Add newline after stream finishes
		console.log('\n--- Stream Complete ---');
		// Note: finalResponse.usage will be undefined for streams
		console.log('Model used:', finalResponse.model);
	} catch (error) {
		console.error('\nError during streaming:', error);
	}
}

streamChat();
```

### Listing Available Models

```typescript
async function listModels() {
	try {
		const models = await llm.getAvailableModels();
		console.log(`Available models for ${llm.getProviderName()}:`);
		models.forEach((model) => console.log(`- ${model}`));
	} catch (error) {
		console.error('Error listing models:', error);
	}
}

listModels();
```

## Providers & Models

The specific models available depend on the configured provider.

### Provider Interface

All providers implement the `Provider` interface defined in `./src/providers/provider-interface.ts`.

### OpenAI Provider

-   Requires `apiKey` and `defaultModel` in configuration.
-   Optionally supports `endpoint` for OpenAI-compatible APIs (like Azure OpenAI).
-   See `./src/providers/openai-provider.ts`.
-   Available Models: <https://platform.openai.com/docs/models>

### Anthropic Provider

-   Requires `apiKey` and `defaultModel` in configuration.
-   See `./src/providers/anthropic-provider.ts`.
-   Available Models: <https://docs.anthropic.com/en/docs/models-overview#model-comparison> (Check API for exact identifiers via `getAvailableModels()`)

### Ollama Provider

-   Requires `endpoint` (URL of your Ollama server) and `defaultModel` in configuration. `apiKey` is not used.
-   See `./src/providers/ollama-provider.ts`.
-   Available Models: Depends on what models you have downloaded on the Ollama server. Use `ollama list` in your terminal to view locally available models.

### UBC LLM Sandbox Provider

-   Connects to a service providing an OpenAI-compatible API (like one hosted with LiteLLM).
-   Requires `apiKey`, `endpoint`, and `defaultModel` in configuration.
-   See `./src/providers/ubc-llm-sandbox-provider.ts`.
-   Available Models: Depends on the models configured and available in the specific UBC LLM Sandbox deployment. Use `getAvailableModels()` to query the endpoint.

## Error Handling

The module uses the common error types from `@ubc-genai-toolkit/core`:

-   `ConfigurationError`: Thrown during initialization if the config is invalid (e.g., missing API key).
-   `APIError`: Thrown during LLM interaction if the provider API returns an error or another issue occurs. Check the `code` (HTTP status) and `details` (often includes the original error) for more info.

Always wrap calls to the module in `try...catch` blocks.

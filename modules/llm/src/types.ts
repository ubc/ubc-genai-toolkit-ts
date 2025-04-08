import { ModuleConfig } from '@ubc-genai-toolkit/core';

/**
 * LLM provider types
 */
export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'ubc-llm-sandbox';

/**
 * LLM configuration
 */
export interface LLMConfig extends ModuleConfig {
	/**
	 * The LLM provider to use
	 */
	provider: ProviderType;

	/**
	 * API key for authentication (required for OpenAI and Anthropic)
	 */
	apiKey?: string;

	/**
	 * API endpoint (required for Ollama, optional for others)
	 */
	endpoint?: string;

	/**
	 * Default model to use for chat completion
	 */
	defaultModel: string;

	/**
	 * Default model to use for embeddings (optional)
	 */
	embeddingModel?: string;

	/**
	 * Default options for requests
	 */
	defaultOptions?: LLMOptions;
}

/**
 * Message in a conversation
 */
export interface Message {
	/**
	 * The role of the message sender
	 */
	role: 'user' | 'assistant' | 'system';

	/**
	 * The content of the message
	 */
	content: string;

	/**
	 * Optional timestamp
	 */
	timestamp?: string;
}

/**
 * Options for sending messages
 */
export interface LLMOptions {
	/**
	 * Model to use (overrides default)
	 */
	model?: string;

	/**
	 * Temperature (0.0 to 2.0)
	 */
	temperature?: number;

	/**
	 * Maximum tokens to generate
	 */
	maxTokens?: number;

	/**
	 * Stream the response
	 */
	stream?: boolean;

	/**
	 * System prompt to use
	 */
	systemPrompt?: string;

	/**
	 * Response format (e.g., 'json')
	 */
	responseFormat?: 'json' | 'text';

	/**
	 * Additional provider-specific options
	 */
	[key: string]: any;
}

/**
 * Standardized LLM response
 */
export interface LLMResponse {
	/**
	 * The generated content
	 */
	content: string;

	/**
	 * The model that generated the content
	 */
	model: string;

	/**
	 * Token usage information (if available)
	 */
	usage?: {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
	};

	/**
	 * Additional metadata
	 */
	metadata?: Record<string, any>;
}

/**
 * Options specifically for embedding requests.
 */
export interface EmbeddingOptions {
	/**
	 * Model to use for embedding (overrides default embeddingModel)
	 */
	model?: string;

	/**
	 * Whether to truncate input text if it exceeds the model's maximum context length.
	 * Defaults to false. Note: Currently primarily relevant for Ollama.
	 */
	truncate?: boolean;

	/**
	 * Provider-specific options (e.g., 'dimensions' for OpenAI v3 models)
	 */
	[key: string]: any;
}

/**
 * Standardized response for embedding requests.
 */
export interface EmbeddingResponse {
	/**
	 * The generated embedding vectors.
	 */
	embeddings: number[][];

	/**
	 * The model that generated the embeddings.
	 */
	model: string;

	/**
	 * Token usage information (if available, e.g., from OpenAI).
	 */
	usage?: {
		promptTokens?: number;
		totalTokens?: number;
	};

	/**
	 * Additional provider-specific metadata.
	 */
	metadata?: Record<string, any>;
}
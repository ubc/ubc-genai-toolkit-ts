import {
	LLMOptions,
	LLMResponse,
	Message,
	EmbeddingOptions,
	EmbeddingResponse,
} from '../types';

/**
 * Common interface for all LLM providers
 */
export interface Provider {
	/**
	 * Send a single message to the LLM
	 */
	sendMessage(message: string, options?: LLMOptions): Promise<LLMResponse>;

	/**
	 * Send a conversation to the LLM
	 */
	sendConversation(
		messages: Message[],
		options?: LLMOptions
	): Promise<LLMResponse>;

	/**
	 * Stream a conversation to the LLM
	 */
	streamConversation(
		messages: Message[],
		callback: (chunk: string) => void,
		options?: LLMOptions
	): Promise<LLMResponse>;

	/**
	 * Get the name of the provider
	 */
	getName(): string;

	/**
	 * Get the available models for this provider
	 */
	getAvailableModels(): Promise<string[]>;

	/**
	 * Generate embeddings for a list of text strings (optional method).
	 *
	 * Providers that do not support embeddings should throw a ToolkitError.
	 */
	embed?(
		texts: string[],
		options?: EmbeddingOptions
	): Promise<EmbeddingResponse>;
}
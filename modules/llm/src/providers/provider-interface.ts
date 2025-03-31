import { LLMOptions, LLMResponse, Message } from '../types';

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
}
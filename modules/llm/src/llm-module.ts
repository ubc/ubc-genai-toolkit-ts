import {
	LoggerInterface,
	ConfigurationError,
	mergeWithDefaults,
} from '@ubc-genai-toolkit/core';
import {
	LLMConfig,
	LLMOptions,
	LLMResponse,
	Message,
	ProviderType,
} from './types';
import { Provider } from './providers/provider-interface';
import { OpenAIProvider } from './providers/openai-provider';
import { OllamaProvider } from './providers/ollama-provider';
import { ConversationImpl } from './conversation';
import { Conversation, ConversationFactory } from './conversation-interface';

/**
 * Default LLM configuration
 */
const DEFAULT_LLM_CONFIG: Partial<LLMConfig> = {
	// defaultModel removed - should be configured per provider instance
};

/**
 * Main LLM Module facade
 */
export class LLMModule implements ConversationFactory {
	private provider: Provider;
	private config: LLMConfig;
	private logger: LoggerInterface;

	/**
	 * Create a new LLM module instance
	 */
	constructor(config: Partial<LLMConfig>) {
		this.config = mergeWithDefaults<LLMConfig>(config, DEFAULT_LLM_CONFIG);
		this.logger = this.config.logger!;
		this.provider = this.initializeProvider();
	}

	/**
	 * Send a single message to the LLM
	 */
	async sendMessage(
		message: string,
		options?: LLMOptions
	): Promise<LLMResponse> {
		this.logger.debug('Sending message to LLM', {
			provider: this.config.provider,
			model: options?.model || this.config.defaultModel,
		});

		const mergedOptions = this.mergeOptions(options);
		return this.provider.sendMessage(message, mergedOptions);
	}

	/**
	 * Send a conversation to the LLM
	 */
	async sendConversation(
		messages: Message[],
		options?: LLMOptions
	): Promise<LLMResponse> {
		this.logger.debug('Sending conversation to LLM', {
			provider: this.config.provider,
			model: options?.model || this.config.defaultModel,
			messageCount: messages.length,
		});

		const mergedOptions = this.mergeOptions(options);
		return this.provider.sendConversation(messages, mergedOptions);
	}

	/**
	 * Stream a conversation to the LLM
	 */
	async streamConversation(
		messages: Message[],
		callback: (chunk: string) => void,
		options?: LLMOptions
	): Promise<LLMResponse> {
		this.logger.debug('Streaming conversation to LLM', {
			provider: this.config.provider,
			model: options?.model || this.config.defaultModel,
			messageCount: messages.length,
		});

		const mergedOptions = this.mergeOptions(options, { stream: true });
		return this.provider.streamConversation(
			messages,
			callback,
			mergedOptions
		);
	}

	/**
	 * Create a new conversation
	 */
	createConversation(): Conversation {
		return new ConversationImpl(this);
	}

	/**
	 * Get the available models for the current provider
	 */
	async getAvailableModels(): Promise<string[]> {
		return this.provider.getAvailableModels();
	}

	/**
	 * Get the current provider name
	 */
	getProviderName(): string {
		return this.provider.getName();
	}

	/**
	 * Initialize the provider based on configuration
	 */
	private initializeProvider(): Provider {
		const { provider, apiKey, endpoint, defaultModel, logger } = this.config;

		switch (provider) {
			case 'openai':
				if (!apiKey) {
					throw new ConfigurationError(
						'API key is required for OpenAI provider'
					);
				}
				if (!defaultModel) {
					throw new ConfigurationError(
						'defaultModel is required for OpenAI provider'
					);
				}
				return new OpenAIProvider(apiKey, defaultModel, logger!, {
					endpoint,
				});

			case 'anthropic':
				// For Phase 1, only implement OpenAI
				throw new ConfigurationError(
					'Anthropic provider not implemented yet'
				);

			case 'ollama':
				if (!endpoint) {
					throw new ConfigurationError(
						'endpoint is required for Ollama provider'
					);
				}
				if (!defaultModel) {
					throw new ConfigurationError(
						'defaultModel is required for Ollama provider'
					);
				}
				return new OllamaProvider(endpoint, defaultModel, logger!);

			default:
				throw new ConfigurationError(
					`Unsupported provider: ${provider}`
				);
		}
	}

	/**
	 * Merge provided options with defaults
	 */
	private mergeOptions(
		options?: LLMOptions,
		overrides?: Partial<LLMOptions>
	): LLMOptions {
		const defaultOptions = this.config.defaultOptions || {};
		return {
			model: this.config.defaultModel,
			...defaultOptions,
			...options,
			...overrides,
		};
	}
}
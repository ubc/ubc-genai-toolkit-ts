import OpenAI from 'openai';
import { Provider } from './provider-interface';
import {
	LLMOptions,
	LLMResponse,
	Message,
	EmbeddingOptions,
	EmbeddingResponse,
} from '../types';
import { LoggerInterface, APIError } from '@ubc-genai-toolkit/core';

export class UbcLlmSandboxProvider implements Provider {
	private client: OpenAI;
	private logger: LoggerInterface;
	private defaultModel: string;
	private embeddingModel?: string;
	private endpoint: string; // Keep endpoint for logging/reference

	constructor(
		apiKey: string,
		endpoint: string, // Endpoint is mandatory for this provider
		defaultModel: string,
		logger: LoggerInterface,
		options?: { embeddingModel?: string } // Added
	) {
		if (!endpoint) {
			throw new APIError(
				'Endpoint is required for UBC LLM Sandbox provider',
				400
			);
		}
		this.client = new OpenAI({
			apiKey,
			baseURL: endpoint, // Use the provided endpoint
		});
		this.endpoint = endpoint;
		this.defaultModel = defaultModel;
		this.embeddingModel = options?.embeddingModel; // Added
		this.logger = logger;
		this.logger.debug('UbcLlmSandboxProvider initialized', {
			endpoint,
			defaultModel,
			embeddingModel: this.embeddingModel, // Added
		});
	}

	getName(): string {
		return 'ubc-llm-sandbox';
	}

	async getAvailableModels(): Promise<string[]> {
		try {
			this.logger.debug('Fetching available UBC LLM Sandbox models', { endpoint: this.endpoint });
			const models = await this.client.models.list();
			return models.data.map((model) => model.id);
		} catch (error) {
			this.logger.error('Error fetching UBC LLM Sandbox models', { error });
			throw this.handleError(error);
		}
	}

	async sendMessage(
		message: string,
		options?: LLMOptions
	): Promise<LLMResponse> {
		const messages: Message[] = [{ role: 'user', content: message }];

		if (options?.systemPrompt) {
			messages.unshift({ role: 'system', content: options.systemPrompt });
		}

		this.logger.debug('Sending single message via sendConversation (UBC LLM Sandbox)');
		return this.sendConversation(messages, options);
	}

	async sendConversation(
		messages: Message[],
		options?: LLMOptions
	): Promise<LLMResponse> {
		const model = options?.model || this.defaultModel;
		this.logger.debug('Sending conversation to UBC LLM Sandbox', { model, messageCount: messages.length, options });

		try {
			// Convert to OpenAI format
			const openaiMessages = messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			// Handle system prompt if not already in messages
			if (options?.systemPrompt && !messages.some(m => m.role === 'system')) {
				openaiMessages.unshift({ role: 'system', content: options.systemPrompt });
			}

			const response = await this.client.chat.completions.create({
				model,
				messages: openaiMessages,
				temperature: options?.temperature,
				max_tokens: options?.maxTokens,
				response_format:
					options?.responseFormat === 'json'
						? { type: 'json_object' }
						: undefined,
				stream: false,
			});

			return this.normalizeResponse(response);
		} catch (error) {
			this.logger.error('Error calling UBC LLM Sandbox API', { error });
			throw this.handleError(error);
		}
	}

	async streamConversation(
		messages: Message[],
		callback: (chunk: string) => void,
		options?: LLMOptions
	): Promise<LLMResponse> {
		const model = options?.model || this.defaultModel;
		this.logger.debug('Streaming conversation from UBC LLM Sandbox', { model, messageCount: messages.length, options });

		try {
			// Convert to OpenAI format
			const openaiMessages = messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			// Handle system prompt if not already in messages
			if (options?.systemPrompt && !messages.some(m => m.role === 'system')) {
				openaiMessages.unshift({ role: 'system', content: options.systemPrompt });
			}

			const stream = await this.client.chat.completions.create({
				model,
				messages: openaiMessages,
				temperature: options?.temperature,
				max_tokens: options?.maxTokens,
				stream: true,
			});

			let fullContent = '';
			let finalResponse: OpenAI.Chat.Completions.ChatCompletion | null = null;

			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || '';
				if (content) {
					fullContent += content;
					callback(content);
				}
				// LiteLLM might not provide usage stats in the stream itself,
				// but we can capture the final non-delta part if available (might be empty)
				if (!chunk.choices[0]?.delta) {
					// Attempt to capture the final response structure if the API provides it
					// This is speculative as LiteLLM might differ slightly from OpenAI's exact stream termination
				}
			}

			// Since LiteLLM might not return full usage stats in the stream like OpenAI,
			// we may need to make a separate non-streaming call or accept partial/missing usage data.
			// For simplicity now, we return what we have, acknowledging usage might be incomplete.
			// We use the model name from options/defaults as the stream response might not confirm it.
			return {
				content: fullContent,
				model: model, // Use the requested model name
				usage: { // Usage data might be missing or incomplete from stream
					promptTokens: undefined,
					completionTokens: undefined,
					totalTokens: undefined,
				},
				metadata: { provider: 'ubc-llm-sandbox' },
			};
		} catch (error) {
			this.logger.error('Error streaming from UBC LLM Sandbox API', { error });
			throw this.handleError(error);
		}
	}

	async embed(
		texts: string[],
		options?: EmbeddingOptions
	): Promise<EmbeddingResponse> {
		try {
			const model =
				options?.model || this.embeddingModel || 'nomic-embed-text'; // Default to nomic
			this.logger.debug('Generating embeddings with UBC LLM Sandbox', {
				model,
				textCount: texts.length,
				options,
			});

			// Extract provider-specific options (like dimensions)
			const { truncate, ...providerOptions } = options || {}; // truncate might not be used but keep pattern
			delete providerOptions.model; // Don't pass our internal model option directly

			const response = await this.client.embeddings.create({
				model: model,
				input: texts,
				...providerOptions, // Pass any remaining options (like dimensions)
			});

			return this.normalizeEmbeddingResponse(response);
		} catch (error) {
			this.logger.error('Error calling UBC LLM Sandbox Embeddings API', {
				error,
			});
			throw this.handleError(error);
		}
	}

	private normalizeResponse(
		response: OpenAI.Chat.Completions.ChatCompletion
	): LLMResponse {
		return {
			content: response.choices[0]?.message?.content || '',
			model: response.model,
			usage: {
				promptTokens: response.usage?.prompt_tokens,
				completionTokens: response.usage?.completion_tokens,
				totalTokens: response.usage?.total_tokens,
			},
			metadata: {
				provider: 'ubc-llm-sandbox',
				// Include relevant OpenAI-compatible fields if needed
				id: response.id,
				created: response.created,
			},
		};
	}

	private normalizeEmbeddingResponse(
		response: OpenAI.Embeddings.CreateEmbeddingResponse
	): EmbeddingResponse {
		return {
			embeddings: response.data.map((item) => item.embedding),
			model: response.model,
			usage: {
				promptTokens: response.usage?.prompt_tokens,
				totalTokens: response.usage?.total_tokens,
			},
			metadata: {
				provider: 'ubc-llm-sandbox',
			},
		};
	}

	private handleError(error: any): Error {
		if (error instanceof OpenAI.APIError) {
			// Use a generic message but include specifics in details
			return new APIError(`UBC LLM Sandbox API Error: ${error.message}`, error.status || 500, {
				provider: 'ubc-llm-sandbox',
				type: error.name,
				code: error.code,
				param: error.param,
				originalError: error
			});
		}
		// Handle potential network errors or other issues
		if (error instanceof Error) {
			return new APIError(`UBC LLM Sandbox Provider Error: ${error.message}`, 500, { provider: 'ubc-llm-sandbox', originalError: error });
		}
		return new APIError('Unknown error occurred while calling UBC LLM Sandbox API', 500, { provider: 'ubc-llm-sandbox' });
	}
}
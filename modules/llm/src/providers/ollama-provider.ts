import { Provider } from './provider-interface';
import {
	LLMOptions,
	LLMResponse,
	Message,
	EmbeddingOptions,
	EmbeddingResponse,
} from '../types';
import { LoggerInterface, APIError } from '@ubc-genai-toolkit/core';
// Import the Ollama class specifically
import { Ollama, EmbedResponse } from 'ollama';

export class OllamaProvider implements Provider {
	// Store an instance of the Ollama class
	private client: Ollama;
	private logger: LoggerInterface;
	private defaultModel: string;
	private embeddingModel?: string;
	private endpoint: string; // Keep endpoint for logging/reference if needed

	constructor(
		endpoint: string,
		defaultModel: string,
		logger: LoggerInterface,
		options?: { embeddingModel?: string }
	) {
		// Instantiate the client here with the host
		this.client = new Ollama({ host: endpoint });
		this.endpoint = endpoint;
		this.defaultModel = defaultModel;
		this.embeddingModel = options?.embeddingModel;
		this.logger = logger;
		this.logger.debug('OllamaProvider initialized', {
			endpoint,
			defaultModel,
			embeddingModel: this.embeddingModel,
		});
	}

	getName(): string {
		return 'ollama';
	}

	async getAvailableModels(): Promise<string[]> {
		try {
			this.logger.debug('Fetching available Ollama models', { endpoint: this.endpoint });
			// Use the stored client instance directly
			const response = await this.client.list();
			return response.models.map((model: any) => model.name);
		} catch (error) {
			this.logger.error('Error fetching Ollama models', { error });
			throw this.handleError(error);
		}
	}

	async sendMessage(message: string, options?: LLMOptions): Promise<LLMResponse> {
		const messages: Message[] = [{ role: 'user', content: message }];

		if (options?.systemPrompt) {
			messages.unshift({ role: 'system', content: options.systemPrompt });
		}

		this.logger.debug('Sending single message via sendConversation', { messageCount: messages.length });
		return this.sendConversation(messages, options);
	}

	async sendConversation(messages: Message[], options?: LLMOptions): Promise<LLMResponse> {
		const model = options?.model || this.defaultModel;
		this.logger.debug('Sending conversation to Ollama', { model, messageCount: messages.length, options });

		try {
			// Map messages
			const ollamaMessages = messages.map(msg => ({
				role: msg.role,
				content: msg.content,
			}));

			// Map options
			const ollamaOptions: Record<string, unknown> = {};
			if (options?.temperature !== undefined) ollamaOptions.temperature = options.temperature;
			if (options?.maxTokens !== undefined) ollamaOptions.num_predict = options.maxTokens;
			if (options?.systemPrompt && !messages.some(m => m.role === 'system')) {
				ollamaMessages.unshift({ role: 'system', content: options.systemPrompt });
			}

			// Use the stored client instance directly
			const response = await this.client.chat({
				model: model,
				messages: ollamaMessages,
				stream: false,
				format: options?.responseFormat === 'json' ? 'json' : undefined,
				options: ollamaOptions,
			});

			return this.normalizeResponse(response, model);
		} catch (error) {
			this.logger.error('Error sending conversation to Ollama', { error });
			throw this.handleError(error);
		}
	}

	async streamConversation(
		messages: Message[],
		callback: (chunk: string) => void,
		options?: LLMOptions
	): Promise<LLMResponse> {
		const model = options?.model || this.defaultModel;
		this.logger.debug('Streaming conversation from Ollama', { model, messageCount: messages.length, options });

		const ollamaMessages = messages.map(msg => ({
			role: msg.role,
			content: msg.content,
		}));

		const ollamaOptions: Record<string, unknown> = {};
		if (options?.temperature !== undefined) ollamaOptions.temperature = options.temperature;
		if (options?.maxTokens !== undefined) ollamaOptions.num_predict = options.maxTokens;
		 if (options?.systemPrompt && !messages.some(m => m.role === 'system')) {
			ollamaMessages.unshift({ role: 'system', content: options.systemPrompt });
		}

		let fullContent = '';
		let finalResponseMetadata: Record<string, any> | null = null;

		try {
			// Use the stored client instance directly
			const stream = await this.client.chat({
				model: model,
				messages: ollamaMessages,
				stream: true,
				format: options?.responseFormat === 'json' ? 'json' : undefined,
				options: ollamaOptions,
			});

			for await (const part of stream) {
				const contentChunk = part.message?.content || '';
				if (contentChunk) {
					fullContent += contentChunk;
					callback(contentChunk);
				}
				if (part.done) {
					finalResponseMetadata = {
						 provider: 'ollama',
						...(part?.done_reason && { done_reason: part.done_reason }),
						...(part?.total_duration && { total_duration: part.total_duration }),
						...(part?.load_duration && { load_duration: part.load_duration }),
						...(part?.prompt_eval_count && { prompt_eval_count: part.prompt_eval_count }),
						...(part?.prompt_eval_duration && { prompt_eval_duration: part.prompt_eval_duration }),
						 ...(part?.eval_count && { eval_count: part.eval_count }),
						...(part?.eval_duration && { eval_duration: part.eval_duration }),
					};
				}
			}

			return {
				content: fullContent,
				model: model,
				usage: {
					promptTokens: finalResponseMetadata?.prompt_eval_count,
					completionTokens: finalResponseMetadata?.eval_count,
					totalTokens: undefined,
				},
				metadata: finalResponseMetadata || { provider: 'ollama' },
			};
		} catch (error) {
			this.logger.error('Error streaming conversation from Ollama', { error });
			throw this.handleError(error);
		}
	}

	async embed(
		texts: string[],
		options?: EmbeddingOptions
	): Promise<EmbeddingResponse> {
		const model = options?.model || this.embeddingModel || 'nomic-embed-text';
		this.logger.debug('Generating embeddings with Ollama', {
			model,
			textCount: texts.length,
			options,
		});

		try {
			// Pass the whole array to ollama.embed
			const response: EmbedResponse = await this.client.embed({
				model: model,
				input: texts, // Use 'input' and pass the array
				truncate: options?.truncate,
			});

			// The response directly contains the array of embeddings
			return {
				embeddings: response.embeddings, // Use the embeddings array from the response
				model: model,
				usage: undefined, // Ollama embed response doesn't include usage
				metadata: { provider: 'ollama' },
			};
		} catch (error) {
			this.logger.error('Error generating embeddings with Ollama', { error });
			throw this.handleError(error);
		}
	}

	// --- Helper Methods ---

	private handleError(error: any): Error {
		this.logger.error('Error interacting with Ollama API', { error });

		if (error && typeof error === 'object' && error.status && error.message) {
			return new APIError(`Ollama API Error: ${error.message}`, error.status, {
				originalError: error,
				provider: 'ollama'
			});
		}
		if (error instanceof Error) {
			return new APIError(`Ollama Provider Error: ${error.message}`, 500, { originalError: error, provider: 'ollama' });
		}
		return new APIError('Unknown error occurred while calling Ollama API', 500, { provider: 'ollama' });
	}

	private normalizeResponse(response: any, model: string): LLMResponse {
		return {
			content: response?.message?.content || '',
			model: response?.model || model,
			usage: {
				promptTokens: response?.prompt_eval_count,
				completionTokens: response?.eval_count,
				totalTokens: undefined,
			},
			metadata: {
				provider: 'ollama',
				...(response?.done && { done: response.done }),
				...(response?.done_reason && { done_reason: response.done_reason }),
				...(response?.total_duration && { total_duration: response.total_duration }),
				...(response?.load_duration && { load_duration: response.load_duration }),
				...(response?.prompt_eval_duration && { prompt_eval_duration: response.prompt_eval_duration }),
				...(response?.eval_duration && { eval_duration: response.eval_duration }),
			},
		};
	}
}
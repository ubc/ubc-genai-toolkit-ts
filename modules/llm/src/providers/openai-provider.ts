import OpenAI from 'openai';
import { Provider } from './provider-interface';
import {
	LLMOptions,
	LLMResponse,
	Message,
	EmbeddingOptions,
	EmbeddingResponse,
} from '../types';
import { LoggerInterface } from '@ubc-genai-toolkit/core';
import { APIError } from '@ubc-genai-toolkit/core';

export class OpenAIProvider implements Provider {
	private client: OpenAI;
	private logger: LoggerInterface;
	private defaultModel: string;
	private embeddingModel?: string;

	constructor(
		apiKey: string,
		defaultModel: string,
		logger: LoggerInterface,
		options?: {
			endpoint?: string;
			embeddingModel?: string;
		}
	) {
		this.client = new OpenAI({
			apiKey,
			...(options?.endpoint ? { baseURL: options.endpoint } : {}),
		});
		this.defaultModel = defaultModel;
		this.embeddingModel = options?.embeddingModel;
		this.logger = logger;
	}

	getName(): string {
		return 'openai';
	}

	async getAvailableModels(): Promise<string[]> {
		try {
			const models = await this.client.models.list();
			return models.data.map((model) => model.id);
		} catch (error) {
			this.logger.error('Error fetching OpenAI models', { error });
			throw this.handleError(error);
		}
	}

	async sendMessage(
		message: string,
		options?: LLMOptions
	): Promise<LLMResponse> {
		const messages = [{ role: 'user', content: message }];

		if (options?.systemPrompt) {
			messages.unshift({ role: 'system', content: options.systemPrompt });
		}

		return this.sendConversation(messages as Message[], options);
	}

	async sendConversation(
		messages: Message[],
		options?: LLMOptions
	): Promise<LLMResponse> {
		try {
			const model = options?.model || this.defaultModel;

			// Convert to OpenAI format
			const openaiMessages = messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

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
			this.logger.error('Error calling OpenAI API', { error });
			throw this.handleError(error);
		}
	}

	async streamConversation(
		messages: Message[],
		callback: (chunk: string) => void,
		options?: LLMOptions
	): Promise<LLMResponse> {
		try {
			const model = options?.model || this.defaultModel;

			// Convert to OpenAI format
			const openaiMessages = messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			const stream = await this.client.chat.completions.create({
				model,
				messages: openaiMessages,
				temperature: options?.temperature,
				max_tokens: options?.maxTokens,
				stream: true,
			});

			let fullContent = '';
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || '';
				if (content) {
					fullContent += content;
					callback(content);
				}
			}

			return {
				content: fullContent,
				model: model,
				metadata: { provider: 'openai' },
			};
		} catch (error) {
			this.logger.error('Error streaming from OpenAI API', { error });
			throw this.handleError(error);
		}
	}

	async embed(
		texts: string[],
		options?: EmbeddingOptions
	): Promise<EmbeddingResponse> {
		try {
			const model = options?.model || this.embeddingModel || 'text-embedding-3-small';

			// Extract provider-specific options (like dimensions)
			const { truncate, ...providerOptions } = options || {};
			delete providerOptions.model; // Don't pass our internal model option directly

			const response = await this.client.embeddings.create({
				model: model,
				input: texts,
				...providerOptions, // Pass any remaining options (like dimensions)
			});

			return this.normalizeEmbeddingResponse(response);
		} catch (error) {
			this.logger.error('Error calling OpenAI Embeddings API', { error });
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
				provider: 'openai',
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
				provider: 'openai',
			},
		};
	}

	private handleError(error: any): Error {
		if (error instanceof OpenAI.APIError) {
			return new APIError(error.message, error.status || 500, {
				type: error.name,
				code: error.code,
				param: error.param,
			});
		}
		return new APIError('Unknown error occurred while calling OpenAI API');
	}
}
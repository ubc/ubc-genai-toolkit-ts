/**
 * @fileoverview Implements the Provider interface for the UBC LLM Sandbox service.
 *
 * The UBC LLM Sandbox provides access to various large language models hosted
 * within UBC's infrastructure. This provider acts as a facade, interacting
 * with the underlying service (which uses a LiteLLM proxy compatible with the
 * OpenAI API) to offer a standardized way for applications to use these models
 * for chat completions and embeddings.
 *
 * Key Features:
 * - Connects to a specified UBC LLM Sandbox endpoint.
 * - Uses an API key for authentication.
 * - Supports standard chat completion (`sendMessage`, `sendConversation`).
 * - Supports streaming chat completion (`streamConversation`).
 * - Supports text embedding generation (`embed`).
 * - Maps UBC LLM Sandbox API responses and errors to the toolkit's standard interfaces.
 * - Requires an explicit endpoint URL during instantiation, unlike some other providers.
 *
 * @see {Provider} Interface definition for LLM providers.
 * @see {@link https://developer.ubc.ca/sandbox/llm} For more information about the UBC LLM Sandbox.
 */
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

/**
 * Provides access to Large Language Models (LLMs) via the UBC LLM Sandbox service.
 *
 * This class implements the `Provider` interface, offering methods to interact
 * with LLMs for tasks like generating text responses (chat completions) and
 * creating text embeddings. It specifically targets the UBC LLM Sandbox,
 * which uses a LiteLLM proxy layer presenting an OpenAI-compatible API.
 *
 * Usage typically involves creating an instance with the necessary API key,
 * endpoint URL, a default model name, and a logger. Once instantiated, methods
 * like `sendConversation` or `embed` can be called.
 *
 * @implements {Provider}
 */
export class UbcLlmSandboxProvider implements Provider {
	private client: OpenAI;
	private logger: LoggerInterface;
	private defaultModel: string;
	private embeddingModel?: string;
	private endpoint: string; // Keep endpoint for logging/reference

	/**
	 * Initializes a new instance of the UbcLlmSandboxProvider.
	 *
	 * Configures the provider to communicate with a specific UBC LLM Sandbox endpoint.
	 * Requires an API key for authentication and an endpoint URL. A default model must
	 * be specified for chat completions when no model is provided in the options.
	 * An optional embedding model can also be specified.
	 *
	 * @param {string} apiKey - The API key for accessing the UBC LLM Sandbox.
	 * @param {string} endpoint - The base URL of the UBC LLM Sandbox API endpoint. This is mandatory.
	 * @param {string} defaultModel - The identifier of the default LLM to use for chat completions if not specified in options.
	 * @param {LoggerInterface} logger - An instance of a logger conforming to the LoggerInterface for logging messages.
	 * @param {object} [options] - Optional configuration settings.
	 * @param {string} [options.embeddingModel] - The identifier of the default model to use for embeddings if not specified in options.
	 * @throws {APIError} If the endpoint URL is not provided.
	 */
	constructor(
		apiKey: string,
		endpoint: string, // Endpoint is mandatory for this provider
		defaultModel: string,
		logger: LoggerInterface,
		options?: { embeddingModel?: string }
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
		this.embeddingModel = options?.embeddingModel;
		this.logger = logger;
		this.logger.debug('UbcLlmSandboxProvider initialized', {
			endpoint,
			defaultModel,
			embeddingModel: this.embeddingModel,
		});
	}

	/**
	 * Gets the unique identifier name for this provider.
	 *
	 * @returns {string} The name 'ubc-llm-sandbox'.
	 */
	getName(): string {
		return 'ubc-llm-sandbox';
	}

	/**
	 * Retrieves a list of model identifiers available through the configured UBC LLM Sandbox endpoint.
	 *
	 * This method queries the sandbox's `/models` endpoint (via the OpenAI client)
	 * to fetch the list of currently accessible models.
	 *
	 * @returns {Promise<string[]>} A promise that resolves with an array of available model ID strings.
	 * @throws {APIError} If there's an error communicating with the sandbox API or parsing the response.
	 */
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

	/**
	 * Sends a single user message to the LLM and retrieves the response.
	 *
	 * This is a convenience method that wraps `sendConversation`. It constructs
	 * a simple conversation history containing only the user's message (and an optional
	 * system prompt) and sends it to the LLM.
	 *
	 * @param {string} message - The user's message content.
	 * @param {LLMOptions} [options] - Optional parameters for the LLM call (e.g., model, temperature, system prompt).
	 * @returns {Promise<LLMResponse>} A promise that resolves with the LLM's response, normalized to the toolkit's format.
	 * @throws {APIError} If the underlying API call fails.
	 */
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

	/**
	 * Sends a multi-turn conversation history to the LLM and retrieves the response.
	 *
	 * This method allows for sending a structured conversation (including system, user,
	 * and assistant messages) to the LLM. It handles mapping the toolkit's `Message`
	 * format to the OpenAI-compatible format expected by the sandbox endpoint.
	 *
	 * @param {Message[]} messages - An array of message objects representing the conversation history.
	 * @param {LLMOptions} [options] - Optional parameters for the LLM call (e.g., model, temperature, maxTokens, responseFormat, system prompt).
	 * @returns {Promise<LLMResponse>} A promise that resolves with the LLM's response, normalized to the toolkit's format.
	 * @throws {APIError} If the underlying API call fails.
	 */
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

	/**
	 * Sends a conversation history to the LLM and streams the response back chunk by chunk.
	 *
	 * Useful for providing real-time feedback to the user as the LLM generates its response.
	 * It invokes the provided callback function for each piece of text received from the stream.
	 * The final resolved promise contains the complete concatenated response and metadata,
	 * although usage statistics might be incomplete due to limitations in the streaming API
	 * provided by the underlying LiteLLM proxy.
	 *
	 * @param {Message[]} messages - An array of message objects representing the conversation history.
	 * @param {(chunk: string) => void} callback - A function that will be called with each chunk of text received from the stream.
	 * @param {LLMOptions} [options] - Optional parameters for the LLM call (e.g., model, temperature, maxTokens, system prompt).
	 * @returns {Promise<LLMResponse>} A promise that resolves with the final aggregated response object once the stream is complete. Usage data may be incomplete.
	 * @throws {APIError} If the underlying API call fails or an error occurs during streaming.
	 */
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

	/**
	 * Generates embeddings for a list of text inputs using a specified or default embedding model.
	 *
	 * Embeddings are numerical vector representations of text, useful for tasks like
	 * semantic search, clustering, and similarity comparisons. This method sends the
	 * input texts to the sandbox's embedding endpoint.
	 *
	 * @param {string[]} texts - An array of strings for which to generate embeddings.
	 * @param {EmbeddingOptions} [options] - Optional parameters for the embedding call (e.g., model, dimensions).
	 * @returns {Promise<EmbeddingResponse>} A promise that resolves with the generated embeddings and metadata, normalized to the toolkit's format.
	 * @throws {APIError} If the underlying API call fails.
	 */
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

	/**
	 * Normalizes the response from an OpenAI-compatible chat completion API call
	 * into the toolkit's standard `LLMResponse` format.
	 *
	 * This ensures consistency across different providers. It extracts the main content,
	 * model identifier, usage statistics, and adds provider-specific metadata.
	 *
	 * @param {OpenAI.Chat.Completions.ChatCompletion} response - The raw response object from the OpenAI client.
	 * @returns {LLMResponse} The normalized response object.
	 * @private
	 */
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

	/**
	 * Normalizes the response from an OpenAI-compatible embeddings API call
	 * into the toolkit's standard `EmbeddingResponse` format.
	 *
	 * Extracts the embedding vectors, model identifier, and usage statistics,
	 * presenting them in a consistent structure.
	 *
	 * @param {OpenAI.Embeddings.CreateEmbeddingResponse} response - The raw response object from the OpenAI client's embedding creation method.
	 * @returns {EmbeddingResponse} The normalized embedding response object.
	 * @private
	 */
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

	/**
	 * Handles errors that occur during API interactions, attempting to normalize them
	 * into the toolkit's standard `APIError` format.
	 *
	 * It specifically checks for `OpenAI.APIError` instances to extract more detailed
	 * information like status code and error type. Other errors are wrapped in a
	 * generic `APIError`.
	 *
	 * @param {any} error - The error object caught during an API call.
	 * @returns {APIError} A normalized `APIError` object.
	 * @private
	 */
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
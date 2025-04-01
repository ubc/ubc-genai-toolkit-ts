import { Provider } from './provider-interface';
import { LLMOptions, LLMResponse, Message } from '../types';
import {
	LoggerInterface,
	APIError,
	ConfigurationError,
} from '@ubc-genai-toolkit/core';
import Anthropic from '@anthropic-ai/sdk';
import type {
	MessageParam,
	MessageCreateParamsNonStreaming,
	MessageCreateParamsStreaming,
} from '@anthropic-ai/sdk/resources/messages';

/**
 * Implements the Provider interface for interacting with Anthropic models (e.g., Claude).
 */
export class AnthropicProvider implements Provider {
	private client: Anthropic;
	private logger: LoggerInterface;
	private defaultModel: string;

	/**
	 * Initializes the Anthropic provider.
	 * @param apiKey - The Anthropic API key.
	 * @param defaultModel - The default model ID to use if not specified in options.
	 * @param logger - An instance conforming to LoggerInterface for logging.
	 */
	constructor(
		apiKey: string,
		defaultModel: string,
		logger: LoggerInterface
	) {
		this.client = new Anthropic({ apiKey });
		this.defaultModel = defaultModel;
		this.logger = logger;
		this.logger.debug('AnthropicProvider initialized', { defaultModel });
	}

	/**
	 * Gets the name of the provider.
	 * @returns The string 'anthropic'.
	 */
	getName(): string {
		return 'anthropic';
	}

	/**
	 * Fetches the list of available model IDs from the Anthropic API.
	 * Handles pagination automatically.
	 * @returns A promise resolving to an array of model ID strings.
	 */
	async getAvailableModels(): Promise<string[]> {
		this.logger.debug('Fetching available Anthropic models');
		try {
			const modelInfos: Anthropic.Models.ModelInfo[] = [];
			// Use for await...of to automatically handle pagination of models.list()
			for await (const modelInfo of this.client.models.list()) {
				modelInfos.push(modelInfo);
			}
			const modelIds = modelInfos.map((model) => model.id);
			this.logger.debug(`Found ${modelIds.length} Anthropic models`);
			return modelIds;
		} catch (error) {
			this.logger.error('Error fetching Anthropic models', { error });
			throw this.handleError(error);
		}
	}

	/**
	 * Sends a single user message to the LLM and gets a response.
	 * This is a convenience method that delegates to `sendConversation`.
	 * @param message - The user message content.
	 * @param options - Optional LLM parameters.
	 * @returns A promise resolving to the LLMResponse.
	 */
	async sendMessage(
		message: string,
		options?: LLMOptions
	): Promise<LLMResponse> {
		this.logger.debug('sendMessage: Delegating to sendConversation');
		const messages: Message[] = [{ role: 'user', content: message }];
		// System prompt, if provided in options, is handled by sendConversation
		return this.sendConversation(messages, options);
	}

	/**
	 * Sends a full conversation history (sequence of messages) to the Anthropic API.
	 * Handles mapping toolkit message format and options to the Anthropic SDK format.
	 * @param messages - An array of Message objects representing the conversation history.
	 * @param options - Optional LLM parameters (model, temperature, maxTokens, systemPrompt, etc.).
	 * @returns A promise resolving to the LLMResponse containing the assistant's reply.
	 */
	async sendConversation(
		messages: Message[],
		options?: LLMOptions
	): Promise<LLMResponse> {
		const model = options?.model || this.defaultModel;
		const systemPrompt = options?.systemPrompt; // Extract system prompt

		this.logger.debug('Sending conversation to Anthropic', {
			model,
			messageCount: messages.length,
			hasSystemPrompt: !!systemPrompt,
			// Avoid logging potentially sensitive options content directly
			// options: options // Consider selective logging if needed
		});

		// Filter out any 'system' messages from the main array, as Anthropic uses a top-level 'system' parameter.
		// Map roles 'user' and 'assistant' which align directly.
		const anthropicMessages: MessageParam[] = messages
			// Use a type predicate to assure TypeScript the role is narrowed after filtering.
			.filter((msg): msg is Message & { role: 'user' | 'assistant' } => msg.role !== 'system')
			.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

		try {
			// Construct parameters for the Anthropic API call.
			const params: MessageCreateParamsNonStreaming = {
				model: model,
				messages: anthropicMessages,
				// Anthropic requires max_tokens. Use provided value or a default.
				// 4096 is a common default for Claude 3 models, adjust if necessary.
				max_tokens: options?.maxTokens || 4096,
				temperature: options?.temperature,
				// Pass the extracted system prompt directly to the 'system' parameter.
				system: systemPrompt,
				stream: false,
				// TODO: Potentially map other options like stop_sequences if added to LLMOptions
			};

			const response = await this.client.messages.create(params);

			// Normalize the Anthropic response to the toolkit's LLMResponse format.
			return this.normalizeResponse(response);
		} catch (error) {
			this.logger.error('Error sending conversation to Anthropic', { error });
			throw this.handleError(error);
		}
	}

	/**
	 * Sends a conversation history to the Anthropic API and streams the response.
	 * Chunks of the response are passed to the provided callback function.
	 * @param messages - An array of Message objects representing the conversation history.
	 * @param callback - A function to be called with each received chunk of text.
	 * @param options - Optional LLM parameters.
	 * @returns A promise resolving to the final LLMResponse containing the accumulated content (usage data will be undefined).
	 */
	async streamConversation(
		messages: Message[],
		callback: (chunk: string) => void,
		options?: LLMOptions
	): Promise<LLMResponse> {
		const model = options?.model || this.defaultModel;
		const systemPrompt = options?.systemPrompt;

		this.logger.debug('Streaming conversation from Anthropic', {
			model,
			messageCount: messages.length,
			hasSystemPrompt: !!systemPrompt,
		});

		// Filter system messages and map roles, same as sendConversation.
		const anthropicMessages: MessageParam[] = messages
			.filter((msg): msg is Message & { role: 'user' | 'assistant' } => msg.role !== 'system')
			.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

		let fullContent = ''; // Accumulates the full response text from stream chunks.

		try {
			// Construct parameters, ensuring stream is set to true.
			const params: MessageCreateParamsStreaming = {
				model: model,
				messages: anthropicMessages,
				max_tokens: options?.maxTokens || 4096,
				temperature: options?.temperature,
				system: systemPrompt,
				stream: true,
			};

			const stream = await this.client.messages.create(params);

			// Process the stream events asynchronously.
			for await (const event of stream) {
				// We are interested in the text delta events.
				if (
					event.type === 'content_block_delta' &&
					event.delta.type === 'text_delta'
				) {
					const chunk = event.delta.text;
					fullContent += chunk;
					callback(chunk); // Invoke the callback with the new chunk.
				}
				// Note: Other events like 'message_start', 'message_delta', 'message_stop'
				// are available but not used here to keep the implementation focused on text streaming.
				// Usage information is typically not fully available until the 'message_stop' event in Anthropic's stream,
				// so we return undefined usage for simplicity, matching Ollama provider behavior.
			}

			this.logger.debug('Anthropic stream finished');

			// Return the final response structure after the stream is complete.
			return {
				content: fullContent,
				model: model,
				usage: {
					// Usage data is not reliably collected during the stream in this implementation.
					promptTokens: undefined,
					completionTokens: undefined,
					totalTokens: undefined,
				},
				metadata: { provider: 'anthropic' }, // Basic metadata
			};
		} catch (error) {
			this.logger.error('Error streaming conversation from Anthropic', {
				error,
			});
			throw this.handleError(error);
		}
	}

	// --- Helper Methods ---

	/**
	 * Normalizes the response object from the Anthropic API (`Anthropic.Message`)
	 * into the toolkit's standard `LLMResponse` format.
	 * @param response - The response object from `client.messages.create`.
	 * @returns An LLMResponse object.
	 */
	private normalizeResponse(response: Anthropic.Message): LLMResponse {
		// Extract text content. Assumes the primary response is in the first 'text' type content block.
		// More complex handling might be needed if multiple text blocks or other types (tool_use) are expected.
		const textContent =
			response.content.find((block) => block.type === 'text')?.text || '';

		// Extract usage data, calculate total, and handle potential null/undefined values from the API.
		const promptTokens = response.usage?.input_tokens ?? undefined;
		const completionTokens = response.usage?.output_tokens ?? undefined;
		const totalTokens =
			promptTokens !== undefined && completionTokens !== undefined
				? promptTokens + completionTokens
				: undefined;

		return {
			content: textContent,
			model: response.model,
			usage: {
				promptTokens: promptTokens,
				completionTokens: completionTokens,
				totalTokens: totalTokens,
			},
			metadata: {
				provider: 'anthropic',
				// Include potentially useful metadata from the Anthropic response.
				id: response.id,
				stop_reason: response.stop_reason,
				stop_sequence: response.stop_sequence,
			},
		};
	}

	/**
	 * Handles errors thrown by the Anthropic SDK or other issues during API interaction.
	 * Wraps errors in the toolkit's standard `APIError`.
	 * @param error - The error object caught.
	 * @returns An instance of `APIError`.
	 */
	private handleError(error: any): Error {
		this.logger.error('Anthropic API Error encountered', { error });

		if (error instanceof Anthropic.APIError) {
			// Log specific known details from Anthropic API errors.
			this.logger.error('Anthropic APIError details', {
				status: error.status,
				name: error.name,
				message: error.message,
			});
			// Create a standardized APIError for the toolkit.
			return new APIError(error.message, error.status || 500, {
				provider: 'anthropic',
				originalError: error, // Preserve the original error for deeper inspection if needed.
				errorName: error.name, // Include the specific error name.
			});
		}
		// Handle non-API errors (e.g., network issues) or unexpected errors.
		const message = error instanceof Error ? error.message : 'Unknown error occurred';
		return new APIError(
			`Anthropic Provider Error: ${message}`,
			500, // Assume internal server error for unknown issues.
			{ provider: 'anthropic', originalError: error }
		);
	}
} // End of class AnthropicProvider
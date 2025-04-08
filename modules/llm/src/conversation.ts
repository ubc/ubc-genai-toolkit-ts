/**
 * @fileoverview Defines the ConversationImpl class, which manages a conversation history
 * and interacts with an LLM via a ConversationFactory.
 */
import { Message, LLMOptions, LLMResponse } from './types';
import { Conversation, ConversationFactory } from './conversation-interface';

/**
 * Implements the Conversation interface to manage a sequence of messages
 * and facilitate interaction with a Large Language Model (LLM).
 * It uses a ConversationFactory to handle the actual communication (sending/streaming)
 * with the underlying LLM service.
 */
export class ConversationImpl implements Conversation {
	/** Stores the sequence of messages in the conversation. */
	private messages: Message[] = [];
	/** The factory responsible for communication with the LLM service. */
	private factory: ConversationFactory;

	/**
	 * Creates an instance of ConversationImpl.
	 * @param {ConversationFactory} factory - The factory used to send/stream the conversation to the LLM.
	 */
	constructor(factory: ConversationFactory) {
		this.factory = factory;
	}

	/**
	 * Adds a new message to the conversation history.
	 * @param {'user' | 'assistant' | 'system'} role - The role of the message sender.
	 * @param {string} content - The textual content of the message.
	 */
	addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
		this.messages.push({
			role,
			content,
			timestamp: new Date().toISOString(), // Record the time the message was added
		});
	}

	/**
	 * Retrieves a copy of the current conversation history.
	 * @returns {Message[]} An array containing all messages in the conversation so far.
	 *                     Returns a shallow copy to prevent external modification of the internal state.
	 */
	getHistory(): Message[] {
		// Return a shallow copy to prevent direct modification of the internal messages array
		return [...this.messages];
	}

	/**
	 * Sends the entire conversation history to the LLM for a response.
	 * The LLM's response is then added to the history as an 'assistant' message.
	 * @param {LLMOptions} [options] - Optional parameters to customize the LLM request (e.g., temperature, max tokens).
	 * @returns {Promise<LLMResponse>} A promise that resolves with the LLM's response, including content and potentially other metadata.
	 */
	async send(options?: LLMOptions): Promise<LLMResponse> {
		// Use the factory to send the conversation messages.
		// Cast to 'any' temporarily as the specific methods (sendConversation, streamConversation)
		// might not be explicitly defined on the ConversationFactory interface itself,
		// but are expected to be implemented by the concrete factory provided.
		const response = await (this.factory as any).sendConversation(
			this.messages,
			options
		);

		// Add the assistant's response to the conversation history
		this.addMessage('assistant', response.content);

		return response;
	}

	/**
	 * Sends the conversation history to the LLM and streams the response back.
	 * Chunks of the response are passed to the provided callback function as they arrive.
	 * The complete response is added to the history as an 'assistant' message once the stream finishes.
	 * @param {(chunk: string) => void} callback - A function to be called with each chunk of the streamed response.
	 * @param {LLMOptions} [options] - Optional parameters to customize the LLM request.
	 * @returns {Promise<LLMResponse>} A promise that resolves with the final LLM response object (containing the full content) once the stream is complete.
	 */
	async stream(
		callback: (chunk: string) => void,
		options?: LLMOptions
	): Promise<LLMResponse> {
		let fullContent = '';

		// Wrap the user's callback to accumulate the full response content
		// while still forwarding individual chunks.
		const wrappedCallback = (chunk: string) => {
			fullContent += chunk;
			callback(chunk); // Pass the chunk to the original callback
		};

		// Use the factory to stream the conversation.
		// Cast to 'any' for the same reason as in the send method.
		const response = await (this.factory as any).streamConversation(
			this.messages,
			wrappedCallback, // Use the wrapped callback
			options
		);

		// Although the response object from streamConversation likely contains the full content already,
		// we add the message using the accumulated fullContent for consistency,
		// ensuring the history reflects exactly what was streamed.
		// Note: Depending on the implementation of streamConversation, response.content might be redundant here.
		// However, adding the message based on accumulated chunks is safer.
		this.addMessage('assistant', fullContent); // Use accumulated content

		// It's assumed streamConversation returns a response object similar to sendConversation,
		// potentially containing metadata even if content was streamed. Return this object.
		return response;
	}
}
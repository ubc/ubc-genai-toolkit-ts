import { Message, LLMOptions, LLMResponse } from './types';
import { Conversation, ConversationFactory } from './conversation-interface';

/**
 * Implementation of the Conversation interface
 */
export class ConversationImpl implements Conversation {
	private messages: Message[] = [];
	private factory: ConversationFactory;

	constructor(factory: ConversationFactory) {
		this.factory = factory;
	}

	/**
	 * Add a message to the conversation
	 */
	addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
		this.messages.push({
			role,
			content,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Get the conversation history
	 */
	getHistory(): Message[] {
		return [...this.messages];
	}

	/**
	 * Send the conversation to the LLM and get a response
	 */
	async send(options?: LLMOptions): Promise<LLMResponse> {
		const response = await (this.factory as any).sendConversation(
			this.messages,
			options
		);

		// Add the assistant's response to the conversation
		this.addMessage('assistant', response.content);

		return response;
	}

	/**
	 * Stream the conversation to the LLM
	 */
	async stream(
		callback: (chunk: string) => void,
		options?: LLMOptions
	): Promise<LLMResponse> {
		let fullContent = '';

		// Create a wrapper callback that builds the full content
		const wrappedCallback = (chunk: string) => {
			fullContent += chunk;
			callback(chunk);
		};

		const response = await (this.factory as any).streamConversation(
			this.messages,
			wrappedCallback,
			options
		);

		// Add the assistant's response to the conversation
		this.addMessage('assistant', response.content);

		return response;
	}
}
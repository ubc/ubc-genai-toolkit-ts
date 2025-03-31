/**
 * @fileoverview Defines the main application class for the LLM Conversation Example.
 *
 * This class orchestrates the conversation flow, including:
 * - Initializing the LLMModule based on provided configuration.
 * - Setting up a conversation with an initial system message.
 * - Handling the user input loop.
 * - Sending user messages to the LLM.
 * - Streaming and displaying the LLM's response.
 * - Handling exit commands and errors.
 */

import readlineSync from 'readline-sync';
import { LLMModule, LLMConfig } from '@ubc-genai-toolkit/llm';
import { ToolkitError } from '@ubc-genai-toolkit/core';

/**
 * Represents the core logic for the interactive LLM conversation application.
 */
export class ConversationApp {
	// Instance of the LLMModule to interact with the configured LLM provider.
	private llm: LLMModule;

	/**
	 * Creates an instance of ConversationApp.
	 *
	 * @param {LLMConfig} config The configuration object used to initialize the LLMModule.
	 *                            This determines the provider, model, API keys/endpoints, etc.
	 */
	constructor(config: Partial<LLMConfig>) {
		// Initialize the LLMModule with the given configuration.
		// The LLMModule acts as a facade to the underlying LLM provider (OpenAI, Ollama, etc.).
		this.llm = new LLMModule(config);
	}

	/**
	 * Runs the main interactive conversation loop.
	 *
	 * - Displays a welcome message and the configured provider.
	 * - Creates a new conversation instance via the LLMModule.
	 * - Adds an initial system prompt to guide the LLM's behavior.
	 * - Enters a loop that:
	 *   - Prompts the user for input.
	 *   - Exits if the user types 'exit' or 'quit'.
	 *   - Adds the user's message to the conversation history.
	 *   - Streams the LLM's response back to the console.
	 * - Includes error handling for ToolkitErrors and other unexpected errors.
	 */
	async run(): Promise<void> {
		console.log(`=== UBC GenAI Toolkit - LLM Conversation Example ===`);
		// Display the name of the LLM provider being used (e.g., 'openai', 'ollama').
		console.log(`Provider: ${this.llm.getProviderName()}`);

		// Obtain a new Conversation object from the LLM module.
		// This object manages the message history for a single chat session.
		const conversation = this.llm.createConversation();

		// Add an initial system message to set the context or persona for the LLM.
		// This message is part of the history sent to the LLM but not typically displayed to the user.
		conversation.addMessage(
			'system',
			'You are a helpful assistant that provides clear, concise answers.'
		);

		try {
			// Start the interactive loop.
			while (true) {
				// Prompt the user for input using readline-sync.
				const userInput = readlineSync.question('\nYou: ');

				// Check for exit commands.
				if (
					userInput.toLowerCase() === 'exit' ||
					userInput.toLowerCase() === 'quit'
				) {
					console.log('Goodbye!');
					break; // Exit the loop.
				}

				// Add the user's input to the conversation history.
				conversation.addMessage('user', userInput);

				// Indicate that the assistant is generating a response.
				console.log('\nAssistant: ');

				// Call the conversation's stream method to send the history and get a streamed response.
				// The callback function `(chunk) => process.stdout.write(chunk)` prints each piece
				// of the response to the console as it arrives.
				// Options like `temperature` can be passed to control the LLM's generation.
				await conversation.stream(
					(chunk) => process.stdout.write(chunk),
					{ temperature: 0.7 } // Example LLM option
				);

				// Add a newline after the streamed response for better formatting.
				console.log('\n');
			}
		} catch (error) {
			// Handle errors gracefully.
			if (error instanceof ToolkitError) {
				// Specifically handle errors originating from the toolkit modules.
				// These errors have a code and potentially details.
				console.error(`Error: ${error.message} (Code: ${error.code})`);
				if (error.details) {
					console.error('Details:', error.details);
				}
			} else {
				// Handle any other unexpected errors.
				console.error('An unexpected error occurred:', error);
			}
		}
	}
}
/**
 * @fileoverview Defines the main application class for the Embedding CLI Example.
 *
 * This class orchestrates the interaction flow:
 * - Initializing the EmbeddingsModule based on provided configuration.
 * - Handling the user input loop.
 * - Calling the EmbeddingsModule to generate embeddings for user text.
 * - Displaying the results.
 * - Handling exit commands and errors.
 */

import readlineSync from 'readline-sync';
import {
	EmbeddingsModule,
	EmbeddingsConfig,
} from '@ubc-genai-toolkit/embeddings';
import { ToolkitError } from '@ubc-genai-toolkit/core';

/**
 * Represents the core logic for the interactive embedding generation application.
 */
export class EmbeddingApp {
	// Instance of the EmbeddingsModule to interact with the configured provider.
	private embeddingsModule!: EmbeddingsModule; // Definite assignment assertion
	private config: EmbeddingsConfig;
	private isInitialized = false;

	/**
	 * Creates an instance of EmbeddingApp.
	 *
	 * @param {EmbeddingsConfig} config The configuration object loaded from environment variables.
	 */
	constructor(config: EmbeddingsConfig) {
		this.config = config;
		// Initialization is deferred to an async method because EmbeddingsModule.create is async
	}

	/**
	 * Asynchronously initializes the EmbeddingsModule.
	 * This needs to be called before `run`.
	 */
	async initialize(): Promise<void> {
		try {
			this.embeddingsModule = await EmbeddingsModule.create(this.config);
			this.isInitialized = true;
		} catch (error) {
			console.error('Failed to initialize EmbeddingsModule:', error);
			// Propagate the error to prevent running the app in an uninitialized state
			throw error;
		}
	}

	/**
	 * Runs the main interactive loop for generating embeddings.
	 *
	 * - Displays a welcome message and the configured provider.
	 * - Enters a loop that:
	 *   - Prompts the user for text input.
	 *   - Exits if the user types 'exit' or 'quit'.
	 *   - Calls the `embeddingsModule.embed()` method.
	 *   - Displays the resulting embedding vector(s).
	 * - Includes error handling for ToolkitErrors and other unexpected errors.
	 */
	async run(): Promise<void> {
		if (!this.isInitialized) {
			console.error(
				'EmbeddingApp is not initialized. Call initialize() before run().'
			);
			process.exit(1);
		}

		console.log(
			`=== UBC GenAI Toolkit - Embedding CLI Example ===`
		);
		console.log(`Provider Type: ${this.config.providerType}`);
		if (this.config.providerType === 'ubc-genai-toolkit-llm') {
			console.log(`  LLM Provider: ${this.config.llmConfig?.provider}`);
            console.log(`  Embedding Model: ${this.config.llmConfig?.embeddingModel || '(Default for provider)'}`);
		} else if (this.config.providerType === 'fastembed') {
            console.log(`  FastEmbed Model: ${this.config.fastembedConfig?.model || '(Default: BGESmallENV15)'}`);
        }

		try {
			// Start the interactive loop.
			while (true) {
				// Prompt the user for input using readline-sync.
				const userInput = readlineSync.question('\nEnter text to embed (or type exit/quit): ');

				// Check for exit commands.
				if (
					userInput.toLowerCase() === 'exit' ||
					userInput.toLowerCase() === 'quit'
				) {
					console.log('Goodbye!');
					break; // Exit the loop.
				}

				if (!userInput.trim()) {
					console.log('Please enter some text.');
					continue;
				}

				console.log('\nGenerating embedding...');

				// Call the embed method of the initialized module.
				const embeddings = await this.embeddingsModule.embed(userInput);

				// Display the result (first embedding, dimensions, and truncated vector).
				if (embeddings && embeddings.length > 0) {
					const firstEmbedding = embeddings[0];
					const dimensions = firstEmbedding.length;
					const truncatedVector = firstEmbedding
						.slice(0, 10)
						.map((n) => n.toFixed(4))
						.join(', ');

					console.log(
						`Generated ${embeddings.length} embedding(s) with ${dimensions} dimensions.`
					);
					console.log(`First embedding vector (truncated): [${truncatedVector}...]`);
				} else {
					console.log('No embeddings were generated.');
				}

				console.log('\n');
			}
		} catch (error) {
			// Handle errors gracefully.
			if (error instanceof ToolkitError) {
				// Specifically handle errors originating from the toolkit modules.
				console.error(`\nError: ${error.message} (Code: ${error.code})`);
				if (error.details) {
					console.error('Details:', error.details);
				}
			} else {
				// Handle any other unexpected errors.
				console.error('\nAn unexpected error occurred:', error);
			}
		}
	}
}
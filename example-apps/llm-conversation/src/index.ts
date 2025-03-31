/**
 * @fileoverview Entry point for the LLM Conversation Example Application.
 *
 * This script initializes the application by loading configuration,
 * creating an instance of the ConversationApp, and running it.
 * It also includes basic error handling for application startup failures.
 */

import { loadConfig } from './config';
import { ConversationApp } from './app';

/**
 * Main asynchronous function to set up and run the application.
 */
async function main() {
	try {
		// Load configuration from environment variables using the config module.
		// This determines which LLM provider, model, keys, etc., to use.
		const config = loadConfig();

		// Create a new instance of the main application class, passing the loaded configuration.
		const app = new ConversationApp(config);

		// Start the application's main execution loop (handles user interaction, LLM calls).
		await app.run();

	} catch (error) {
		// Catch any errors that occur during initialization or setup.
		console.error('Failed to start application:', error);
		// Exit the process with an error code to indicate failure.
		process.exit(1);
	}
}

// Execute the main function to start the application.
main();
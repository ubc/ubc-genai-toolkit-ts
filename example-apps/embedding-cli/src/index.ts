/**
 * @fileoverview Entry point for the Embedding CLI Example Application.
 *
 * Initializes the application by loading configuration, creating an instance
 * of the EmbeddingApp, initializing it, and running it.
 * Includes basic error handling for application startup failures.
 */

import { loadConfig } from './config';
import { EmbeddingApp } from './app';

/**
 * Main asynchronous function to set up and run the application.
 */
async function main() {
	try {
		// Load configuration from environment variables.
		const config = loadConfig();

		// Create a new instance of the main application class.
		const app = new EmbeddingApp(config);

		// Initialize the application (this initializes the EmbeddingsModule).
		await app.initialize();

		// Start the application's main execution loop.
		await app.run();

	} catch (error) {
		// Catch any errors that occur during initialization or setup.
		console.error('Failed to start embedding application:', error);
		// Exit the process with an error code to indicate failure.
		process.exit(1);
	}
}

// Execute the main function to start the application.
main();
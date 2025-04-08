/**
 * @fileoverview Entry point for the RAG Example Application.
 *
 * Loads configuration, initializes the RAGApp, and runs it.
 */

import { loadConfig } from './config';
import { RAGApp } from './app';

/**
 * Main asynchronous function to set up and run the application.
 */
async function main() {
	try {
		// 1. Load configuration from environment variables
		const config = loadConfig();
		const logger = config.logger; // Get logger from loaded config

		// 2. Create the application instance
		const app = new RAGApp(config);

		// 3. Initialize the app (connects to RAG/LLM, indexes data)
		await app.initialize();

		// 4. Start the interactive query loop
		await app.run();

	} catch (error) {
		// Use console.error for startup errors as logger might not be available
		console.error('Failed to start RAG application:', error);
		process.exit(1); // Exit with failure code
	}
}

// Execute the main function
main();
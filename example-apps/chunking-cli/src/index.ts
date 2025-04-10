/**
 * @fileoverview Entry point for the Chunking CLI Example Application.
 *
 * Loads configuration, initializes the ChunkingApp, and starts the chunking process.
 */

import { loadConfig } from './config';
import { ChunkingApp } from './app';

/**
 * Main function to run the application.
 */
async function main() {
	// Load configuration from environment variables
	const config = loadConfig();

	// Create and run the application instance
	const app = new ChunkingApp(config);
	await app.run();
}

// Execute the main function and catch any top-level errors
main().catch((error) => {
	console.error('Application failed to run:', error);
	process.exit(1);
});
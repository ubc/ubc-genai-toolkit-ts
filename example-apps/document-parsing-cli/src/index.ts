/**
 * @fileoverview Entry point for the Document Parsing CLI Example Application.
 */

import { loadConfig } from './config';
import { DocParsingApp } from './app';

/**
 * Main asynchronous function to set up and run the application.
 */
async function main() {
	try {
		// Load configuration (currently just logger/debug flag)
		const config = loadConfig();

		// Create the main application instance
		const app = new DocParsingApp(config);

		// Run the application
		await app.run();

	} catch (error) {
		console.error('Failed to start application:', error);
		process.exit(1);
	}
}

// Execute the main function
main();
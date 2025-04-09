/**
 * @fileoverview Standalone script to delete the Qdrant collection used by the RAG example app.
 *
 * Loads configuration from .env, connects to the RAGModule, and calls deleteStorage().
 */

import { loadConfig } from './config';
import { RAGModule } from '@ubc-genai-toolkit/rag';
import { LoggerInterface } from '@ubc-genai-toolkit/core';

/**
 * Main asynchronous function to clear the RAG storage.
 */
async function clearRAGStorage() {
	let logger: LoggerInterface | undefined;
	try {
		// 1. Load configuration
		const config = loadConfig();
		logger = config.logger; // Assign logger for potential use in catch block
		const collectionName = config.ragConfig.qdrantConfig.collectionName; // Get collection name for logging

		logger.info(`Attempting to delete RAG storage (Collection: ${collectionName})...`);

		// 2. Create the RAG module instance (initialization happens here)
		// We need to create it to get access to the configured provider and its methods.
		const rag = await RAGModule.create(config.ragConfig);

		// 3. Call deleteStorage
		await rag.deleteStorage();

		logger.info(`Successfully deleted RAG storage (Collection: ${collectionName}).`);

	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// Log using console.error if logger failed to initialize
		const logFn = logger ? logger.error.bind(logger) : console.error;

		// Check if the error is likely due to the collection not existing
		if (message.includes('Not found') || message.includes('doesn\'t exist') || (error as any)?.status === 404) {
			logFn(`Storage deletion skipped: Collection likely did not exist. Error details: ${message}`);
			// Exit gracefully if the collection was already gone
			process.exit(0);
		} else {
			logFn('Failed to delete RAG storage:', { error });
			process.exit(1); // Exit with failure code for other errors
		}
	}
}

// Execute the function
clearRAGStorage();
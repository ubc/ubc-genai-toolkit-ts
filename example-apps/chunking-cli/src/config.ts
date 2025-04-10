/**
 * @fileoverview Configuration loader for the Chunking CLI Example Application.
 *
 * Handles loading configuration settings from environment variables using `dotenv`.
 */

import dotenv from 'dotenv';
import path from 'path';
import { ChunkingConfig, ChunkingStrategyType } from '@ubc-genai-toolkit/chunking';
import { ConsoleLogger } from '@ubc-genai-toolkit/core';

// Load environment variables from .env file in the app's root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Loads Chunking configuration from environment variables.
 *
 * Reads variables like `CHUNKING_DEFAULT_STRATEGY`, `CHUNKING_DEFAULT_CHUNK_SIZE`,
 * `CHUNKING_DEFAULT_CHUNK_OVERLAP`, and `DEBUG` to construct a config object suitable
 * for initializing the `ChunkingModule`.
 *
 * @returns {Partial<ChunkingConfig>} A partial configuration object for the Chunking module.
 */
export function loadConfig(): Partial<ChunkingConfig> {
	const logger = new ConsoleLogger('ChunkingCliApp');
	const debug = process.env.DEBUG === 'true';

	if (debug) {
		logger.debug('Loading configuration from environment variables...');
	}

	// Load optional strategy, size, and overlap from env vars
	const strategy = process.env.CHUNKING_DEFAULT_STRATEGY as ChunkingStrategyType | undefined;
	const chunkSizeStr = process.env.CHUNKING_DEFAULT_CHUNK_SIZE;
	const chunkOverlapStr = process.env.CHUNKING_DEFAULT_CHUNK_OVERLAP;

	const defaultOptions: Partial<ChunkingConfig['defaultOptions']> = {};
	if (chunkSizeStr && !isNaN(parseInt(chunkSizeStr, 10))) {
		defaultOptions.chunkSize = parseInt(chunkSizeStr, 10);
	}
	if (chunkOverlapStr && !isNaN(parseInt(chunkOverlapStr, 10))) {
		defaultOptions.chunkOverlap = parseInt(chunkOverlapStr, 10);
	}

	const config: Partial<ChunkingConfig> = {
		logger,
		debug,
		// Only include these if they are actually set in the environment
		...(strategy && { strategy }),
		...(Object.keys(defaultOptions).length > 0 && { defaultOptions }),
	};

	if (debug) {
		logger.debug('Loaded Chunking Config:', { ...config, logger: undefined }); // Avoid logging logger object
	}

	return config;
}
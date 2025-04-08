/**
 * @fileoverview Configuration loader for the Embedding CLI Example Application.
 *
 * Handles loading settings from environment variables using `dotenv`.
 * Constructs the `EmbeddingsConfig` object for the Embeddings module.
 */

import dotenv from 'dotenv';
import {
	EmbeddingsConfig,
	EmbeddingProviderType,
	FastEmbedModel,
} from '@ubc-genai-toolkit/embeddings';
import { LLMConfig, ProviderType as LLMProviderType } from '@ubc-genai-toolkit/llm';
import { ConsoleLogger } from '@ubc-genai-toolkit/core';
import path from 'path';

// Load environment variables using an absolute path
dotenv.config({ path: path.join(__dirname, '../', '.env') });

/**
 * Loads and validates configuration from environment variables.
 *
 * @returns {EmbeddingsConfig} The configuration object for the Embeddings module.
 * @throws {Error} If required environment variables are missing or invalid.
 */
export function loadConfig(): EmbeddingsConfig {
	const providerType = process.env.EMBEDDING_PROVIDER as EmbeddingProviderType;
	if (!providerType || !['ubc-genai-toolkit-llm', 'fastembed'].includes(providerType)) {
		throw new Error(
			`Invalid or missing EMBEDDING_PROVIDER. Must be 'ubc-genai-toolkit-llm' or 'fastembed'. Found: ${providerType}`
		);
	}

	const logger = new ConsoleLogger('EmbeddingCLI');
	const debug = process.env.DEBUG === 'true';

	let llmConfig: Partial<LLMConfig> | undefined = undefined;
	let fastembedConfig: Partial<EmbeddingsConfig['fastembedConfig']> | undefined =
		undefined;

	if (providerType === 'ubc-genai-toolkit-llm') {
		const llmProvider = process.env.LLM_PROVIDER as LLMProviderType;
		if (!llmProvider) {
			throw new Error(
				`Missing LLM_PROVIDER, required when EMBEDDING_PROVIDER is 'ubc-genai-toolkit-llm'.`
			);
		}

		// Note: defaultModel is for chat, embeddingModel is specific to embeddings
		// We include defaultModel here as LLMConfig requires it, even if not used by embed.
		const defaultModel = process.env.LLM_DEFAULT_MODEL;
		if (!defaultModel) {
			console.warn(
				'Warning: LLM_DEFAULT_MODEL is not set. It might be required by the underlying LLM provider even if only using embeddings.'
			);
		}

		llmConfig = {
			provider: llmProvider,
			apiKey: process.env.LLM_API_KEY,
			endpoint: process.env.LLM_ENDPOINT,
			defaultModel: defaultModel || 'unknown', // Provide a placeholder if missing
			embeddingModel: process.env.LLM_EMBEDDING_MODEL, // Optional
			logger: logger, // Pass the same logger instance
			debug: debug,
		};
	} else if (providerType === 'fastembed') {
		const modelName = process.env.FASTEMBED_MODEL;
		fastembedConfig = {
			// Convert string model name from env var to the FastEmbedModel enum
			model:
				modelName && modelName in FastEmbedModel
					? (FastEmbedModel[modelName as keyof typeof FastEmbedModel] as FastEmbedModel)
					: undefined, // Let the module use its default if invalid/missing
			cacheDir: process.env.FASTEMBED_CACHE_DIR, // Optional, module has default
		};
	}

	// Construct the final EmbeddingsConfig
	return {
		providerType,
		llmConfig,
		fastembedConfig,
		logger,
		debug,
		// batchSize could be loaded from env var if needed, using module default for now
	};
}
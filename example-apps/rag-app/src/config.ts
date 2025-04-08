/**
 * @fileoverview Configuration loader for the RAG Example Application.
 *
 * Loads settings for both RAGModule and LLMModule from environment variables.
 */

import dotenv from 'dotenv';
import { LLMConfig, ProviderType as LLMProviderType } from '@ubc-genai-toolkit/llm';
import { RAGConfig, RAGProviderType, QdrantDistanceMetric } from '@ubc-genai-toolkit/rag';
import { EmbeddingsConfig, EmbeddingProviderType } from '@ubc-genai-toolkit/embeddings';
import { ConsoleLogger, LoggerInterface } from '@ubc-genai-toolkit/core';

// Load environment variables from .env file
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

export interface AppConfig {
	llmConfig: Partial<LLMConfig>;
	ragConfig: RAGConfig;
	logger: LoggerInterface;
	debug: boolean;
}

export function loadConfig(): AppConfig {
	const debug = process.env.DEBUG === 'true';
	const logger = new ConsoleLogger('RAGExampleApp');
	if (debug) {
		logger.debug('Loading configuration from environment variables...');
	}

	// --- LLM Module Config ---
	const llmProvider = (process.env.LLM_PROVIDER || 'ollama') as LLMProviderType;
	const llmConfig: Partial<LLMConfig> = {
		provider: llmProvider,
		apiKey: process.env.LLM_API_KEY,
		endpoint: process.env.LLM_ENDPOINT,
		defaultModel: process.env.LLM_DEFAULT_MODEL,
		logger: logger, // Share logger
		debug: debug,
	};
	if (debug) logger.debug('LLM Config:', llmConfig);

	// --- RAG Module Config ---
	const ragProvider = (process.env.RAG_PROVIDER || 'qdrant') as RAGProviderType;
	if (ragProvider !== 'qdrant') {
		throw new Error(`Unsupported RAG_PROVIDER: ${ragProvider}. Currently only 'qdrant' is supported.`);
	}

	// --- RAG Internal Embeddings Config ---
	const embeddingsProvider = (process.env.EMBEDDINGS_PROVIDER) as EmbeddingProviderType;
	if (!embeddingsProvider) {
		throw new Error('EMBEDDINGS_PROVIDER environment variable is required for RAG.');
	}

	// Structure embeddingsConfig based on the provider
	let specificEmbeddingsConfig: Partial<EmbeddingsConfig> = {};
	if (embeddingsProvider === 'ubc-genai-toolkit-llm') {
		// Determine the provider for the *internal* LLMModule used for embeddings
		// Reusing the main LLM_PROVIDER env var for consistency with embedding-cli example
		const internalLlmProvider = (process.env.LLM_PROVIDER || 'ollama') as LLMProviderType;
		if (!internalLlmProvider) {
			// This check might be redundant if LLM_PROVIDER is already checked above, but safe to keep
			throw new Error('LLM_PROVIDER environment variable is required when EMBEDDINGS_PROVIDER is ubc-genai-toolkit-llm');
		}

		specificEmbeddingsConfig.llmConfig = {
			// We need to provide *some* LLM config, even if reusing provider type/endpoint
			// It's slightly redundant but required by the EmbeddingsModule structure
			provider: internalLlmProvider, // Use the determined LLM provider
			apiKey: process.env.EMBEDDINGS_API_KEY, // Use the EMBEDDINGS_ specific key
			endpoint: process.env.EMBEDDINGS_ENDPOINT, // Use the EMBEDDINGS_ specific endpoint
			embeddingModel: process.env.EMBEDDINGS_MODEL, // *This* is where the model goes
			defaultModel: process.env.LLM_DEFAULT_MODEL, // Add defaultModel from main LLM env vars
			// We should explicitly pass logger/debug here for the internal LLMModule instance
			logger: logger,
			debug: debug,
		};
	} else if (embeddingsProvider === 'fastembed') {
		specificEmbeddingsConfig.fastembedConfig = {
			// For fastembed, model name needs conversion if provided via env var
			// Simplified: model selection logic might need more robust handling based on fastembed types
			model: process.env.EMBEDDINGS_MODEL as any, // Assuming model name matches fastembed enum/string
			cacheDir: process.env.EMBEDDINGS_CACHE_DIR, // Optional cache dir
		};
	} else {
		// Handle other potential embedding providers if added later
		throw new Error(`Unsupported EMBEDDINGS_PROVIDER: ${embeddingsProvider}`);
	}

	const embeddingsConfig: EmbeddingsConfig = {
		providerType: embeddingsProvider,
		...specificEmbeddingsConfig,
		// Common config for EmbeddingsModule itself
		logger: logger,
		debug: debug,
		// batchSize: // Can be added from env var if needed
	};
	if (debug) logger.debug('RAG Embeddings Config:', embeddingsConfig);

	// --- Qdrant Specific Config ---
	const qdrantUrl = process.env.QDRANT_URL;
	if (!qdrantUrl) {
		throw new Error('QDRANT_URL environment variable is required.');
	}
	const qdrantCollectionName = process.env.QDRANT_COLLECTION_NAME;
	if (!qdrantCollectionName) {
		throw new Error('QDRANT_COLLECTION_NAME environment variable is required.');
	}
	const qdrantVectorSizeStr = process.env.QDRANT_VECTOR_SIZE;
	if (!qdrantVectorSizeStr || isNaN(parseInt(qdrantVectorSizeStr, 10))) {
		throw new Error('QDRANT_VECTOR_SIZE environment variable must be a valid number.');
	}
	const qdrantVectorSize = parseInt(qdrantVectorSizeStr, 10);

	const qdrantDistanceMetric = (process.env.QDRANT_DISTANCE_METRIC || 'Cosine') as QdrantDistanceMetric;
	if (!['Cosine', 'Euclid', 'Dot'].includes(qdrantDistanceMetric)) {
		throw new Error(`Invalid QDRANT_DISTANCE_METRIC: ${qdrantDistanceMetric}. Must be 'Cosine', 'Euclid', or 'Dot'.`);
	}

	const qdrantConfig = {
		url: qdrantUrl,
		apiKey: process.env.QDRANT_API_KEY,
		collectionName: qdrantCollectionName,
		vectorSize: qdrantVectorSize,
		distanceMetric: qdrantDistanceMetric,
	};
	if (debug) logger.debug('Qdrant Specific Config:', qdrantConfig);

	// --- Assemble RAG Config ---
	const ragConfig: RAGConfig = {
		provider: ragProvider,
		qdrantConfig: qdrantConfig,
		embeddingsConfig: embeddingsConfig, // Embeddings config is required by RAGModule
		logger: logger, // Share logger
		debug: debug,
		// Default retrieval options (can be overridden at query time)
		defaultRetrievalLimit: 5,
		defaultScoreThreshold: 0.7, // Example threshold, adjust as needed
	};
	if (debug) logger.debug('Assembled RAG Config:', ragConfig);

	return {
		llmConfig,
		ragConfig,
		logger,
		debug,
	};
}
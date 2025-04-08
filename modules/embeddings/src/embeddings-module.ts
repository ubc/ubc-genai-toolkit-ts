import {
	LoggerInterface,
	ConfigurationError,
	mergeWithDefaults,
	APIError,
} from '@ubc-genai-toolkit/core';
import { LLMModule, LLMConfig } from '@ubc-genai-toolkit/llm';
import { FlagEmbedding, EmbeddingModel as FastEmbedModel } from 'fastembed';
import {
	EmbeddingsConfig,
	EmbeddingProviderType,
	FastEmbedConfig,
} from './types';

/**
 * Default configuration for the Embeddings module
 */
const DEFAULT_EMBEDDINGS_CONFIG: Partial<EmbeddingsConfig> = {
	batchSize: 256,
};

/**
 * Default configuration for the FastEmbed provider
 */
const DEFAULT_FASTEMBED_CONFIG: FastEmbedConfig = {
	model: FastEmbedModel.BGESmallENV15,
	maxLength: 512,
	cacheDir: 'local_cache',
	showDownloadProgress: true,
};

/**
 * Facade class for generating text embeddings.
 */
export class EmbeddingsModule {
	private config: EmbeddingsConfig;
	private logger: LoggerInterface;
	private client: LLMModule | FlagEmbedding;

	/**
	 * Private constructor. Use the static async `create` method to instantiate.
	 * @param config - The validated and merged configuration.
	 * @param logger - The logger instance.
	 * @param client - The initialized underlying client (LLMModule or FlagEmbedding).
	 */
	private constructor(
		config: EmbeddingsConfig,
		logger: LoggerInterface,
		client: LLMModule | FlagEmbedding
	) {
		this.config = config;
		this.logger = logger;
		this.client = client;
		this.logger.info('EmbeddingsModule initialized', {
			provider: config.providerType,
		});
	}

	/**
	 * Asynchronously creates and initializes an instance of EmbeddingsModule.
	 * @param config - The partial configuration for the module.
	 * @returns A Promise resolving to an initialized EmbeddingsModule instance.
	 */
	public static async create(
		config: Partial<EmbeddingsConfig>
	): Promise<EmbeddingsModule> {
		const mergedConfig = mergeWithDefaults<EmbeddingsConfig>(
			config,
			DEFAULT_EMBEDDINGS_CONFIG
		);

		if (!mergedConfig.logger) {
			throw new ConfigurationError(
				'Logger must be provided in EmbeddingsConfig'
			);
		}
		const logger = mergedConfig.logger;

		let client: LLMModule | FlagEmbedding;

		try {
			if (mergedConfig.providerType === 'fastembed') {
				logger.debug('Initializing FastEmbed provider');
				const fastembedConfig: FastEmbedConfig = {
					...DEFAULT_FASTEMBED_CONFIG,
					...(mergedConfig.fastembedConfig || {}),
				};
				client = await FlagEmbedding.init(fastembedConfig);
				logger.info('FastEmbed provider initialized successfully', {
					model: fastembedConfig.model,
				});
			} else if (mergedConfig.providerType === 'ubc-genai-toolkit-llm') {
				logger.debug('Initializing UBC GenAI Toolkit LLM provider for embeddings');
				if (!mergedConfig.llmConfig) {
					throw new ConfigurationError(
						'llmConfig is required when providerType is \'ubc-genai-toolkit-llm\''
					);
				}
				// Ensure the LLM config also has a logger if not explicitly passed down
				const llmConfigWithLogger = {
					...mergedConfig.llmConfig,
					logger: mergedConfig.llmConfig.logger || logger,
				};
				client = new LLMModule(llmConfigWithLogger);
				logger.info(
					'UBC GenAI Toolkit LLM provider initialized for embeddings successfully',
					{
						llmProvider: client.getProviderName(),
					}
				);
			} else {
				throw new ConfigurationError(
					`Invalid providerType: ${mergedConfig.providerType}`
				);
			}
		} catch (error) {
			logger.error('Failed to initialize embedding provider', { error });
			if (error instanceof Error) {
				throw new APIError(
					`Failed to initialize provider ${mergedConfig.providerType}: ${error.message}`,
					500,
					{
						originalError: error,
					}
				);
			} else {
				throw new APIError(
					`Failed to initialize provider ${mergedConfig.providerType} due to unknown error`,
					500
				);
			}
		}

		return new EmbeddingsModule(mergedConfig, logger, client);
	}

	/**
	 * Generates embeddings for the given text(s).
	 *
	 * Handles batching internally based on the configured batchSize.
	 * Delegates the call to the initialized underlying provider (LLMModule or FastEmbed).
	 *
	 * @param texts - A single string or an array of strings to embed.
	 * @returns A promise that resolves to an array of embedding vectors (number[][]).
	 */
	async embed(texts: string | string[]): Promise<number[][]> {
		const inputTextArray = Array.isArray(texts) ? texts : [texts];
		const batchSize = this.config.batchSize!;
		const totalEmbeddings: number[][] = [];

		this.logger.debug('Starting embedding generation', {
			provider: this.config.providerType,
			textCount: inputTextArray.length,
			batchSize: batchSize,
		});

		try {
			if (this.client instanceof LLMModule) {
				// LLMModule handles its own internal provider logic (including potential batching if implemented there)
				// For now, assume LLMModule's embed handles the full array or we send in batches here.
				// Let's implement batching here for consistency with fastembed handling.
				for (let i = 0; i < inputTextArray.length; i += batchSize) {
					const batchTexts = inputTextArray.slice(i, i + batchSize);
					this.logger.debug(`Processing LLM batch ${i / batchSize + 1}`, {
						batchSize: batchTexts.length,
					});
					const response = await this.client.embed(batchTexts);
					totalEmbeddings.push(...response.embeddings);
				}
			} else if (this.client instanceof FlagEmbedding) {
				// FlagEmbedding returns an async generator that handles batching based on the size passed.
				const embeddingGenerator = this.client.embed(
					inputTextArray,
					batchSize
				);
				let batchCounter = 0;
				for await (const batchEmbeddings of embeddingGenerator) {
					batchCounter++;
					this.logger.debug(`Received FastEmbed batch ${batchCounter}`, {
						batchSize: batchEmbeddings.length,
					});
					totalEmbeddings.push(...batchEmbeddings);
				}
			} else {
				// Should not happen due to constructor logic
				throw new Error('Invalid internal client state');
			}

			this.logger.info('Embedding generation completed successfully', {
				totalEmbeddings: totalEmbeddings.length,
			});
			return totalEmbeddings;
		} catch (error) {
			this.logger.error('Error during embedding generation', { error });
			if (error instanceof Error) {
				throw new APIError(`Embedding generation failed: ${error.message}`, 500, {
					originalError: error,
					provider: this.config.providerType,
				});
			} else {
				throw new APIError('Embedding generation failed due to unknown error', 500, {
					provider: this.config.providerType,
				});
			}
		}
	}
}
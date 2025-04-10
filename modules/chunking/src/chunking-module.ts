import {
	LoggerInterface,
	ConfigurationError,
	mergeWithDefaults,
	APIError,
} from '@ubc-genai-toolkit/core';
import {
	ChunkingConfig,
	ChunkingOptions,
	ChunkingResponse,
	ChunkingStrategyType,
	Document,
} from './types';
import { ChunkingProvider } from './providers/provider-interface';
import { SimpleChunkingProvider } from './providers/simple-provider';
import { RecursiveCharacterProvider } from './providers/recursive-character-provider';
import { TokenProvider } from './providers/token-provider';

// Default Chunking configuration
const DEFAULT_CHUNKING_CONFIG: Partial<ChunkingConfig> = {
	strategy: 'recursiveCharacter', // Sensible default strategy
	defaultOptions: {
		// Defaults matching RecursiveCharacterProvider's defaults
		chunkSize: 1000,
		chunkOverlap: 200,
	},
};

/**
 * Main Chunking Module facade.
 * Provides a unified interface for splitting documents into chunks using various strategies.
 */
export class ChunkingModule {
	private config: ChunkingConfig;
	private logger: LoggerInterface;
	private defaultProvider: ChunkingProvider;

	/**
	 * Creates a new ChunkingModule instance.
	 * @param config - Optional configuration for the module.
	 */
	constructor(config?: Partial<ChunkingConfig>) {
		this.config = mergeWithDefaults<ChunkingConfig>(
			config,
			DEFAULT_CHUNKING_CONFIG
		);
		this.logger = this.config.logger!;
		this.defaultProvider = this.initializeProvider(this.config.strategy);
		this.logger.debug('ChunkingModule initialized', {
			defaultStrategy: this.defaultProvider.getStrategyName(),
			defaultOptions: this.config.defaultOptions,
		});
	}

	/**
	 * Initializes and returns a ChunkingProvider based on the specified strategy.
	 * @param strategy - The chunking strategy to initialize.
	 * @returns An instance of the corresponding ChunkingProvider.
	 * @throws {ConfigurationError} If the strategy is unsupported.
	 */
	private initializeProvider(strategy?: ChunkingStrategyType): ChunkingProvider {
		const strategyToUse = strategy || 'recursiveCharacter'; // Fallback just in case

		switch (strategyToUse) {
			case 'simple':
				return new SimpleChunkingProvider();
			case 'recursiveCharacter':
				return new RecursiveCharacterProvider();
			case 'token':
				return new TokenProvider();
			default:
				// Ensures compile-time check for unhandled strategies
				const exhaustiveCheck: never = strategyToUse;
				throw new ConfigurationError(
					`Unsupported chunking strategy: ${exhaustiveCheck}`
				);
		}
	}

	/**
	 * Splits an array of documents into chunks using the configured or overridden strategy.
	 *
	 * @param documents - An array of Document objects to chunk.
	 * @param options - Optional settings to override the default configuration for this call,
	 *                  including chunking options and an optional `strategyOverride`.
	 * @returns A Promise resolving to a ChunkingResponse containing the chunks.
	 * @throws {ConfigurationError} If input documents are invalid.
	 * @throws {APIError} If the underlying provider encounters an error.
	 */
	async chunkDocuments(
		documents: Document[],
		options?: ChunkingOptions & { strategyOverride?: ChunkingStrategyType }
	): Promise<ChunkingResponse> {
		// Input validation
		if (!Array.isArray(documents) || documents.length === 0) {
			throw new ConfigurationError(
				'Input must be a non-empty array of Document objects.'
			);
		}
		for (let i = 0; i < documents.length; i++) {
			if (
				!documents[i] ||
				typeof documents[i].content !== 'string' ||
				!documents[i].metadata ||
				typeof documents[i].metadata.sourceId !== 'string' ||
				!documents[i].metadata.sourceId
			) {
				throw new ConfigurationError(
					`Invalid Document object at index ${i}. Each document must have 'content' (string) and 'metadata.sourceId' (non-empty string).`
				);
			}
		}

		const strategyOverride = options?.strategyOverride;
		const provider = strategyOverride
			? this.initializeProvider(strategyOverride)
			: this.defaultProvider;

		const strategyName = provider.getStrategyName();

		this.logger.debug(`Chunking ${documents.length} documents`, {
			strategy: strategyName,
			overrides: options,
		});

		// Merge module defaults with per-call options
		const mergedOptions = {
			...this.config.defaultOptions, // Start with module defaults
			...options, // Override with specific call options
		};
		delete mergedOptions.strategyOverride; // Don't pass this internal option to provider

		try {
			const response = await provider.chunkDocuments(
				documents,
				mergedOptions
			);
			this.logger.debug('Chunking completed', {
				strategy: strategyName,
				totalChunks: response.metadata.totalChunks,
			});
			return response;
		} catch (error) {
			this.logger.error('Chunking failed', {
				strategy: strategyName,
				error,
			});
			// Re-throw errors (providers should wrap specific errors already)
			// If it's not a ToolkitError already, wrap it
			if (error instanceof ConfigurationError || error instanceof APIError) {
				throw error;
			} else if (error instanceof Error) {
				throw new APIError(
					`Chunking failed: ${error.message}`,
					500,
					{ cause: error }
				);
			} else {
				throw new APIError('An unknown error occurred during chunking', 500);
			}
		}
	}

	/**
	 * Gets the name of the default chunking strategy configured for this module instance.
	 */
	getDefaultStrategyName(): string {
		return this.defaultProvider.getStrategyName();
	}
}
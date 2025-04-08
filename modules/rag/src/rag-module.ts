import { ConsoleLogger, LoggerInterface } from '@ubc-genai-toolkit/core';
import { EmbeddingsModule } from '@ubc-genai-toolkit/embeddings';
import {
	RAGConfig,
	RAGModuleInterface,
	RetrievedChunk,
	RetrievalOptions,
	RAGProviderInterface,
} from './types';
import { QdrantProvider } from './providers/qdrant-provider';

export class RAGModule implements RAGModuleInterface {
	private config: RAGConfig;
	private logger: LoggerInterface;
	private embeddingsModule!: EmbeddingsModule; // Definite assignment in create
	private ragProvider!: RAGProviderInterface; // Definite assignment in create
	private isInitialized = false;

	// Private constructor to enforce initialization via static create method
	private constructor(config: RAGConfig) {
		this.config = this.validateAndBuildConfig(config);
		this.logger = config.logger ?? new ConsoleLogger('RAGModule');
		if (this.config.debug) {
			this.logger.debug('RAGModule configuration:', this.config);
		}
	}

	/**
	 * Validates the configuration and sets defaults.
	 */
	private validateAndBuildConfig(config: RAGConfig): RAGConfig {
		if (!config.provider) {
			throw new Error('RAG provider type must be specified in config.');
		}

		if (config.provider === 'qdrant' && !config.qdrantConfig) {
			throw new Error('qdrantConfig must be provided when provider is qdrant.');
		}

		if (
			config.provider === 'qdrant' &&
			config.qdrantConfig &&
			!config.qdrantConfig.collectionName
		) {
			throw new Error('qdrantConfig.collectionName must be specified.');
		}

		if (
			config.provider === 'qdrant' &&
			config.qdrantConfig &&
			config.qdrantConfig.vectorSize === undefined // Check for undefined explicitly
		) {
			throw new Error('qdrantConfig.vectorSize must be specified.');
		}

		if (
			config.provider === 'qdrant' &&
			config.qdrantConfig &&
			!config.qdrantConfig.distanceMetric
		) {
			throw new Error('qdrantConfig.distanceMetric must be specified.');
		}

		if (!config.embeddingsConfig) {
			throw new Error(
				'embeddingsConfig must be provided to handle internal embedding generation.'
			);
		}

		// Add more validation as needed for other providers

		return {
			...config,
			debug: config.debug ?? false,
			defaultRetrievalLimit: config.defaultRetrievalLimit ?? 5,
			// defaultScoreThreshold is deliberately left potentially undefined
		};
	}

	/**
	 * Asynchronously creates and initializes an instance of RAGModule.
	 * @param config The configuration object for the RAG module.
	 * @returns A Promise resolving to an initialized RAGModule instance.
	 */
	static async create(config: RAGConfig): Promise<RAGModule> {
		const module = new RAGModule(config);
		await module.initialize();
		return module;
	}

	/**
	 * Private initialization method called by create.
	 */
	private async initialize(): Promise<void> {
		if (this.isInitialized) {
			this.logger.warn('RAGModule is already initialized.');
			return;
		}

		this.logger.info('Initializing RAGModule...');

		try {
			// Initialize internal EmbeddingsModule
			if (!this.config.embeddingsConfig) {
				// This case is handled by validation, but double-check for safety
				throw new Error('Internal error: embeddingsConfig is missing during initialization.');
			}
			this.embeddingsModule = await EmbeddingsModule.create({
				...this.config.embeddingsConfig,
				// Ensure logger and debug settings propagate
				logger: this.logger,
				debug: this.config.debug,
			});
			this.logger.info('Internal EmbeddingsModule initialized successfully.');

			// Instantiate and initialize the specific RAG provider
			switch (this.config.provider) {
				case 'qdrant':
					this.ragProvider = new QdrantProvider(
						this.config.qdrantConfig,
						this.embeddingsModule, // Pass the initialized embeddings module
						this.logger,
						this.config.debug
					);
					break;
				// Add cases for other providers here
				default:
					throw new Error(`Unsupported RAG provider: ${this.config.provider}`);
			}

			await this.ragProvider.initialize();
			this.logger.info(`RAGProvider '${this.config.provider}' initialized successfully.`);

			this.isInitialized = true;
			this.logger.info('RAGModule initialized successfully.');
		} catch (error) {
			this.logger.error('Failed to initialize RAGModule:', { error });
			// Convert to ToolkitError if desired, or rethrow
			throw new Error(`RAGModule initialization failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private ensureInitialized(): void {
		if (!this.isInitialized) {
			throw new Error('RAGModule has not been initialized. Call RAGModule.create() first.');
		}
	}

	/**
	 * Adds a document to the configured vector store.
	 */
	async addDocument(content: string, metadata?: Record<string, any>): Promise<void> {
		this.ensureInitialized();
		this.logger.debug('Adding document...', { metadata });
		// Delegate to the provider, which handles chunking and embedding
		return this.ragProvider.addDocument(content, metadata);
	}

	/**
	 * Retrieves relevant context chunks for a given query text.
	 */
	async retrieveContext(
		queryText: string,
		options?: RetrievalOptions
	): Promise<RetrievedChunk[]> {
		this.ensureInitialized();
		this.logger.debug(`Retrieving context for query: "${queryText.substring(0, 50)}..."`, { options });

		// Prepare final options, merging defaults
		const finalOptions: RetrievalOptions = {
			limit: options?.limit ?? this.config.defaultRetrievalLimit,
			scoreThreshold: options?.scoreThreshold ?? this.config.defaultScoreThreshold,
			filter: options?.filter, // Pass filter through if provided
		};

		// Delegate to the provider
		const results = await this.ragProvider.retrieveContext(queryText, finalOptions);
		this.logger.debug(`Retrieved ${results.length} context chunks.`);
		return results;
	}
}
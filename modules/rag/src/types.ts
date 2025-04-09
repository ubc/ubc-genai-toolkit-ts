import { LoggerInterface } from '@ubc-genai-toolkit/core';
import { EmbeddingsConfig } from '@ubc-genai-toolkit/embeddings';

/**
 * Defines the supported RAG providers.
 * Currently only supports 'qdrant'.
 */
export type RAGProviderType = 'qdrant'; // Add more providers like 'pinecone', etc. later

/**
 * Defines the supported distance metrics for Qdrant.
 * See: https://qdrant.tech/documentation/concepts/collections/#distance-metrics
 */
export type QdrantDistanceMetric = 'Cosine' | 'Euclid' | 'Dot';

/**
 * Configuration specific to the Qdrant RAG provider.
 */
export interface QdrantConfig {
	/** The URL of the Qdrant instance (e.g., 'http://localhost:6333'). */
	url: string;
	/** Optional API key for Qdrant Cloud or secured instances. */
	apiKey?: string;
	/** The name of the collection to use in Qdrant. */
	collectionName: string;
	/** The size (dimensionality) of the vectors to be stored. Required for collection creation. */
	vectorSize: number;
	/** The distance metric to use for vector comparison. Required for collection creation. */
	distanceMetric: QdrantDistanceMetric;
}

/**
 * Main configuration for the RAGModule.
 */
export interface RAGConfig {
	/** The type of RAG provider to use (e.g., 'qdrant'). */
	provider: RAGProviderType;
	/** Provider-specific configuration. */
	qdrantConfig: QdrantConfig; // Add other provider configs later (e.g., | PineconeConfig)
	/** Configuration for the Embeddings module if managed internally. Optional. */
	embeddingsConfig?: EmbeddingsConfig;
	/** Optional logger instance conforming to LoggerInterface. */
	logger?: LoggerInterface;
	/** Enable debug logging. Defaults to false. */
	debug?: boolean;
	/** Default number of context chunks to retrieve. Defaults to 5. */
	defaultRetrievalLimit?: number;
	/** Default minimum score threshold for retrieved chunks. Optional. */
	defaultScoreThreshold?: number;
}

/**
 * Represents a single chunk of context retrieved from the vector store.
 */
export interface RetrievedChunk {
	/** The text content of the retrieved chunk. */
	content: string;
	/** The similarity score of the chunk (higher is typically better). */
	score: number;
	/** Optional metadata associated with the chunk. */
	metadata?: Record<string, any>; // Using Record<string, any> for flexibility
}

/**
 * Options for customizing context retrieval.
 */
export interface RetrievalOptions {
	/** The maximum number of chunks to retrieve. Overrides `defaultRetrievalLimit`. */
	limit?: number;
	/** The minimum similarity score for retrieved chunks. Overrides `defaultScoreThreshold`. */
	scoreThreshold?: number;
	/** Optional filter to apply during retrieval (provider-specific implementation). */
	filter?: Record<string, any>; // Provider specific filtering structure
}

/**
 * Interface defining the contract for RAG provider implementations.
 */
export interface RAGProviderInterface {
	/** Initializes the provider (e.g., connects to DB, creates collection if needed). */
	initialize(): Promise<void>;
	/**
	 * Adds a document to the vector store.
	 * The provider is responsible for chunking and embedding the content.
	 * @param content The text content of the document.
	 * @param metadata Optional metadata to associate with the document/chunks.
	 * @returns A promise resolving to an array of chunk IDs that were added.
	 */
	addDocument(content: string, metadata?: Record<string, any>): Promise<string[]>;
	/**
	 * Retrieves relevant context chunks based on a query.
	 * @param queryText The user's query text.
	 * @param options Optional retrieval customization.
	 * @returns A promise resolving to an array of retrieved chunks.
	 */
	retrieveContext(queryText: string, options?: RetrievalOptions): Promise<RetrievedChunk[]>;
	/**
	 * Deletes specific chunks from the vector store by their IDs.
	 * @param ids An array of chunk IDs to delete.
	 */
	deleteDocumentsByIds(ids: string[]): Promise<void>;
	/**
	 * Deletes chunks from the vector store that match the provided metadata filter.
	 * @param filter A metadata filter object. The exact structure and interpretation
	 *               depend on the provider implementation. For simple cases, it might
	 *               be a key-value map where chunks matching all key-value pairs are deleted.
	 */
	deleteDocumentsByMetadata(filter: Record<string, any>): Promise<void>;
	/**
	 * Deletes the entire underlying storage container (e.g., collection, index)
	 * associated with this provider instance configuration.
	 * This is a destructive operation.
	 */
	deleteStorage(): Promise<void>;
}

/**
 * Interface defining the public methods of the RAGModule.
 */
export interface RAGModuleInterface {
	/**
	 * Adds a document to the configured vector store.
	 * Handles chunking and embedding internally.
	 * @param content The text content of the document.
	 * @param metadata Optional metadata.
	 * @returns A promise resolving to an array of chunk IDs that were added.
	 */
	addDocument(content: string, metadata?: Record<string, any>): Promise<string[]>;
	/**
	 * Retrieves relevant context chunks for a given query text.
	 * @param queryText The user's query.
	 * @param options Optional retrieval options.
	 * @returns A promise resolving to an array of relevant text chunks.
	 */
	retrieveContext(queryText: string, options?: RetrievalOptions): Promise<RetrievedChunk[]>;
	/**
	 * Deletes specific chunks from the vector store by their IDs.
	 * @param ids An array of chunk IDs to delete.
	 */
	deleteDocumentsByIds(ids: string[]): Promise<void>;
	/**
	 * Deletes chunks from the vector store that match the provided metadata filter.
	 * @param filter A metadata filter object. Provider-specific interpretation applies.
	 */
	deleteDocumentsByMetadata(filter: Record<string, any>): Promise<void>;
	/**
	 * Deletes the entire underlying storage container (e.g., collection, index)
	 * associated with this RAG module's configuration.
	 * Use with caution.
	 */
	deleteStorage(): Promise<void>;
}
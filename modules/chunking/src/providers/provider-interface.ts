import {
    ChunkingOptions,
    ChunkingResponse,
    ChunkingStrategyType,
    Document,
} from '../types';

/**
 * Common interface for all chunking strategy providers.
 * Each provider implements a specific algorithm for splitting documents into chunks.
 */
export interface ChunkingProvider {
	/**
	 * Returns the specific strategy name implemented by this provider.
	 */
	getStrategyName(): ChunkingStrategyType;

	/**
	 * Splits an array of Documents into Chunks based on the provider's strategy.
	 *
	 * @param documents - An array of Document objects to be chunked.
	 * @param options - Configuration options to control the chunking process (e.g., chunkSize, chunkOverlap).
	 * @returns A Promise resolving to a ChunkingResponse containing the generated chunks and metadata.
	 */
	chunkDocuments(
		documents: Document[],
		options: ChunkingOptions
	): Promise<ChunkingResponse>;
}
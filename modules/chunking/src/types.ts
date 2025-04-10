import { ModuleConfig } from '@ubc-genai-toolkit/core';

/**
 * Supported chunking strategies.
 * - 'simple': Basic splitting based on paragraphs or sentences (custom).
 * - 'recursiveCharacter': Splits recursively based on character separators (Langchain).
 * - 'token': Splits based on token counts (Langchain).
 */
export type ChunkingStrategyType = 'simple' | 'recursiveCharacter' | 'token';

/**
 * Represents an input document to be chunked.
 */
export interface Document {
	/**
	 * The main text content of the document.
	 */
	content: string;
	/**
	 * Metadata associated with the document. Must include a unique source identifier.
	 */
	metadata: {
		/**
		 * A unique identifier for the source of the document (e.g., URL, filename, DB ID).
		 * This is crucial for tracking chunk provenance.
		 */
		sourceId: string;
		/**
		 * Optional additional metadata fields.
		 */
		[key: string]: any;
	};
}

/**
 * Configuration options for the ChunkingModule.
 */
export interface ChunkingConfig extends ModuleConfig {
	/**
	 * The default chunking strategy to use if not specified in the chunkDocuments call.
	 * Defaults to 'recursiveCharacter'.
	 */
	strategy?: ChunkingStrategyType;

	/**
	 * Default options to apply to the chosen chunking strategy.
	 * These can be overridden on a per-call basis.
	 */
	defaultOptions?: ChunkingOptions;
}

/**
 * Options to control the chunking process for a specific strategy.
 */
export interface ChunkingOptions {
	/**
	 * The target size for each chunk (interpretation depends on strategy).
	 * For character-based strategies, it's characters. For token-based, it's tokens.
	 */
	chunkSize?: number;

	/**
	 * The number of characters/tokens to overlap between consecutive chunks.
	 * Helps maintain context across chunk boundaries.
	 */
	chunkOverlap?: number;

	/**
	 * Additional strategy-specific options.
	 * Allows passing parameters unique to certain Langchain splitters or custom logic.
	 * Example: `encodingName` for TokenTextSplitter.
	 */
	[key: string]: any;
}

/**
 * Represents a single chunk of text produced by the chunking process.
 */
export interface Chunk {
	/**
	 * The text content of this specific chunk.
	 */
	text: string;
	/**
	 * Metadata associated with the chunk.
	 */
	metadata: {
		/**
		 * The sequential number of this chunk within its original source document (1-indexed).
		 */
		chunkNumber: number;
		/**
		 * A copy of the metadata from the original source Document.
		 */
		sourceDocumentMetadata: Document['metadata'];
		/**
		 * The number of characters in the chunk's text.
		 */
		characterLength: number;
		/**
		 * An estimated token count for the chunk (optional, may be added by some strategies).
		 */
		estimatedTokenCount?: number;
	};
}

/**
 * The standardized response object returned by the chunkDocuments method.
 */
export interface ChunkingResponse {
	/**
	 * An array containing all the generated Chunk objects.
	 */
	chunks: Chunk[];
	/**
	 * The chunking strategy that was used to generate these chunks.
	 */
	strategy: ChunkingStrategyType;
	/**
	 * Metadata about the overall chunking operation.
	 */
	metadata: {
		/**
		 * The total number of chunks generated from all input documents.
		 */
		totalChunks: number;
	};
}
import { chunk, SplitOptions } from '../utils/simple-chunker';
import {
	Chunk,
	ChunkingOptions,
	ChunkingResponse,
	ChunkingStrategyType,
	Document,
} from '../types';
import { ChunkingProvider } from './provider-interface';

// Default options specific to the simple strategy
const DEFAULT_SIMPLE_OPTIONS = {
	chunkSize: 1000,     // Corresponds to maxLength in SplitOptions
	chunkOverlap: 0,     // Corresponds to overlap in SplitOptions
	minLength: 0,        // Specific to SplitOptions
	splitter: 'paragraph', // Specific to SplitOptions
};

/**
 * Implements the 'simple' chunking strategy based on the provided logic.
 */
export class SimpleChunkingProvider implements ChunkingProvider {
	getStrategyName(): ChunkingStrategyType {
		return 'simple';
	}

	async chunkDocuments(
		documents: Document[],
		options: ChunkingOptions
	): Promise<ChunkingResponse> {
		// Merge only the defined defaults with the provided options
		const mergedOptions = { ...DEFAULT_SIMPLE_OPTIONS, ...options };
		const allChunks: Chunk[] = [];

		// Map ChunkingOptions to the simple chunker's SplitOptions
		// Ensure type safety for splitter and handle potential custom delimiters
		const simpleSplitOptions: SplitOptions = {
			minLength: mergedOptions.minLength,
			maxLength: mergedOptions.chunkSize,
			overlap: mergedOptions.chunkOverlap,
			splitter: mergedOptions.splitter as SplitOptions['splitter'],
			// Access delimiters directly from input options, default to empty string if not provided
			delimiters: options.delimiters as string || "",
		};

		for (const doc of documents) {
			// Input validation or defaulting could be added here if needed
			const textChunks = chunk(doc.content, simpleSplitOptions);
			let chunkNumber = 1;
			for (const textChunk of textChunks) {
				if (textChunk.trim().length === 0) continue; // Skip empty chunks

				allChunks.push({
					text: textChunk,
					metadata: {
						chunkNumber: chunkNumber++,
						sourceDocumentMetadata: { ...doc.metadata }, // Copy source metadata
						characterLength: textChunk.length,
						// estimatedTokenCount is not calculated by this simple strategy
					},
				});
			}
		}

		return {
			chunks: allChunks,
			strategy: this.getStrategyName(),
			metadata: {
				totalChunks: allChunks.length,
			},
		};
	}
}
import {
	TokenTextSplitter,
	TokenTextSplitterParams,
} from 'langchain/text_splitter';
import {
	Chunk,
	ChunkingOptions,
	ChunkingResponse,
	ChunkingStrategyType,
	Document,
} from '../types';
import { ChunkingProvider } from './provider-interface';
import { ConfigurationError, APIError } from '@ubc-genai-toolkit/core';

// Default options for this strategy
const DEFAULT_TOKEN_OPTIONS = {
	chunkSize: 512, // Common token limit, adjust as needed
	chunkOverlap: 50, // Smaller overlap often sufficient for tokens
	encodingName: 'cl100k_base', // Default encoding for many OpenAI models
};

/**
 * Implements the 'token' chunking strategy using Langchain's TokenTextSplitter.
 */
export class TokenProvider implements ChunkingProvider {
	getStrategyName(): ChunkingStrategyType {
		return 'token';
	}

	async chunkDocuments(
		documents: Document[],
		options: ChunkingOptions
	): Promise<ChunkingResponse> {
		const mergedOptions = { ...DEFAULT_TOKEN_OPTIONS, ...options };

		// Validate required options
		if (
			mergedOptions.chunkSize === undefined ||
			mergedOptions.chunkOverlap === undefined
		) {
			throw new ConfigurationError(
				"'chunkSize' and 'chunkOverlap' must be defined for token strategy."
			);
		}

		// Extract Langchain-specific options
		const { chunkSize, chunkOverlap, encodingName, ...restOptions } =
			mergedOptions;

		const splitterParams: Partial<TokenTextSplitterParams> = {
			chunkSize,
			chunkOverlap,
			encodingName: encodingName as any, // Cast necessary due to Langchain type variations
			// disallowedSpecial: [], // Example of another option if needed
			...restOptions,
		};

		const splitter = new TokenTextSplitter(splitterParams);

		// Convert our Document format to Langchain's expected format
		const langchainDocs = documents.map((doc) => ({
			pageContent: doc.content,
			metadata: { ...doc.metadata },
		}));

		try {
			// Use Langchain splitter
			const splitDocs = await splitter.splitDocuments(langchainDocs);

			// Map Langchain output back to our Chunk format
			const allChunks: Chunk[] = [];
			const chunksBySource: { [sourceId: string]: Chunk[] } = {};

			splitDocs.forEach((splitDoc) => {
				const sourceId = splitDoc.metadata?.sourceId;
				if (!sourceId) {
					console.warn(
						'Chunk generated without a sourceId in metadata.',
						splitDoc.metadata
					);
					return;
				}

				if (!chunksBySource[sourceId]) {
					chunksBySource[sourceId] = [];
				}

				const chunk: Chunk = {
					text: splitDoc.pageContent,
					metadata: {
						chunkNumber: 0, // Placeholder
						sourceDocumentMetadata: {
							sourceId: sourceId,
							...splitDoc.metadata,
						},
						characterLength: splitDoc.pageContent.length,
						// Could estimate tokens here based on chunkSize/overlap if needed, but might be inaccurate
					},
				};
				chunksBySource[sourceId].push(chunk);
			});

			// Assign sequential chunk numbers within each source and flatten
			Object.values(chunksBySource).forEach((sourceChunks) => {
				sourceChunks.forEach((chunk, index) => {
					chunk.metadata.chunkNumber = index + 1;
					allChunks.push(chunk);
				});
			});

			return {
				chunks: allChunks,
				strategy: this.getStrategyName(),
				metadata: {
					totalChunks: allChunks.length,
				},
			};
		} catch (error: any) {
			// Wrap Langchain errors
			// Handle potential TiktokenNotInstalledError specifically if desired
			throw new APIError(
				`Error during token splitting: ${error.message}`,
				500,
				{ cause: error }
			);
		}
	}
}
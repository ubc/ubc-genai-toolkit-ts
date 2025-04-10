import {
	RecursiveCharacterTextSplitter,
	RecursiveCharacterTextSplitterParams,
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
const DEFAULT_RECURSIVE_OPTIONS = {
	chunkSize: 1000,
	chunkOverlap: 200,
};

/**
 * Implements the 'recursiveCharacter' chunking strategy using Langchain's RecursiveCharacterTextSplitter.
 */
export class RecursiveCharacterProvider implements ChunkingProvider {
	getStrategyName(): ChunkingStrategyType {
		return 'recursiveCharacter';
	}

	async chunkDocuments(
		documents: Document[],
		options: ChunkingOptions
	): Promise<ChunkingResponse> {
		const mergedOptions = { ...DEFAULT_RECURSIVE_OPTIONS, ...options };

		// Validate required options
		if (
			mergedOptions.chunkSize === undefined ||
			mergedOptions.chunkOverlap === undefined
		) {
			throw new ConfigurationError(
				"'chunkSize' and 'chunkOverlap' must be defined for recursiveCharacter strategy."
			);
		}

		// Extract Langchain-specific options, excluding our standard ones
		const { chunkSize, chunkOverlap, ...langchainSpecificOptions } =
			mergedOptions;

		const splitterParams: Partial<RecursiveCharacterTextSplitterParams> = {
			chunkSize,
			chunkOverlap,
			...langchainSpecificOptions, // Pass any other valid Langchain options
		};

		const splitter = new RecursiveCharacterTextSplitter(splitterParams);

		// Convert our Document format to Langchain's expected format
		const langchainDocs = documents.map((doc) => ({
			pageContent: doc.content,
			metadata: { ...doc.metadata }, // Pass original metadata through
		}));

		try {
			// Use Langchain splitter
			const splitDocs = await splitter.splitDocuments(langchainDocs);

			// Map Langchain output back to our Chunk format
			const allChunks: Chunk[] = [];
			const chunksBySource: { [sourceId: string]: Chunk[] } = {};

			splitDocs.forEach((splitDoc) => {
				// Ensure metadata exists and has sourceId (should be passed by Langchain)
				const sourceId = splitDoc.metadata?.sourceId as string | undefined;
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
						chunkNumber: 0, // Placeholder, will be set below
						// Ensure sourceId is explicitly included to satisfy type
						sourceDocumentMetadata: {
							sourceId: sourceId, // Use the extracted sourceId
							...(splitDoc.metadata || {}), // Spread potentially existing metadata
						},
						characterLength: splitDoc.pageContent.length,
						// estimatedTokenCount could potentially be calculated here if needed
					},
				};
				chunksBySource[sourceId].push(chunk);
			});

			// Assign sequential chunk numbers within each source and flatten
			Object.values(chunksBySource).forEach((sourceChunks) => {
				sourceChunks.forEach((chunk, index) => {
					chunk.metadata.chunkNumber = index + 1; // Set 1-based chunk number
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
			throw new APIError(
				`Error during recursiveCharacter splitting: ${error.message}`,
				500,
				{ cause: error }
			);
		}
	}
}
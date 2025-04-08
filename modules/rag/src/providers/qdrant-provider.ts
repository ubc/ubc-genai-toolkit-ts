import { QdrantClient } from '@qdrant/js-client-rest';
import type { Schemas as QdrantSchemas } from '@qdrant/js-client-rest';
import { EmbeddingsModule } from '@ubc-genai-toolkit/embeddings';
import { LoggerInterface } from '@ubc-genai-toolkit/core';
import {
	RAGProviderInterface,
	QdrantConfig,
	RetrievedChunk,
	RetrievalOptions,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// Simple chunking function (can be replaced with more sophisticated methods later)
function simpleChunker(text: string, chunkSize = 300, overlap = 50): string[] {
	const chunks: string[] = [];
	if (text.length <= chunkSize) {
		return [text];
	}

	let i = 0;
	while (i < text.length) {
		const end = Math.min(i + chunkSize, text.length);
		chunks.push(text.substring(i, end));
		i += chunkSize - overlap;
		if (end === text.length) break; // Exit if we reached the end
	}
	return chunks;
}

export class QdrantProvider implements RAGProviderInterface {
	private client: QdrantClient;
	private config: QdrantConfig;
	private embeddings: EmbeddingsModule;
	private logger: LoggerInterface;
	private isDebug: boolean;

	constructor(
		config: QdrantConfig,
		embeddingsModule: EmbeddingsModule,
		logger: LoggerInterface,
		debug = false
	) {
		this.config = config;
		this.embeddings = embeddingsModule;
		this.logger = logger;
		this.isDebug = debug;

		// Initialize Qdrant client
		this.client = new QdrantClient({
			url: this.config.url,
			apiKey: this.config.apiKey,
		});

		if (this.isDebug) {
			this.logger.debug('QdrantProvider configured:', { url: this.config.url, collectionName: this.config.collectionName });
		}
	}

	async initialize(): Promise<void> {
		try {
			this.logger.info(`Checking for Qdrant collection '${this.config.collectionName}'...`);
			const collections = await this.client.getCollections();
			const collectionExists = collections.collections.some(
				(col) => col.name === this.config.collectionName
			);

			if (!collectionExists) {
				this.logger.warn(
					`Collection '${this.config.collectionName}' not found. Attempting to create...`
				);
				await this.client.createCollection(this.config.collectionName, {
					vectors: {
						size: this.config.vectorSize,
						distance: this.config.distanceMetric,
					},
				});
				this.logger.info(`Collection '${this.config.collectionName}' created successfully.`);
			} else {
				this.logger.info(`Collection '${this.config.collectionName}' exists.`);
				// Optionally, we could verify if the existing collection's config matches
			}
		} catch (error) {
			this.logger.error('Error during Qdrant initialization:', { error });
			throw new Error(`Qdrant initialization failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async addDocument(content: string, metadata: Record<string, any> = {}): Promise<void> {
		this.logger.debug(`Adding document with metadata:`, metadata);
		// 1. Chunk the document
		const chunks = simpleChunker(content); // Using simple chunker for now
		this.logger.debug(`Document split into ${chunks.length} chunks.`);

		if (chunks.length === 0) {
			this.logger.warn('Document content resulted in zero chunks. Nothing to add.');
			return;
		}

		// 2. Get embeddings for chunks (one by one)
		this.logger.debug(`Generating embeddings for ${chunks.length} chunks...`);
		const points: QdrantSchemas['PointStruct'][] = [];
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			try {
				const [embedding] = await this.embeddings.embed(chunk);
				if (!embedding) {
					throw new Error(`EmbeddingsModule.embed returned no result for chunk ${i}`);
				}
				points.push({
					id: uuidv4(), // Generate unique ID for each chunk
					vector: embedding,
					payload: {
						...metadata, // Include original document metadata
						content: chunk, // Store the chunk content itself
						chunkIndex: i, // Add chunk index for reference
					},
				});
				if ((i + 1) % 10 === 0 || i === chunks.length - 1) { // Log progress
					this.logger.debug(`Generated embeddings for ${i + 1}/${chunks.length} chunks.`);
				}
			} catch (error) {
				this.logger.error(`Failed to generate embedding for chunk ${i}:`, { error, chunk });
				// Decide on error handling: skip chunk, or fail entire operation?
				// For now, let's fail the operation.
				throw new Error(`Embedding generation failed for chunk ${i}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
		this.logger.info(`Successfully generated embeddings for all ${chunks.length} chunks.`);

		// 3. Upsert points to Qdrant
		try {
			this.logger.debug(`Upserting ${points.length} points to collection '${this.config.collectionName}'...`);
			await this.client.upsert(this.config.collectionName, {
				wait: true, // Wait for operation to complete
				points: points,
			});
			this.logger.info(`Successfully upserted ${points.length} points.`);
		} catch (error) {
			this.logger.error('Error upserting points to Qdrant:', { error });
			throw new Error(`Qdrant upsert failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async retrieveContext(queryText: string, options: RetrievalOptions = {}): Promise<RetrievedChunk[]> {
		this.logger.debug(`Retrieving context for query: "${queryText.substring(0, 50)}..." with options:`, options);
		// 1. Get query embedding
		const [queryVector] = await this.embeddings.embed(queryText);
		if (!queryVector) {
			throw new Error('Failed to generate embedding for the query text.');
		}

		// 2. Search Qdrant
		try {
			const searchResult = await this.client.search(this.config.collectionName, {
				vector: queryVector,
				limit: options.limit ?? 5, // Use provided limit or default
				score_threshold: options.scoreThreshold, // Use provided threshold if any
				// filter: options.filter, // TODO: Add filter conversion if needed
				with_payload: true, // Crucial to get the content back
				with_vector: false, // Usually don't need the vector itself back
			});

			this.logger.debug(`Qdrant search returned ${searchResult.length} results.`);

			// 3. Map results to RetrievedChunk format
			const retrievedChunks: RetrievedChunk[] = searchResult.map((point) => {
				const payload = point.payload as Record<string, any> | undefined;
				const content = payload?.content as string ?? ''; // Extract content
				// Prepare metadata, excluding the content field itself
				const metadata = { ...payload };
				delete metadata.content;

				return {
					content: content,
					score: point.score,
					metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
				};
			});

			return retrievedChunks;
		} catch (error) {
			this.logger.error('Error searching Qdrant:', { error });
			throw new Error(`Qdrant search failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
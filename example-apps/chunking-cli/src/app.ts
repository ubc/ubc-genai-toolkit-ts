/**
 * @fileoverview Defines the main application class for the Chunking CLI Example.
 *
 * This class handles:
 * - Initializing the ChunkingModule based on configuration.
 * - Reading text and markdown files from a specified data directory.
 * - Converting file contents into Document objects.
 * - Calling the chunking module to split the documents.
 * - Displaying the resulting chunks and metadata.
 * - Handling errors.
 */

import fs from 'fs';
import path from 'path';
import { ChunkingModule, ChunkingConfig, Document, Chunk } from '@ubc-genai-toolkit/chunking';
import { ToolkitError, LoggerInterface } from '@ubc-genai-toolkit/core';

// Define the path to the data directory relative to the src directory
// When running from dist/, __dirname is dist/, so go up one level, then into src/data
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

export class ChunkingApp {
	private chunkingModule: ChunkingModule;
	private logger: LoggerInterface;
	private config: Partial<ChunkingConfig>;

	/**
	 * Creates an instance of ChunkingApp.
	 *
	 * @param {Partial<ChunkingConfig>} config The configuration object used to initialize the ChunkingModule.
	 */
	constructor(config: Partial<ChunkingConfig>) {
		this.config = config;
		this.logger = config.logger!;
		// Initialize the ChunkingModule with the given configuration.
		this.chunkingModule = new ChunkingModule(config);
	}

	/**
	 * Runs the main chunking process.
	 *
	 * - Logs the configuration being used.
	 * - Reads files from the data directory.
	 * - Chunks the documents found.
	 * - Prints the results to the console.
	 * - Handles errors gracefully.
	 */
	async run(): Promise<void> {
		console.log('\n=== UBC GenAI Toolkit - Chunking CLI Example ===');
		this.logger.info(`Using Chunking Strategy: ${this.chunkingModule.getDefaultStrategyName()}`);
		this.logger.info(`Default Chunk Options: ${JSON.stringify(this.config.defaultOptions || '{}')}`);
		this.logger.info(`Reading documents from: ${DATA_DIR}`);

		try {
			// 1. Read files and create Document objects
			const documents = this.readDocumentsFromDataDir();

			if (documents.length === 0) {
				this.logger.warn('No documents found in the data directory. Exiting.');
				return;
			}

			this.logger.info(`Found ${documents.length} documents to chunk.`);

			// 2. Chunk the documents
			const startTime = Date.now();
			const chunkingResponse = await this.chunkingModule.chunkDocuments(documents);
			const endTime = Date.now();

			// 3. Display the results
			console.log(`\n--- Chunking Results ---`);
			console.log(`Strategy Used: ${chunkingResponse.strategy}`);
			console.log(`Total Documents Chunked: ${documents.length}`);
			console.log(`Total Chunks Generated: ${chunkingResponse.metadata.totalChunks}`);
			console.log(`Time Taken: ${endTime - startTime} ms`);

			console.log('\n--- Generated Chunks --- \n');
			chunkingResponse.chunks.forEach((chunk: Chunk) => {
				this.printChunk(chunk);
			});

		} catch (error) {
			// Handle errors gracefully.
			if (error instanceof ToolkitError) {
				this.logger.error(`Chunking Error: ${error.message} (Code: ${error.code})`);
				if (error.details) {
					this.logger.error('Details:', error.details);
				}
			} else {
				this.logger.error('An unexpected error occurred during chunking:', { error });
			}
			console.error('\nChunking process failed. See logs for details.');
		}
	}

	/**
	 * Reads supported files (.txt, .md) from the DATA_DIR and converts them into Document objects.
	 *
	 * @returns {Document[]} An array of Document objects.
	 */
	private readDocumentsFromDataDir(): Document[] {
		const documents: Document[] = [];
		try {
			if (!fs.existsSync(DATA_DIR)) {
				this.logger.warn(`Data directory not found: ${DATA_DIR}. Cannot read documents.`);
				return [];
			}

			const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.md'));

			for (const file of files) {
				const filePath = path.join(DATA_DIR, file);
				try {
					this.logger.debug(`Reading file: ${file}`);
					const content = fs.readFileSync(filePath, 'utf-8');
					// Use filename as sourceId
					documents.push({ content, metadata: { sourceId: file } });
				} catch (fileError) {
					this.logger.error(`Failed to read file: ${file}`, { error: fileError });
					// Skip this file and continue
				}
			}
		} catch (error) {
			this.logger.error('Error reading from data directory:', { error });
			// Return empty array or rethrow depending on desired behavior
		}
		return documents;
	}

	/**
	 * Prints the details of a single chunk to the console.
	 *
	 * @param {Chunk} chunk - The chunk to display.
	 */
	private printChunk(chunk: Chunk): void {
		console.log(`----------------------------------------`);
		console.log(`Source: ${chunk.metadata.sourceDocumentMetadata.sourceId}`);
		console.log(`Chunk Number: ${chunk.metadata.chunkNumber}`);
		console.log(`Character Length: ${chunk.metadata.characterLength}`);
		// console.log(`Estimated Tokens: ${chunk.metadata.estimatedTokenCount || 'N/A'}`); // Uncomment if/when token count is added
		console.log(`\nContent:\n"${chunk.text}"`);
		console.log(`----------------------------------------\n`);
	}
}
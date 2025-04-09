/**
 * @fileoverview Defines the main application class for the RAG Example.
 *
 * Orchestrates RAGModule and LLMModule initialization, data indexing,
 * and the interactive query loop demonstrating RAG vs. standard LLM responses.
 */

import fs from 'fs';
import path from 'path';
import readlineSync from 'readline-sync';
import { LLMModule } from '@ubc-genai-toolkit/llm';
import { RAGModule, RetrievedChunk } from '@ubc-genai-toolkit/rag';
import { ToolkitError, LoggerInterface } from '@ubc-genai-toolkit/core';
import { AppConfig } from './config';

// Define the path to the data directory relative to the src directory
// When running from dist, __dirname is dist/, so go up one level then into src/data
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

export class RAGApp {
	private config: AppConfig;
	private logger: LoggerInterface;
	private llm: LLMModule;
	private rag: RAGModule;
	private isInitialized = false;

	constructor(config: AppConfig) {
		this.config = config;
		this.logger = config.logger; // Use the logger from config
		// LLM and RAG modules will be initialized in the async initialize() method
		this.llm = new LLMModule(config.llmConfig);
		// RAGModule requires async initialization via create()
		this.rag = {} as RAGModule; // Placeholder, assigned in initialize
	}

	/**
	 * Asynchronously initializes the RAG module and indexes documents.
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			this.logger.warn('RAGApp already initialized.');
			return;
		}

		try {
			this.logger.info('Initializing RAGApp...');
			this.logger.info(`Using LLM Provider: ${this.llm.getProviderName()}`);

			// Initialize RAG Module (which includes internal embeddings)
			this.rag = await RAGModule.create(this.config.ragConfig);
			this.logger.info('RAGModule initialized successfully.');

			// Index documents from the data directory
			await this.indexData();

			this.isInitialized = true;
			this.logger.info('RAGApp initialization complete.');
		} catch (error) {
			this.logger.error('Failed to initialize RAGApp:', { error });
			// Rethrow or handle as appropriate for the application entry point
			throw error;
		}
	}

	/**
	 * Reads files from the data directory and indexes them using the RAG module.
	 */
	private async indexData(): Promise<void> {
		this.logger.info(`Indexing documents from: ${DATA_DIR}`);
		try {
			if (!fs.existsSync(DATA_DIR)) {
				this.logger.warn(`Data directory not found: ${DATA_DIR}. Skipping indexing.`);
				this.logger.warn('Please create the directory and add Markdown (.md) files to index data.');
				return;
			}

			const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md'));
			if (files.length === 0) {
				this.logger.warn(`No .md files found in ${DATA_DIR}. Nothing to index.`);
				return;
			}

			this.logger.info(`Found ${files.length} Markdown files to index.`);

			for (const file of files) {
				const filePath = path.join(DATA_DIR, file);
				try {
					this.logger.debug(`Reading file: ${file}`);
					const content = fs.readFileSync(filePath, 'utf-8');
					this.logger.info(`Indexing document: ${file} (Length: ${content.length})`);
					// Add document with filename as metadata
					// The method now returns the IDs of the added chunks, but we don't need them here.
					const addedChunkIds = await this.rag.addDocument(content, { source: file });
					this.logger.info(`Successfully indexed: ${file} (Chunks added: ${addedChunkIds.length})`);
				} catch (fileError) {
					this.logger.error(`Failed to read or index file: ${file}`, { error: fileError });
					// Continue to next file
				}
			}
			this.logger.info('Finished indexing all documents.');
		} catch (error) {
			this.logger.error('Error during data indexing process:', { error });
			// Decide if this should halt initialization or just log
			throw new Error('Data indexing failed.'); // Halt for now
		}
	}

	/**
	 * Creates the augmented prompt for the LLM using retrieved context.
	 */
	private buildAugmentedPrompt(query: string, context: RetrievedChunk[]): string {
		const contextHeader = "Based on the following context:";
		const contextSeparator = "---";
		const questionHeader = "Please answer the following question:";

		const contextStrings = context.map(chunk => chunk.content);

		return [
			contextHeader,
			contextSeparator,
			...contextStrings.map(s => `${s}\n${contextSeparator}`),
			questionHeader,
			query,
		].join('\n\n');
	}

	/**
	 * Runs the main interactive query loop.
	 */
	async run(): Promise<void> {
		if (!this.isInitialized) {
			this.logger.error('RAGApp is not initialized. Call initialize() first.');
			return;
		}

		console.log('\n=== UBC GenAI Toolkit - RAG Example ===');
		console.log(`Ask questions about the indexed documents. Type 'exit' or 'quit' to stop.`);

		try {
			while (true) {
				const userInput = readlineSync.question('\nYou: ');

				if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
					console.log('Goodbye!');
					break;
				}

				// --- 1. Standard LLM Query (No RAG) ---
				console.log('\n--- Standard LLM Response ---');
				process.stdout.write('Assistant: ');
				try {
					// Use the LLM module directly with a simple conversation
					const standardConversation = this.llm.createConversation();
					// Optional: Add a basic system prompt if desired
					// standardConversation.addMessage('system', 'You are a helpful assistant.');
					standardConversation.addMessage('user', userInput);
					await standardConversation.stream((chunk) => process.stdout.write(chunk));
					console.log('\n'); // Newline after stream
				} catch (llmError) {
					this.logger.error('Error during standard LLM query:', { error: llmError });
					console.error('\nError getting standard LLM response.');
				}

				// --- 2. RAG-Enhanced Query ---
				console.log('\n--- RAG-Enhanced LLM Response ---');
				try {
					// a) Retrieve Context
					this.logger.info(`Retrieving context for query: "${userInput.substring(0, 50)}..."`);
					const retrievedContext = await this.rag.retrieveContext(userInput);
					this.logger.info(`Retrieved ${retrievedContext.length} context chunks.`);

					// Log retrieved context for transparency
					if (retrievedContext.length > 0) {
						console.log('\nRetrieved Context Chunks:');
						retrievedContext.forEach((chunk, index) => {
							console.log(`  [${index + 1}] Score: ${chunk.score.toFixed(4)} | Source: ${chunk.metadata?.source || 'N/A'}`);
							console.log(`      Content: ${chunk.content.substring(0, 100).replace(/\n/g, ' ')}...`);
						});
					} else {
						console.log('\nNo relevant context chunks found.');
					}

					// b) Build Augmented Prompt
					const augmentedPrompt = this.buildAugmentedPrompt(userInput, retrievedContext);
					if (this.config.debug) {
						this.logger.debug('Augmented Prompt:', { prompt: augmentedPrompt });
					}

					// c) Query LLM with Augmented Prompt
					process.stdout.write('\nAssistant (RAG): ');
					const ragConversation = this.llm.createConversation();
					// Add the single augmented prompt as the user message
					ragConversation.addMessage('user', augmentedPrompt);
					await ragConversation.stream((chunk) => process.stdout.write(chunk));
					console.log('\n'); // Newline after stream

				} catch (ragError) {
					this.logger.error('Error during RAG-enhanced query:', { error: ragError });
					console.error('\nError getting RAG-enhanced LLM response.');
				}
			}
		} catch (error) {
			if (error instanceof ToolkitError) {
				this.logger.error(`Toolkit Error: ${error.message} (Code: ${error.code})`, {
					details: error.details,
				});
				console.error(`\nError: ${error.message}`);
			} else {
				this.logger.error('An unexpected error occurred in the run loop:', { error });
				console.error('\nAn unexpected error occurred.');
			}
		}
	}
}
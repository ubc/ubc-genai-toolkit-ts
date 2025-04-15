/**
 * @fileoverview Defines the main application class for the Document Parsing CLI Example.
 */

import readlineSync from 'readline-sync';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
	DocumentParsingModule,
	DocumentParsingConfig,
	SupportedOutputFormat,
	ParsingError,
	UnsupportedFileTypeError,
} from '@ubc-genai-toolkit/document-parsing';
import { ToolkitError } from '@ubc-genai-toolkit/core';

/**
 * Represents the core logic for the interactive document parsing CLI application.
 */
export class DocParsingApp {
	private docParser: DocumentParsingModule;
	private dataDir: string;

	/**
	 * Creates an instance of DocParsingApp.
	 *
	 * @param {Partial<DocumentParsingConfig>} config Configuration for the DocumentParsingModule.
	 */
	constructor(config: Partial<DocumentParsingConfig>) {
		this.docParser = new DocumentParsingModule(config);

		// Determine the path to the src/data directory relative to the app's root (process.cwd() is likely the workspace root)
		this.dataDir = path.resolve(process.cwd(), 'src/data');
	}

	/**
	 * Runs the main interactive loop for parsing documents.
	 */
	async run(): Promise<void> {
		console.log(`=== UBC GenAI Toolkit - Document Parsing CLI Example ===`);
		console.log(`Sample files located in: ${this.dataDir}`);

		try {
			const files = await this._findSupportedFiles();
			if (files.length === 0) {
				console.warn('No supported sample files (.pdf, .docx, .html, .md) found in data directory.');
				return;
			}

			console.log('\nFound sample files:');
			files.forEach((file, index) => console.log(`${index + 1}. ${path.basename(file)}`));

			// Prompt for output format
			const formatChoice = readlineSync.keyInSelect([
				'Markdown',
				'Plain Text',
			], 'Choose output format:', { cancel: 'Exit' });

			if (formatChoice === -1) {
				console.log('Exiting.');
				return;
			}

			const outputFormat: SupportedOutputFormat = formatChoice === 0 ? 'markdown' : 'text';
			console.log(`\nParsing files to ${outputFormat}...\n`);

			// Parse each file
			for (const filePath of files) {
				const fileName = path.basename(filePath);
				console.log(`--- Parsing ${fileName} ---`);
				try {
					const result = await this.docParser.parse({ filePath }, outputFormat);
					console.log(`Detected Type: ${result.metadata?.detectedInputType || 'N/A'}`);
					console.log('\nContent:');
					// Limit output length for display purposes
					const maxLen = 500;
					const truncatedContent = result.content.length > maxLen
						? result.content.substring(0, maxLen) + '... [truncated]'
						: result.content;
					console.log(truncatedContent);
				} catch (error) {
					if (error instanceof UnsupportedFileTypeError) {
						console.error(`Skipping ${fileName}: ${error.message}`);
					} else if (error instanceof ParsingError) {
						console.error(`Error parsing ${fileName}: ${error.message}`);
						if (error.details) console.error('Details:', error.details);
					} else if (error instanceof ToolkitError) {
						console.error(`Toolkit Error for ${fileName}: ${error.message} (Code: ${error.code})`);
					} else {
						console.error(`Unexpected error for ${fileName}:`, error);
					}
				}
				console.log(`--- Finished ${fileName} ---\n`);
			}

		} catch (error) {
			console.error('An unexpected error occurred in the application:', error);
		}
	}

	/**
	 * Finds supported files in the data directory.
	 */
	private async _findSupportedFiles(): Promise<string[]> {
		const supportedExtensions = ['.pdf', '.docx', '.html', '.htm', '.md'];
		try {
			const entries = await fs.readdir(this.dataDir, { withFileTypes: true });
			return entries
				.filter(entry => entry.isFile() && supportedExtensions.includes(path.extname(entry.name).toLowerCase()))
				.map(entry => path.join(this.dataDir, entry.name));
		} catch (error) {
			console.error(`Error reading data directory: ${this.dataDir}`, error);
			return []; // Return empty array if directory cannot be read
		}
	}
}
import {
	LoggerInterface,
	ModuleConfig,
	NoopLogger,
	mergeWithDefaults,
	ToolkitError,
} from '@ubc-genai-toolkit/core';
import {
	DocumentParsingConfig,
	ParseInput,
	ParsingResult,
	SupportedOutputFormat,
	SupportedInputMimeType,
	SupportedInputExtension,
} from './types';
import { UnsupportedFileTypeError, ParsingError } from './error';
import * as path from 'path';
import * as fs from 'fs/promises';

// Import parsing libraries
import pdf2md from '@opendocsg/pdf2md';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import markdownToText from 'markdown-to-text';

// Define default configuration if any specific defaults are needed for this module
const DEFAULT_DOC_PARSING_CONFIG: Partial<DocumentParsingConfig> = {
	logger: new NoopLogger(), // Default to NoopLogger if none provided
	debug: false,
};

/**
 * The main facade class for the Document Parsing module.
 * Provides a simple interface to parse various document types.
 */
export class DocumentParsingModule {
	private config: DocumentParsingConfig;
	private logger: LoggerInterface;
	private turndownService: TurndownService;

	/**
	 * Creates an instance of DocumentParsingModule.
	 *
	 * @param {Partial<DocumentParsingConfig>} config - Optional configuration settings.
	 */
	constructor(config?: Partial<DocumentParsingConfig>) {
		// Merge provided config with defaults
		this.config = mergeWithDefaults<DocumentParsingConfig>(
			config,
			DEFAULT_DOC_PARSING_CONFIG
		);
		// Ensure a logger is available
		this.logger = this.config.logger || new NoopLogger();
		// Initialize Turndown service for HTML -> Markdown conversion
		this.turndownService = new TurndownService();

		if (this.config.debug) {
			this.logger.debug('DocumentParsingModule initialized', { config: this.config });
		}
	}

	/**
	 * Parses the content of a document specified by the input parameters.
	 *
	 * @param {ParseInput} input - The input specification (e.g., { filePath: string }).
	 * @param {SupportedOutputFormat} outputFormat - The desired output format ('text' or 'markdown').
	 * @returns {Promise<ParsingResult>} A promise resolving to the parsing result (content and metadata).
	 * @throws {UnsupportedFileTypeError} If the input file type is not supported.
	 * @throws {ParsingError} If an error occurs during file access or parsing.
	 */
	async parse(
		input: ParseInput,
		outputFormat: SupportedOutputFormat
	): Promise<ParsingResult> {
		this.logger.debug('Starting document parsing', { input, outputFormat });

		const { filePath } = input;

		// Basic check for file existence
		try {
			await fs.access(filePath);
		} catch (error) {
			this.logger.error('File not accessible', { filePath, error });
			throw new ParsingError('File not found or inaccessible', filePath, error);
		}

		// --- Step 4: Implement File Type Detection ---
		let detectedType: SupportedInputMimeType | SupportedInputExtension | undefined;
		let finalType: SupportedInputMimeType | SupportedInputExtension | 'unknown' = 'unknown';

		try {
			detectedType = await this._detectFileType(filePath);
			finalType = detectedType || 'unknown'; // Assign to finalType for metadata
			this.logger.info(`Detected file type: ${finalType}`, { filePath });

			if (!detectedType) {
				throw new UnsupportedFileTypeError(undefined, filePath);
			}
		} catch (error) {
			if (error instanceof ToolkitError) {
				throw error; // Re-throw known toolkit errors
			}
			this.logger.error('Error during file type detection', { filePath, error });
			throw new ParsingError('Failed to determine file type', filePath, error);
		}

		// --- Step 5: Implement Parsing Logic ---
		let content = '';
		try {
			switch (detectedType) {
				case 'application/pdf':
					content = await this._parsePdf(filePath, outputFormat);
					break;
				case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
					content = await this._parseDocx(filePath, outputFormat);
					break;
				case 'text/html':
					content = await this._parseHtml(filePath, outputFormat);
					break;
				case 'text/markdown':
					content = await this._parseMarkdown(filePath, outputFormat);
					break;
				default:
					// This case should technically be unreachable due to the check above
					this.logger.error('Reached default case in parsing logic - should not happen', { detectedType });
					throw new UnsupportedFileTypeError(detectedType, filePath, { internalError: 'Parsing logic mismatch'});
			}
		} catch (error) {
			if (error instanceof ToolkitError) {
				// If it's already a ParsingError or UnsupportedFileTypeError from helpers, re-throw
				throw error;
			}
			// Wrap unexpected errors from libraries in ParsingError
			this.logger.error('Error during document parsing process', { filePath, detectedType, error });
			const message = error instanceof Error ? error.message : 'Unknown parsing error';
			throw new ParsingError(message, filePath, error);
		}

		// --- Construct Result ---
		const result: ParsingResult = {
			content: content,
			metadata: {
				detectedInputType: finalType,
			},
		};

		this.logger.debug('Parsing completed successfully', { filePath, outputFormat });
		return result;
	}

	// --- Internal Helper Methods ---

	/**
	 * Detects the file type using MIME type first, then falling back to extension.
	 * @param filePath The path to the file.
	 * @returns The detected supported MIME type or extension, or undefined if unsupported/error.
	 * @throws {ParsingError} If MIME detection library throws an unexpected error.
	 * @throws {UnsupportedFileTypeError} If the file extension is not supported after fallback.
	 */
	private async _detectFileType(
		filePath: string
	): Promise<SupportedInputMimeType | SupportedInputExtension | undefined> {
		// 1. Try MIME type detection using dynamic import (via new Function to bypass tsc transform)
		let mimeType: string | undefined;
		try {
			// Use Function constructor for dynamic import to prevent tsc commonjs transform
            const dynamicImport = new Function('specifier', 'return import(specifier)');
            const fileTypeModule = await dynamicImport('file-type');
            const fileTypeFromFile = fileTypeModule.fileTypeFromFile;

			// Check if the function was loaded correctly
			if (typeof fileTypeFromFile !== 'function') {
				throw new Error('Failed to dynamically load fileTypeFromFile function.');
			}

			const fileTypeResult = await fileTypeFromFile(filePath);
			mimeType = fileTypeResult?.mime;
			if (mimeType) {
				this.logger.debug(`Detected MIME type: ${mimeType}`, { filePath });
				// Check if the detected MIME type is in our supported list
				switch (mimeType) {
					case 'application/pdf':
					case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
					case 'text/html':
					case 'text/markdown':
						return mimeType as SupportedInputMimeType;
				}
			}
		} catch (error) {
			// Log warning but continue to fallback. If fileTypeFromFile throws unexpectedly, wrap it.
			this.logger.warn('MIME type detection failed or library errored.', { filePath, error });
			if (!(error instanceof Error && error.message.includes('ENOENT'))) { // Ignore simple file not found here, handled earlier
                // Re-throw unexpected errors from file-type library as ParsingError
                throw new ParsingError('MIME type detection library failed', filePath, error);
            }
		}

		// 2. Fallback to file extension
		const extension = path.extname(filePath).toLowerCase() as SupportedInputExtension;
		this.logger.debug(`Falling back to file extension: ${extension}`, { filePath });

		switch (extension) {
			case '.pdf':
				return 'application/pdf';
			case '.docx':
				return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
			case '.html':
			case '.htm':
				return 'text/html';
			case '.md':
				return 'text/markdown';
			default:
				this.logger.warn(`Unsupported file extension: ${extension}`, { filePath });
				// Throw specific error here instead of returning undefined
				throw new UnsupportedFileTypeError(extension, filePath);
		}
	}

	/** Parses PDF content. */
	private async _parsePdf(
		filePath: string,
		outputFormat: SupportedOutputFormat
	): Promise<string> {
		this.logger.debug('Parsing PDF', { filePath, outputFormat });
		try {
			// Read the file content into a buffer
			const pdfBuffer = await fs.readFile(filePath);

			// Pass the buffer to pdf2md
			const markdownContent = await pdf2md(pdfBuffer);
			if (outputFormat === 'markdown') {
				return markdownContent;
			} else {
				// Convert markdown to text
				return markdownToText(markdownContent);
			}
		} catch (error) {
			this.logger.error('PDF parsing failed', { filePath, error });
			throw new ParsingError('Failed to parse PDF file', filePath, error);
		}
	}

	/** Parses DOCX content. */
	private async _parseDocx(
		filePath: string,
		outputFormat: SupportedOutputFormat
	): Promise<string> {
		this.logger.debug('Parsing DOCX', { filePath, outputFormat });
		try {
			// 1. Convert DOCX to HTML
			const { value: htmlContent } = await mammoth.convertToHtml({ path: filePath });

			// 2. Convert HTML to Markdown
			const markdownContent = this.turndownService.turndown(htmlContent);

			if (outputFormat === 'markdown') {
				return markdownContent;
			} else {
				// 3. Convert Markdown to Text
				return markdownToText(markdownContent);
			}
		} catch (error) {
			this.logger.error('DOCX parsing failed', { filePath, error });
			throw new ParsingError('Failed to parse DOCX file', filePath, error);
		}
	}

	/** Parses HTML content. */
	private async _parseHtml(
		filePath: string,
		outputFormat: SupportedOutputFormat
	): Promise<string> {
		this.logger.debug('Parsing HTML', { filePath, outputFormat });
		try {
			// 1. Read HTML file content
			const htmlContent = await fs.readFile(filePath, 'utf-8');

			// 2. Convert HTML to Markdown
			const markdownContent = this.turndownService.turndown(htmlContent);

			if (outputFormat === 'markdown') {
				return markdownContent;
			} else {
				// 3. Convert Markdown to Text
				return markdownToText(markdownContent);
			}
		} catch (error) {
			this.logger.error('HTML parsing failed', { filePath, error });
			throw new ParsingError('Failed to parse HTML file', filePath, error);
		}
	}

	/** Parses Markdown content. */
	private async _parseMarkdown(
		filePath: string,
		outputFormat: SupportedOutputFormat
	): Promise<string> {
		this.logger.debug('Parsing Markdown', { filePath, outputFormat });
		try {
			// 1. Read Markdown file content
			const markdownContent = await fs.readFile(filePath, 'utf-8');

			if (outputFormat === 'markdown') {
				return markdownContent;
			} else {
				// 2. Convert Markdown to Text
				return markdownToText(markdownContent);
			}
		} catch (error) {
			this.logger.error('Markdown parsing/reading failed', { filePath, error });
			throw new ParsingError('Failed to parse Markdown file', filePath, error);
		}
	}
}
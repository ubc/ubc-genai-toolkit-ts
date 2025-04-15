import { ToolkitError } from '@ubc-genai-toolkit/core';

/**
 * Error indicating that the input file type is not supported by the module.
 */
export class UnsupportedFileTypeError extends ToolkitError {
	constructor(detectedType: string | undefined, filePath: string, details?: any) {
		super(
			`Unsupported file type ('${detectedType || 'unknown'}') for file: ${filePath}`,
			415, // HTTP 415 Unsupported Media Type
			details
		);
	}
}

/**
 * Generic error during the parsing process (e.g., file access issues, library errors).
 */
export class ParsingError extends ToolkitError {
	constructor(message: string, filePath: string, details?: any) {
		super(`Parsing error for file ${filePath}: ${message}`, 500, details);
	}
}
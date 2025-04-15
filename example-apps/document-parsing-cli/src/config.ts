/**
 * @fileoverview Configuration loader for the Document Parsing CLI Example Application.
 */

import dotenv from 'dotenv';
import { DocumentParsingConfig } from '@ubc-genai-toolkit/document-parsing';
import { ConsoleLogger } from '@ubc-genai-toolkit/core';

// Load environment variables from .env file
dotenv.config();

/**
 * Loads configuration for the Document Parsing module from environment variables.
 *
 * Currently only supports configuring the logger and debug flag via environment variables.
 *
 * @returns {Partial<DocumentParsingConfig>} The configuration object for the DocumentParsingModule.
 */
export function loadConfig(): Partial<DocumentParsingConfig> {
	// Create a simple console logger instance.
	const logger = new ConsoleLogger('DocParseCLI');

	// Construct and return the config object.
	return {
		logger,      // Logger instance
		debug: process.env.DEBUG === 'true', // Enable debug logging if DEBUG=true
	};
}
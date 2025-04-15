import { ModuleConfig } from '@ubc-genai-toolkit/core';

/**
 * Supported input document MIME types (or extensions as fallback).
 * Using common MIME types.
 */
export type SupportedInputMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  | 'text/html'
  | 'text/markdown';

/**
 * Supported file extensions (used as fallback or for explicit typing).
 */
export type SupportedInputExtension = '.pdf' | '.docx' | '.html' | '.htm' | '.md';

/**
 * Supported output formats.
 */
export type SupportedOutputFormat = 'text' | 'markdown';

/**
 * Configuration for the DocumentParsingModule.
 * Extends the core ModuleConfig for common options like logger and debug.
 */
export interface DocumentParsingConfig extends ModuleConfig {
  // No module-specific configuration options defined yet.
  // Placeholder for potential future additions like API keys for external services
  // or fine-grained parsing control.
}

/**
 * Input specification for the parse method.
 * Currently only supports file paths.
 */
export interface ParseInput {
  /**
   * The path to the input document file.
   */
  filePath: string;
}

/**
 * The result of a successful parsing operation.
 */
export interface ParsingResult {
  /**
   * The extracted content in the requested output format.
   */
  content: string;

  /**
   * Optional metadata about the parsing process or the document.
   * Examples: detected input type, warnings, character count, etc.
   */
  metadata?: {
    detectedInputType?: SupportedInputMimeType | SupportedInputExtension | 'unknown';
    [key: string]: any; // Allow for other arbitrary metadata
  };
}
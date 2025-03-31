/**
 * @fileoverview Configuration loader for the LLM Conversation Example Application.
 *
 * This module handles loading configuration settings from environment variables
 * using the `dotenv` package. It defines the structure of the configuration object (`LLMConfig`)
 * expected by the LLM module and provides default values where appropriate.
 */

import dotenv from 'dotenv';
import { LLMConfig } from '@ubc-genai-toolkit/llm';
import { ConsoleLogger } from '@ubc-genai-toolkit/core';

// Load environment variables from a .env file into process.env
// Ensures that variables defined in .env are available for the configuration.
dotenv.config();

/**
 * Loads LLM configuration from environment variables.
 *
 * Reads environment variables prefixed typically with `LLM_` (e.g., `LLM_PROVIDER`, `LLM_API_KEY`)
 * and constructs an `LLMConfig` object suitable for initializing the `LLMModule`.
 * Provides default values for provider ('openai') if not specified.
 * Also initializes a `ConsoleLogger` for use within the LLM module.
 *
 * @returns {LLMConfig} The configuration object for the LLM module.
 */
export function loadConfig(): Partial<LLMConfig> {
	// Determine the LLM provider. Defaults to 'openai'.
	// The type assertion ensures the value matches the expected literal types.
	const provider = (process.env.LLM_PROVIDER || 'openai') as
		| 'openai'
		| 'anthropic'
		| 'ollama';

	// Get the API key from environment variables. Required for providers like OpenAI.
	const apiKey = process.env.LLM_API_KEY;

	// Get the API endpoint URL. Required for providers like Ollama or self-hosted OpenAI compatible APIs.
	const endpoint = process.env.LLM_ENDPOINT;

	// Get the default model name. Specific default depends on provider if not set.
	const defaultModel = process.env.LLM_DEFAULT_MODEL;

	// Create a simple console logger instance.
	// This logger will be passed to the LLMModule for internal logging.
	const logger = new ConsoleLogger('LLMConversation');

	// Construct and return the LLMConfig object.
	return {
		provider,    // 'openai', 'ollama', etc.
		apiKey,      // API key (if applicable)
		endpoint,    // Endpoint URL (if applicable)
		defaultModel,// Default model name (now potentially undefined)
		logger,      // Logger instance
		debug: process.env.DEBUG === 'true', // Enable debug logging if DEBUG=true
	};
}
import { ModuleConfig } from '@ubc-genai-toolkit/core';
import { LLMConfig } from '@ubc-genai-toolkit/llm';
import { EmbeddingModel as FastEmbedModel } from 'fastembed'; // Rename to avoid naming conflict

/**
 * Specifies the underlying provider to use for generating embeddings.
 */
export type EmbeddingProviderType = 'ubc-genai-toolkit-llm' | 'fastembed';

/**
 * Configuration options specific to the FastEmbed provider.
 */
export interface FastEmbedConfig {
	/**
	 * The specific FastEmbed model to use.
	 * Defaults to FastEmbedModel.BGESmallENV15 if not specified.
	 */
	model?: FastEmbedModel;

	/**
	 * The maximum length of input sequences.
	 * Defaults to 512.
	 */
	maxLength?: number;

	/**
	 * Directory to cache downloaded models.
	 * Defaults to 'local_cache'.
	 */
	cacheDir?: string;

	/**
	 * Whether to show download progress bars.
	 * Defaults to true.
	 */
	showDownloadProgress?: boolean;

	// Note: executionProviders are not configurable for now, defaults to CPU.
}

/**
 * Configuration for the EmbeddingsModule.
 */
export interface EmbeddingsConfig extends ModuleConfig {
	/**
	 * The type of provider to use for generating embeddings.
	 */
	providerType: EmbeddingProviderType;

	/**
	 * Configuration for the LLM module, required if providerType is 'ubc-genai-toolkit-llm'.
	 * Note: The EmbeddingsModule will instantiate its own LLMModule based on this config.
	 */
	llmConfig?: Partial<LLMConfig>;

	/**
	 * Configuration specific to the FastEmbed provider, required if providerType is 'fastembed'.
	 */
	fastembedConfig?: Partial<FastEmbedConfig>;

    /**
     * Default batch size for embedding generation.
     * How many texts to process in one go, if the provider supports batching.
     * Defaults to 256.
     */
    batchSize?: number;
}
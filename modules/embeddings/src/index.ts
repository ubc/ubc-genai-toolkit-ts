// Entry point for the Embeddings module
export { EmbeddingsModule } from './embeddings-module';
export {
	EmbeddingsConfig,
	EmbeddingProviderType,
	FastEmbedConfig,
} from './types';

// Re-export FastEmbed model enum for convenience if needed by consumers
export { EmbeddingModel as FastEmbedModel } from 'fastembed';
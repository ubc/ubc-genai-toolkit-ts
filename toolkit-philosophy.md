# UBC GenAI Toolkit

## Overview

This document outlines the design principles and interfaces for a modular toolkit to support GenAI-powered web applications at the university. The toolkit provides standardized interfaces for authentication, LLM interaction, RAG capabilities, document processing, and LMS integration.

The toolkit follows the Facade pattern, where each module provides a stable, simplified interface that shields applications from the complexities of underlying implementations. This approach allows for swapping out underlying technologies without affecting consuming applications.

Each module will be developed as a separate package with its own versioning. The initial implementation will be in TypeScript, with plans to create Python and PHP versions in the future.

## Core Design Principles

1. **Modular Design**: Each capability is encapsulated in its own module
2. **Stable API**: Public interfaces remain stable even when underlying implementations change
3. **Implementation Agnostic**: Core APIs are defined independent of specific technologies
4. **Configurable**: Each module accepts relevant configuration at initialization
5. **Multi-instance**: Modules support multiple simultaneous instances
6. **Observable**: Consistent logging and monitoring patterns across modules
7. **Well-documented**: Comprehensive documentation with examples in all supported languages

## Common Patterns

### Error Handling

All modules follow a consistent error pattern:

```typescript
interface ToolkitError {
	code: number; // Numeric error code
	message: string; // Human-readable error message
	details?: any; // Optional additional details
	timestamp: string; // ISO timestamp when error occurred
}
```

Applications should handle errors through language-appropriate mechanisms:

-   JavaScript: Async/await with try/catch blocks or Promise rejection
-   Python: Exception handling with custom exception types
-   PHP: Exception handling with custom exception types

### Configuration

Each module accepts configuration on initialization:

```typescript
interface ModuleConfig {
	// Common configuration options
	logger?: LoggerInterface;
	metrics?: MetricsInterface;
	debug?: boolean;

	// Module-specific options defined by each module
	[key: string]: any;
}
```

### Logging

Modules accept a logger implementation that satisfies:

```typescript
interface LoggerInterface {
	debug(message: string, metadata?: object): void;
	info(message: string, metadata?: object): void;
	warn(message: string, metadata?: object): void;
	error(message: string, metadata?: object): void;
}
```

If no logger is provided, modules use a minimal default logger.

## Module Definitions

### Authentication Module

Provides standardized authentication via Shibboleth.

#### Configuration

```typescript
interface AuthConfig {
	// Common module config
	logger?: LoggerInterface;

	// Auth-specific config
	serviceUrl: string; // Application service URL
	idpUrl: string; // Identity Provider URL
	requiredAttributes: string[]; // Required user attributes
	optionalAttributes?: string[]; // Optional user attributes
	sessionDuration?: number; // Session duration in seconds
}
```

#### Core Methods

```typescript
interface AuthModule {
	// Initialize middleware for authentication
	initialize(): Middleware;

	// Check if current request is authenticated
	isAuthenticated(request: Request): boolean;

	// Get user data from authenticated request
	getUser(request: Request): User | null;

	// Get specific user attribute
	getAttribute(request: Request, name: string): any;

	// Logout current user
	logout(request: Request, response: Response): void;
}
```

### LLM Interaction Module

Provides standardized interaction with Large Language Models.

#### Configuration

```typescript
interface LLMConfig {
	// Common module config
	logger?: LoggerInterface;

	// LLM-specific config
	provider: 'openai' | 'anthropic' | 'ollama' | string;
	endpoint: string; // API endpoint
	apiKey: string; // API key
	defaultModel: string; // Default model to use
	defaultOptions?: {
		// Default request options
		temperature?: number;
		maxTokens?: number;
		jsonMode?: boolean;
		systemPrompt?: string;
		[key: string]: any;
	};
}
```

#### Core Methods

```typescript
interface LLMModule {
	// Send message to LLM and get response
	sendMessage(message: string, options?: object): Promise<LLMResponse>;

	// Create or update a conversation
	createConversation(id?: string, options?: object): Conversation;

	// Get streaming response from LLM
	streamMessage(
		message: string,
		callback: Function,
		options?: object
	): Promise<void>;
}

interface Conversation {
	// Add message to conversation
	addMessage(role: 'user' | 'assistant' | 'system', content: string): void;

	// Get current conversation history
	getHistory(): Message[];

	// Send conversation to LLM and get response
	send(options?: object): Promise<LLMResponse>;
}
```

### RAG Module

Provides vector database integration for retrieval-augmented generation.

#### Configuration

```typescript
interface RAGConfig {
	// Common module config
	logger?: LoggerInterface;

	// RAG-specific config
	database: 'pinecone' | 'chroma' | 'qdrant' | string;
	endpoint?: string; // Database endpoint if applicable
	apiKey?: string; // API key if needed
	collection: string; // Default collection/namespace
	embeddingProvider?: string; // Which embedding model to use
	dimensions?: number; // Vector dimensions
}
```

#### Core Methods

```typescript
interface RAGModule {
	// Store document with embeddings
	storeDocument(document: Document): Promise<string>;

	// Query collection with text and return relevant documents
	query(text: string, options?: QueryOptions): Promise<Document[]>;

	// Delete document(s)
	deleteDocuments(ids: string[]): Promise<void>;

	// Update document
	updateDocument(id: string, document: Document): Promise<void>;
}
```

### Document Processing Module

Provides document conversion and analysis capabilities.

#### Configuration

```typescript
interface DocumentProcessorConfig {
	// Common module config
	logger?: LoggerInterface;

	// Doc processing config
	tempDir?: string; // Directory for temporary files
	chunkSize?: number; // Default chunk size for splitting
	extractImages?: boolean; // Whether to extract images
	ocrEnabled?: boolean; // Whether to perform OCR on images
}
```

#### Core Methods

```typescript
interface DocumentProcessorModule {
	// Convert document to markdown
	toMarkdown(file: File | Buffer | string): Promise<string>;

	// Extract text from document
	extractText(file: File | Buffer | string): Promise<string>;

	// Split document into chunks
	chunkDocument(text: string, options?: ChunkOptions): string[];

	// Extract metadata from document
	extractMetadata(file: File | Buffer | string): Promise<DocumentMetadata>;
}
```

### LTI Integration Module

Provides integration with Canvas and other LMS systems via LTI.

#### Configuration

```typescript
interface LTIConfig {
	// Common module config
	logger?: LoggerInterface;

	// LTI-specific config
	consumerKey: string; // LTI consumer key
	consumerSecret: string; // LTI consumer secret
	version: '1.0' | '1.1' | '1.3'; // LTI version
	platform: 'canvas' | 'moodle' | string; // LMS platform
	toolUrl: string; // Tool URL
}
```

#### Core Methods

```typescript
interface LTIModule {
	// Initialize LTI middleware
	initialize(): Middleware;

	// Validate LTI request
	validateRequest(request: Request): boolean;

	// Get course context from request
	getCourseContext(request: Request): CourseContext;

	// Get user context from request
	getUserContext(request: Request): LTIUserContext;
}
```

## Data Models

### Embedding Module

Provides embedding generation for text.

#### Configuration

```typescript
interface EmbeddingConfig {
	// Common module config
	logger?: LoggerInterface;

	// Embedding-specific config
	provider: 'openai' | 'huggingface' | string;
	endpoint: string; // API endpoint
	apiKey: string; // API key
	defaultModel: string; // Default embedding model
	dimensions?: number; // Expected embedding dimensions
	normalized?: boolean; // Whether to normalize vectors
}
```

#### Core Methods

```typescript
interface EmbeddingModule {
	// Generate embeddings for text
	generateEmbedding(text: string): Promise<number[]>;

	// Generate embeddings for multiple texts in batch
	generateEmbeddings(texts: string[]): Promise<number[][]>;

	// Compare similarity between two texts
	compareSimilarity(text1: string, text2: string): Promise<number>;
}
```

### Common Types

The following types are shared across multiple modules to ensure consistency in data structures.

```typescript
/**
 * User - Represents a fully authenticated user from the Shibboleth authentication system
 *
 * This is the primary user representation within applications and contains
 * comprehensive information provided by the university's identity provider.
 */
interface User {
	/** Unique identifier for the user (typically the university ID) */
	id: string;

	/** User's email address (may be optional in some configurations) */
	email?: string;

	/** Array of roles the user has within the university system */
	roles: string[];

	/** Additional attributes provided by Shibboleth (depends on what was released to the application) */
	attributes: Record<string, any>;
}

/**
 * Document - Represents a document stored in the RAG system
 *
 * Used to store and retrieve information from the vector database.
 */
interface Document {
	/** Optional unique identifier (will be generated if not provided) */
	id?: string;

	/** The actual text content of the document */
	content: string;

	/** Metadata associated with the document */
	metadata: DocumentMetadata;

	/** Vector embedding of the document (typically generated automatically) */
	embedding?: number[];
}

/**
 * DocumentMetadata - Contains metadata associated with a document
 *
 * Used to store searchable metadata about documents in the RAG system.
 */
interface DocumentMetadata {
	/** Document title */
	title?: string;

	/** Document author */
	author?: string;

	/** Creation date (ISO string) */
	created?: string;

	/** Last modified date (ISO string) */
	modified?: string;

	/** Source of the document (e.g., file path, URL) */
	source?: string;

	/** MIME type of the original document */
	mimeType?: string;

	/** Any additional metadata fields */
	[key: string]: any;
}

/**
 * LLMResponse - Represents a response from a language model
 *
 * Standard format for responses from any LLM provider.
 */
interface LLMResponse {
	/** The text response from the LLM */
	content: string;

	/** Identifier of the model that generated the response */
	model: string;

	/** Token usage statistics */
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};

	/** Additional metadata returned by the LLM */
	metadata?: Record<string, any>;
}

/**
 * Message - Represents a single message in a conversation with an LLM
 *
 * Used to build and track conversation history.
 */
interface Message {
	/** Who sent the message */
	role: 'user' | 'assistant' | 'system';

	/** The content of the message */
	content: string;

	/** When the message was sent (ISO string) */
	timestamp?: string;
}

/**
 * QueryOptions - Options for querying the RAG database
 *
 * Controls how similarity searches are performed.
 */
interface QueryOptions {
	/** Maximum number of results to return */
	limit?: number;

	/** Minimum similarity score threshold */
	threshold?: number;

	/** Metadata filters to apply to the search */
	filters?: Record<string, any>;

	/** Whether to include document metadata in results */
	includeMetadata?: boolean;

	/** Whether to include vector embeddings in results */
	includeEmbeddings?: boolean;
}

/**
 * CourseContext - Represents a course context from an LTI launch
 *
 * Contains information about the course in which the LTI tool is being used.
 */
interface CourseContext {
	/** Course ID in the LMS */
	id: string;

	/** Course title */
	title: string;

	/** Course label/code */
	label?: string;

	/** Course membership information */
	memberships?: LTIMembership[];
}

/**
 * LTIUserContext - Represents a user context from an LTI launch
 *
 * Contains information about the user provided by the LMS during LTI launch.
 * This differs from the User interface as it specifically contains data
 * from the LMS rather than the university's identity provider.
 */
interface LTIUserContext {
	/** User ID in the LMS */
	id: string;

	/** User's display name in the LMS */
	name?: string;

	/** User's email in the LMS */
	email?: string;

	/** User's roles within the course (e.g., "Instructor", "Student") */
	roles: string[];
}
```

## Error Codes Reference

Each module defines specific error codes within these ranges:

-   1000-1999: Authentication errors
-   2000-2999: LLM interaction errors
-   3000-3999: RAG errors
-   4000-4999: Document processing errors
-   5000-5999: LTI integration errors

Specific error codes are documented in each module's reference.

## Module Relationships

The diagram below illustrates how the modules can work together in typical application workflows:

```
┌─────────────────────┐
│  Web Application    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Authentication     │◄───────────► Shibboleth Service
│     Module          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Application Logic   │
└┬────────┬────────┬──┘
 │        │        │
 ▼        ▼        ▼
┌────┐  ┌────┐  ┌────┐
│LLM │  │RAG │  │LTI │
│Mod │  │Mod │  │Mod │
└┬───┘  └┬───┘  └────┘
 │       │
 │       ▼
 │    ┌────────┐
 │    │Embedding│
 │    │ Module  │
 │    └────────┘
 │       ▲
 │       │
 ▼       │
┌─────────────────┐
│   Document      │
│ Processing Mod  │
└─────────────────┘
```

## Facade Pattern Implementation

Each module serves as a facade that provides a simplified interface over complex underlying systems. This pattern offers several benefits:

1. **Abstraction**: Hides the complexity of underlying libraries and services
2. **Interchangeability**: Allows swapping implementations without changing application code
3. **Standardization**: Provides consistent interfaces across different applications
4. **Isolation**: Limits the impact of changes in dependencies

Implementation example of a module using the facade pattern:

```typescript
// Example implementation of the LLM Module facade
class LLMModule implements LLMModuleInterface {
	private provider: LLMProvider;
	private logger: LoggerInterface;

	constructor(config: LLMConfig) {
		// Select the appropriate provider based on configuration
		this.provider = this.initializeProvider(config);
		this.logger = config.logger || new DefaultLogger();
	}

	private initializeProvider(config: LLMConfig): LLMProvider {
		switch (config.provider) {
			case 'openai':
				return new OpenAIProvider(config);
			case 'anthropic':
				return new AnthropicProvider(config);
			case 'ollama':
				return new OllamaProvider(config);
			default:
				throw new Error(`Unsupported provider: ${config.provider}`);
		}
	}

	// Implementation of the facade's public API
	async sendMessage(message: string, options?: object): Promise<LLMResponse> {
		this.logger.info('Sending message to LLM', {
			provider: this.provider.name,
		});
		try {
			const response = await this.provider.generateCompletion(
				message,
				options
			);
			return this.standardizeResponse(response);
		} catch (error) {
			this.logger.error('Error calling LLM', { error });
			throw this.standardizeError(error);
		}
	}

	// Other methods...
}
```

## Appendix: Implementation Considerations

### Authentication Considerations

-   Handle SP-initiated vs IdP-initiated authentication flows
-   Consider refresh token strategies
-   Plan for attribute mapping from Shibboleth to application model

### LLM Considerations

-   Implement token counting for budget monitoring
-   Consider caching strategies for repeated queries
-   Plan for handling rate limits and retries

### RAG Considerations

-   Consider strategies for updating embeddings when models change
-   Plan for vector database migrations
-   Implement document versioning if needed

### Document Processing Considerations

-   Handle large documents that may exceed memory limits
-   Implement fallback strategies for unsupported formats
-   Consider performance optimizations for common formats

### LTI Considerations

-   Support deep linking for resource selection
-   Plan for multiple LMS platforms if needed
-   Consider integration testing with Canvas test environment

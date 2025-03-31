/**
 * Standard error type for all modules
 */
export class ToolkitError extends Error {
	code: number;
	timestamp: string;
	details?: any;

	constructor(message: string, code: number = 500, details?: any) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.timestamp = new Date().toISOString();
		this.details = details;
	}
}

/**
 * Configuration error
 */
export class ConfigurationError extends ToolkitError {
	constructor(message: string, details?: any) {
		super(message, 400, details);
	}
}

/**
 * Authentication error
 */
export class AuthenticationError extends ToolkitError {
	constructor(message: string, details?: any) {
		super(message, 401, details);
	}
}

/**
 * Network error
 */
export class NetworkError extends ToolkitError {
	constructor(message: string, details?: any) {
		super(message, 503, details);
	}
}

/**
 * API error
 */
export class APIError extends ToolkitError {
	constructor(message: string, code: number = 500, details?: any) {
		super(message, code, details);
	}
}
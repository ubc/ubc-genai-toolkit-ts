/**
 * Standard logger interface used across all modules
 */
export interface LoggerInterface {
	debug(message: string, metadata?: Record<string, any>): void;
	info(message: string, metadata?: Record<string, any>): void;
	warn(message: string, metadata?: Record<string, any>): void;
	error(message: string, metadata?: Record<string, any>): void;
}

/**
 * Simple console logger implementation
 */
export class ConsoleLogger implements LoggerInterface {
	constructor(private prefix: string = '') {}

	debug(message: string, metadata?: Record<string, any>): void {
		console.debug(`[${this.prefix}] DEBUG: ${message}`, metadata || '');
	}

	info(message: string, metadata?: Record<string, any>): void {
		console.info(`[${this.prefix}] INFO: ${message}`, metadata || '');
	}

	warn(message: string, metadata?: Record<string, any>): void {
		console.warn(`[${this.prefix}] WARN: ${message}`, metadata || '');
	}

	error(message: string, metadata?: Record<string, any>): void {
		console.error(`[${this.prefix}] ERROR: ${message}`, metadata || '');
	}
}

/**
 * No-operation logger for when logging is disabled
 */
export class NoopLogger implements LoggerInterface {
	debug(): void {}
	info(): void {}
	warn(): void {}
	error(): void {}
}
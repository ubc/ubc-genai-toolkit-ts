import { LoggerInterface, NoopLogger } from './logger';

/**
 * Base configuration interface for all modules
 */
export interface ModuleConfig {
	/**
	 * Logger instance for the module
	 * Defaults to NoopLogger if not provided
	 */
	logger?: LoggerInterface;

	/**
	 * Enable debug mode
	 * Defaults to false
	 */
	debug?: boolean;
}

/**
 * Get default configuration values
 */
export function getDefaultConfig(): ModuleConfig {
	return {
		logger: new NoopLogger(),
		debug: false,
	};
}

/**
 * Merge provided config with defaults
 */
export function mergeWithDefaults<T extends ModuleConfig>(
	config?: Partial<T>,
	defaults?: Partial<T>
): T {
	const baseDefaults = getDefaultConfig();
	const mergedDefaults = { ...baseDefaults, ...defaults };
	return { ...mergedDefaults, ...config } as T;
}
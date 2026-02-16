import type { Logger } from '@outburn/types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelRank: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

export function parseLogLevel(value: unknown): LogLevel | undefined {
	if (typeof value !== 'string') return undefined;

	switch (value.trim().toLowerCase()) {
		case 'debug':
			return 'debug';
		case 'info':
			return 'info';
		case 'warn':
			return 'warn';
		case 'warning':
			return 'warn';
		case 'error':
			return 'error';
		case 'err':
			return 'error';
		default:
			return undefined;
	}
}

export function createNullLogger(): Logger {
	return {
		info: () => {
			// noop
		},
		warn: () => {
			// noop
		},
		error: () => {
			// noop
		},
	};
}

export function createConsoleLogger(): Logger {
	const useColors = !!process.stdout.isTTY && process.env.NO_COLOR !== '1';

	const stringifyArg = (value: unknown): string => {
		if (typeof value === 'string') return value;
		if (value instanceof Error) return value.stack ?? value.message;
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
		if (typeof value === 'symbol') return value.toString();
		if (typeof value === 'function') return '[Function]';
		if (typeof value === 'object') {
			try {
				return JSON.stringify(value);
			} catch {
				return '[Object]';
			}
		}
		return String(value);
	};

	const formatArgs = (args: unknown[]): string => args.map(stringifyArg).join(' ');

	const color = (ansi: string, text: string): string => useColors ? `${ansi}${text}\x1b[0m` : text;
	const dim = (text: string): string => color('\x1b[90m', text);

	const levelTag = (level: LogLevel): string => {
		const tag = level.toUpperCase().padEnd(5, ' ');
		switch (level) {
			case 'debug':
				return color('\x1b[90m', `[${tag}]`);
			case 'info':
				return color('\x1b[36m', `[${tag}]`);
			case 'warn':
				return color('\x1b[33m', `[${tag}]`);
			case 'error':
				return color('\x1b[31m', `[${tag}]`);
		}
	};

	const formatLine = (level: LogLevel, args: unknown[]): string => {
		const ts = new Date().toISOString();
		const msg = formatArgs(args);
		return `${dim(ts)} ${levelTag(level)} ${msg}`;
	};

	const writeStdout = (line: string) => {
		process.stdout.write(line + '\n');
	};

	const writeStderr = (line: string) => {
		process.stderr.write(line + '\n');
	};

	return {
		debug: (...args: unknown[]) => writeStdout(formatLine('debug', args)),
		info: (...args: unknown[]) => writeStdout(formatLine('info', args)),
		warn: (...args: unknown[]) => writeStderr(formatLine('warn', args)),
		error: (...args: unknown[]) => writeStderr(formatLine('error', args)),
	};
}

export function withPrefix(logger: Logger, prefix: string): Logger {
	const prefixToken = prefix.length === 0 ? '' : prefix;

	const prefixedLogger: Logger = {
		info: (...args: unknown[]) => logger.info(prefixToken, ...args),
		warn: (...args: unknown[]) => logger.warn(prefixToken, ...args),
		error: (...args: unknown[]) => logger.error(prefixToken, ...args),
	};

	if (logger.debug) {
		prefixedLogger.debug = (...args: unknown[]) => logger.debug?.(prefixToken, ...args);
	}

	return prefixedLogger;
}

export function withLevelFilter(logger: Logger, minLevel: LogLevel): Logger {
	const minRank = levelRank[minLevel];

	const isEnabled = (level: LogLevel): boolean => levelRank[level] >= minRank;

	const filteredLogger: Logger = {
		info: (...args: unknown[]) => {
			if (!isEnabled('info')) return;
			logger.info(...args);
		},
		warn: (...args: unknown[]) => {
			if (!isEnabled('warn')) return;
			logger.warn(...args);
		},
		error: (...args: unknown[]) => {
			if (!isEnabled('error')) return;
			logger.error(...args);
		},
	};

	if (logger.debug && isEnabled('debug')) {
		filteredLogger.debug = (...args: unknown[]) => {
			logger.debug?.(...args);
		};
	}

	return filteredLogger;
}

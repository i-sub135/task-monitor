import { createLogger, format, transports } from 'winston';

const isProd = process.env.NODE_ENV === 'production';

const pretty = format.printf(({ level, message, timestamp, ...meta }) => {
	const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
	return `${timestamp} ${level} ${message}${rest}`;
});

export const logger = createLogger({
	level: isProd ? 'info' : 'debug',
	format: isProd
		? format.combine(format.timestamp(), format.json())
		: format.combine(format.timestamp({ format: 'HH:mm:ss' }), format.colorize(), pretty),
	transports: [new transports.Console()]
});

/** Event key + metadata, e.g. logEvent('http.request', { method: 'GET', path: '/' }). */
export function logEvent(event: string, meta: Record<string, unknown> = {}): void {
	logger.info(event, meta);
}

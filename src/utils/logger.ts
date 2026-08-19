type Level = 'debug' | 'info' | 'warn' | 'error';

function ts(): string {
  return new Date().toISOString();
}

function write(level: Level, msg: string, extra?: unknown): void {
  const line = `[${ts()}] [${level.toUpperCase()}] ${msg}`;
  if (level === 'error') {
    console.error(extra === undefined ? line : line, extra);
  } else if (level === 'warn') {
    console.warn(extra === undefined ? line : line, extra);
  } else {
    console.log(extra === undefined ? line : line, extra);
  }
}

export const logger = {
  debug: (msg: string, extra?: unknown) => write('debug', msg, extra),
  info: (msg: string, extra?: unknown) => write('info', msg, extra),
  warn: (msg: string, extra?: unknown) => write('warn', msg, extra),
  error: (msg: string, extra?: unknown) => write('error', msg, extra),
};

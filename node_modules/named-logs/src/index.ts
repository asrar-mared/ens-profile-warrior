export type Logger = {
  readonly assert: (condition?: boolean, ...data: any[]) => void;
  readonly error: (...data: any[]) => void;
  readonly warn: (...data: any[]) => void;
  readonly info: (...data: any[]) => void;
  readonly log: (...data: any[]) => void;
  readonly debug: (...data: any[]) => void;
  readonly dir: (item?: any, options?: any) => void;
  readonly table: (tabularData?: any, properties?: string[]) => void;
  readonly trace: (...data: any[]) => void;
  readonly write: (msg: string) => void;
  readonly time: (label: string) => void;
  readonly timeEnd: (label: string) => void;
  readonly timeLog: (label?: string) => void;
};

export type TypedLogger<LoggerType extends Logger> = LoggerType;

type LoggerFactory = <LoggerType extends Logger = Logger>(namespace: string) => TypedLogger<LoggerType>;

const noop = () => undefined;
const noopLogger = {
  assert: noop,
  error: noop,
  warn: noop,
  info: noop,
  log: noop,
  debug: noop,
  dir: noop,
  table: noop,
  trace: noop,
  write: noop,
  time: noop,
  timeEnd: noop,
  timeLog: noop,
};

let _factory: LoggerFactory | undefined;
export function hook(factory: LoggerFactory) {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any)._logFactory = factory;
  }
  _factory = factory;
}

const fallbackFactory: LoggerFactory = <Logger>(namespace: string) => {
  let trueLogger: Logger | undefined;
  const logger = new Proxy(
    {},
    {
      get(target: {}, prop: string, receiver: {}) {
        if (trueLogger) {
          return (trueLogger as any)[prop];
        }
        const factory = _getFactory();
        if (factory) {
          trueLogger = <Logger>factory(namespace);
          return (trueLogger as any)[prop];
        }
        return noop;
      },
    }
  ) as Logger;
  return logger;
};

function _getFactory(): LoggerFactory | undefined {
  return _factory || (globalThis as any)?._logFactory;
}

export function logs(namespace: string, options?: {fallbackOnProxy?: boolean | string}): Logger {
  const factory = _getFactory();
  return factory
    ? factory(namespace)
    : options?.fallbackOnProxy
      ? typeof options.fallbackOnProxy == 'boolean'
        ? options.fallbackOnProxy
          ? fallbackFactory(namespace)
          : noopLogger
        : typeof options.fallbackOnProxy == 'string'
          ? typeof process !== 'undefined' && process?.env[options.fallbackOnProxy]
            ? fallbackFactory(namespace)
            : noopLogger
          : noopLogger
      : noopLogger;
}

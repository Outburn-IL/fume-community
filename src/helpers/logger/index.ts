export interface Logger {
    info: Function
    warn: Function
    error: Function
};

let logger: Logger = {
  info: (msg: any) => console.log(msg),
  warn: (msg: any) => console.warn(msg),
  error: (msg: any) => console.error(msg)
};

export const setLogger = (loggerObj: Logger): void => {
  logger = loggerObj;
};

export const getLogger = (): Logger => {
  return logger;
};

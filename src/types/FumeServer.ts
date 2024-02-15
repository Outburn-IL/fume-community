import { RequestHandler } from 'express';
import { ILogger } from './Logger';
import { IConfig } from './Config';
import { ICache } from './Cache';

export interface IFumeServer {
  registerLogger: (logger: ILogger) => void
  registerCache: (cache: ICache) => void
  registerRoute: (route: string, handler: RequestHandler) => void
  warmUp: (serverOptions: IConfig | undefined) => Promise<void>
  shutDown: () => Promise<void>
}

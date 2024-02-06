import { RequestHandler } from "express";
import { ILogger } from "./Logger";

export interface IFumeServer {
    registerLogger: (logger: ILogger) => void;
    registerCache: (cache: any) => void;
    registerRoute: (route: string, handler: RequestHandler) => void;
    warmUp: () => Promise<void>;
    shutDown: () => Promise<void>;
}
import { I as IPCServer } from '../ipc-DR6z8AlD.mjs';

declare class Server extends IPCServer {
    private static readonly Clients;
    private static getOnDidClientConnect;
    constructor();
}

declare function createServer(): Server;
declare function createPreload(): void;

export { createPreload, createServer };

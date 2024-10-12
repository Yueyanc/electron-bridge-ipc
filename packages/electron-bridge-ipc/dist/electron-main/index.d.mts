import { I as IPCServer } from '../ipc-gMpv30K_.mjs';

declare class Server extends IPCServer {
    private static readonly Clients;
    private static getOnDidClientConnect;
    constructor();
}

declare function createServer(): Server;

export { createServer };

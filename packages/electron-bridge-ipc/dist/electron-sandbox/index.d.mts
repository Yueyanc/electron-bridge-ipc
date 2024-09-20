import { a as IPCClient, b as IDisposable } from '../ipc-DR6z8AlD.mjs';

declare class Client extends IPCClient implements IDisposable {
    private protocol;
    private static createProtocol;
    constructor(id: string);
    dispose(): void;
}

declare function createClient(): Promise<Client>;
declare function useService<T extends object>(channelName: string): T;

export { createClient, useService };

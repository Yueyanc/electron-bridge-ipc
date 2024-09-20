interface IDisposable {
    dispose: () => void;
}
declare class DisposableStore implements IDisposable {
    private _isDisposed;
    private readonly _toDispose;
    dispose(): void;
    clear(): void;
    add<T extends IDisposable>(o: T): T;
}
declare class Disposable implements IDisposable {
    protected readonly _store: DisposableStore;
    static readonly None: Readonly<IDisposable>;
    dispose(): void;
    protected _register<T extends IDisposable>(o: T): T;
}
declare function dispose<T extends IDisposable>(arg: T | Iterable<T> | undefined): any;
declare function combinedDisposable(...disposables: IDisposable[]): IDisposable;
declare function toDisposable(fn: () => void): IDisposable;

interface CancellationToken {
    readonly isCancellationRequested: boolean;
    readonly onCancellationRequested: (listener: (e: any) => any, thisArgs?: any, disposables?: IDisposable[]) => IDisposable;
}
declare namespace CancellationToken {
    function isCancellationToken(thing: unknown): thing is CancellationToken;
    const None: Readonly<CancellationToken>;
    const Cancelled: Readonly<CancellationToken>;
}

interface NodeEventEmitter {
    on: (event: string, listener: any) => unknown;
    removeListener: (event: string, listener: any) => unknown;
}
interface Event<T> {
    (listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[] | DisposableStore): IDisposable;
}
declare namespace Event {
    function buffer<T>(event: Event<T>, flushAfterTimeout?: boolean, _buffer?: T[], disposable?: DisposableStore): Event<T>;
    const None: Event<any>;
    function signal<T>(event: Event<T>): Event<void>;
    function filter<T>(event: Event<T>, filter: (e: T) => boolean, disposable?: DisposableStore): Event<T>;
    function any<T>(...events: Event<T>[]): Event<T>;
    function map<I, O>(event: Event<I>, map: (i: I) => O, disposable?: DisposableStore): Event<O>;
    function once<T>(event: Event<T>): Event<T>;
    function toPromise<T>(event: Event<T>): Promise<T>;
    function fromNodeEventEmitter<T>(emitter: NodeEventEmitter, eventName: string, map?: (...args: any[]) => T): Event<T>;
}

declare class ELBuffer {
    readonly buffer: Uint8Array;
    readonly byteLength: number;
    private constructor();
    static wrap(actual: Uint8Array): ELBuffer;
    writeUInt8(value: number, offset: number): void;
    readUInt8(offset: number): number;
    static alloc(byteLength: number): ELBuffer;
    static concat(buffers: ELBuffer[], totalLength?: number): ELBuffer;
    set(array: ELBuffer | Uint8Array | ArrayBuffer | ArrayBufferView, offset?: number): void;
    slice(start?: number, end?: number): ELBuffer;
    static fromString(source: string, options?: {
        dontUseNodeBuffer?: boolean;
    }): ELBuffer;
    toString(): string;
}

interface IMessagePassingProtocol {
    send: (buffer: ELBuffer) => void;
    onMessage: Event<ELBuffer>;
}

interface IChannel {
    call: <T>(command: string, arg?: any, cancellationToken?: CancellationToken) => Promise<T>;
    listen: <T>(event: string, arg?: any) => Event<T>;
}
interface IServerChannel<TContext = string> {
    call: <T>(ctx: TContext, command: string, arg?: any, cancellationToken?: CancellationToken) => Promise<T>;
    listen: <T>(ctx: TContext, event: string, arg?: any) => Event<T>;
}
declare class ChannelClient implements IDisposable {
    private protocol;
    private protocolListener;
    private state;
    private activeRequests;
    private lastRequestId;
    private handlers;
    private readonly _onDidInitialize;
    private isDisposed;
    readonly onDidInitialize: Event<void>;
    constructor(protocol: IMessagePassingProtocol);
    getChannel<T extends IChannel>(channelName: string): T;
    private requestEvent;
    get onDidInitializePromise(): Promise<void>;
    private whenInitialized;
    private requestPromise;
    private sendRequest;
    private send;
    private sendBuffer;
    onBuffer(msg: ELBuffer): void;
    onResponse(response: IRawResponse): void;
    dispose(): void;
}
declare enum ResponseType {
    Initialize = 200,
    PromiseSuccess = 201,
    PromiseError = 202,
    PromiseErrorObj = 203,
    EventFire = 204
}
interface IRawInitializeResponse {
    type: ResponseType.Initialize;
}
interface IRawPromiseSuccessResponse {
    type: ResponseType.PromiseSuccess;
    id: number;
    data: any;
}
interface IRawPromiseErrorResponse {
    type: ResponseType.PromiseError;
    id: number;
    data: {
        message: string;
        name: string;
        stack: string[] | undefined;
    };
}
interface IRawPromiseErrorObjResponse {
    type: ResponseType.PromiseErrorObj;
    id: number;
    data: any;
}
interface IRawEventFireResponse {
    type: ResponseType.EventFire;
    id: number;
    data: any;
}
type IRawResponse = IRawInitializeResponse | IRawPromiseSuccessResponse | IRawPromiseErrorResponse | IRawPromiseErrorObjResponse | IRawEventFireResponse;
interface IChannelServer<TContext = string> {
    registerChannel: (channelName: string, channel: IServerChannel<TContext>) => void;
}
declare class ChannelServer<TContext = string> implements IChannelServer<TContext>, IDisposable {
    private protocol;
    private ctx;
    channels: Map<string, IServerChannel<TContext>>;
    private protocolListener;
    private activeRequests;
    constructor(protocol: IMessagePassingProtocol, ctx: any);
    onRawMessage(msg: ELBuffer): void;
    private onPromise;
    private sendResponse;
    private send;
    private sendBuffer;
    registerChannel(channelName: string, channel: IServerChannel<TContext>): void;
    dispose(): void;
}
declare class Connection<TContext = string> {
    channelServer: ChannelServer<TContext>;
    channelClient: ChannelClient;
    readonly ctx: TContext;
}
declare class IPCClient<TContext = string> implements IDisposable {
    private channelClient;
    private channelServer;
    constructor(protocol: IMessagePassingProtocol, ctx: TContext);
    getChannels(): void;
    getChannel<T extends IChannel>(channelName: string): T;
    registerChannel(channelName: string, channel: IServerChannel<string>): void;
    dispose(): void;
}
interface ClientConnectionEvent {
    protocol: IMessagePassingProtocol;
    onDidClientDisconnect: Event<void>;
}
interface Client<TContext> {
    readonly ctx: TContext;
}
interface IConnectionHub<TContext> {
    readonly connections: Connection<TContext>[];
    readonly onDidAddConnection: Event<Connection<TContext>>;
    readonly onDidRemoveConnection: Event<Connection<TContext>>;
}
interface IClientRouter<TContext = string> {
    routeCall: (hub: IConnectionHub<TContext>, command: string, arg?: any, cancellationToken?: CancellationToken) => Promise<Client<TContext>>;
    routeEvent: (hub: IConnectionHub<TContext>, event: string, arg?: any) => Promise<Client<TContext>>;
}
declare class IPCServer<TContext extends string = string> {
    private channels;
    private _connections;
    private readonly _onDidAddConnection;
    readonly onDidAddConnection: Event<Connection<TContext>>;
    private readonly _onDidRemoveConnection;
    readonly onDidRemoveConnection: Event<Connection<TContext>>;
    private readonly disposables;
    get connections(): Connection<TContext>[];
    constructor(onDidClientConnect: Event<ClientConnectionEvent>);
    getChannel<T extends IChannel>(channelName: string, routerOrClientFilter: IClientRouter<TContext> | ((client: Client<TContext>) => boolean)): T;
    private getMulticastEvent;
    registerChannel(channelName: string, channel: IServerChannel<TContext>): void;
    dispose(): void;
}

export { DisposableStore as D, ELBuffer as E, IPCServer as I, IPCClient as a, type IDisposable as b, type IServerChannel as c, type IChannel as d, Disposable as e, dispose as f, combinedDisposable as g, toDisposable as t };

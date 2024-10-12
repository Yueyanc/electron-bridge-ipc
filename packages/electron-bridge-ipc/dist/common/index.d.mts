import { D as DisposableStore, c as IServerChannel, d as IChannel, E as ELBuffer } from '../ipc-gMpv30K_.mjs';
export { e as Disposable, l as Emitter, k as EmitterOptions, i as Event, j as EventDeliveryQueue, m as EventMultiplexer, b as IDisposable, N as NodeEventEmitter, R as Relay, g as combinedDisposable, h as createSingleCallFunction, f as dispose, t as toDisposable } from '../ipc-gMpv30K_.mjs';

interface UriComponents {
    scheme: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
}
type Deserialize<T> = T extends UriComponents ? any : T extends ELBuffer ? ELBuffer : T extends object ? Revived<T> : T;
type Revived<T> = {
    [K in keyof T]: Deserialize<T[K]>;
};
declare function revive<T = any>(obj: any, depth?: number): Revived<T>;
interface ICreateProxyServiceOptions {
    properties?: Map<string, unknown>;
}
declare namespace ProxyChannel {
    interface IProxyOptions {
        disableMarshalling?: boolean;
    }
    interface ICreateServiceChannelOptions extends IProxyOptions {
    }
    function fromService<TContext>(service: unknown, disposables: DisposableStore, options?: ICreateServiceChannelOptions): IServerChannel<TContext>;
    function toService<T extends object>(channel: IChannel, options?: ICreateProxyServiceOptions): T;
}

export { DisposableStore, type ICreateProxyServiceOptions, ProxyChannel, type Revived, revive };

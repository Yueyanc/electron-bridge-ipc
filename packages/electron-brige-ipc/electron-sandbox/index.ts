import { ProxyChannel } from '../common/proxyChannel'
import { ipcRenderer } from './globals'
import { Client } from './ipc'

let client: Client
export async function createClient() {
  const context = await ipcRenderer.invoke('_ipc:get-context')
  return client = new Client(context.windowId)
}

export function useService<T extends object>(channelName: string) {
  return ProxyChannel.toService<T>(client.getChannel(channelName))
}

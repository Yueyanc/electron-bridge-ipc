import type { Event } from 'electron-bridge-ipc/common'

export interface IFileSystemService {
  stat: (source: string) => Promise<any>
  onPing: Event<string>
}

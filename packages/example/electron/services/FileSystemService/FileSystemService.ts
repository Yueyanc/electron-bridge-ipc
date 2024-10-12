import fs from 'node:fs/promises'
import { Emitter } from 'electron-bridge-ipc'
import type { IFileSystemService } from './IFileSystemService'

export class FileSystemService implements IFileSystemService {
  _onPing = new Emitter<string>()
  onPing = this._onPing.event
  stat(source: string) {
    this._onPing.fire('aaaaa')
    return fs.stat(source)
  }
}

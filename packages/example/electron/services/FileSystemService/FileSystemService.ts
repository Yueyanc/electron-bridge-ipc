import fs from 'node:fs/promises'
import type { IFileSystemService } from './IFileSystemService'

export class FileSystemService implements IFileSystemService {
  stat(source: string) {
    return fs.stat(source)
  }
}

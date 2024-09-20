# electron-bridge-ipc
### 简介
electron-bridge-ipc 是一个基于electron的跨进程通信解决方案，基于electron的ipc实现，使用起来非常简单，大量代码提取于vscode源码
### 用法
安装
```bash
yarn add electron-bridge-ipc
npm i electron-bridge-ipc
pnpm add -D electron-bridge-ipc
```
主进程
```javascript
// main.ts
import { createServer } from 'electron-bridge-ipc/electron-main'
import { DisposableStore, ProxyChannel } from 'electron-bridge-ipc'
app.whenReady().then(() => {
  const server = createServer()
  const disposables = new DisposableStore()
  server.registerChannel('fileSystem', ProxyChannel.fromService(new FileSystemService(), disposables))
})
```

preload.ts

```javascript
import { createPreload } from 'electron-bridge-ipc/electron-main'

createPreload()
```
渲染进程
```javascript
// main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from 'electron-bridge-ipc/electron-sandbox'
import App from './App.tsx'
import './index.css'

await createClient()
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// App.tsx
import { useService } from 'electron-bridge-ipc/electron-sandbox'
import type { IFileSystemService } from '../electron/services/FileSystemService/IFileSystemService'
const fileSystemService = useService < IFileSystemService > ('fileSystem')
useEffect(() => {
  fileSystemService?.stat('C:\\Users').then((res) => {
    console.log(res)
  })
}, [fileSystemService])
```
服务实现
```javascript
// FileSystemService.ts
import fs from 'node:fs/promises'
import type { IFileSystemService } from './IFileSystemService'

export class FileSystemService implements IFileSystemService {
  stat(source: string) {
    return fs.stat(source)
  }
}

// IFileSystemService.ts
export interface IFileSystemService {
  stat: (source: string) => Promise<any>
}

```

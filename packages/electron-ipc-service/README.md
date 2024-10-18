```javascript
// main
const server = createServer()
server.register("fileSystem",new FileSystemService())
// preload
initPreload()
// renderer
const client = createClient()
const FileSystemService = getService<IFileSystemService>('fileSystem')
```


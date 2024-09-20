export interface IFileSystemService {
  stat: (source: string) => Promise<any>
}

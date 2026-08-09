export interface SymlinkPlatform {
  createSymlink(target: string, linkPath: string): void;
  removeSymlink(linkPath: string): boolean;
  isSymlink(filePath: string): boolean;
  readSymlink(linkPath: string): string | null;
  platform: string;
}

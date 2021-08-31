import { basename, extname } from "path";

export function getFileName(filePath: string): string {
  const fileName = basename(filePath);
  const ext = extname(fileName);
  return fileName.slice(0, -ext.length);
}

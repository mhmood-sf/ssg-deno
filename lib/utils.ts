export * as path from "https://deno.land/std@0.144.0/path/mod.ts";
export * as fs from "https://deno.land/std@0.144.0/fs/mod.ts";

export function recReadDirSync(path: string): string[] {
  let files: string[] = [];
  for (const entry of Deno.readDirSync(path)) {
    if (entry.isDirectory) {
      files = files.concat(recReadDirSync(path + "/" + entry.name));
    }

    if (entry.isFile) {
      files.push(path + "/" + entry.name);
    }
  }

  return files;
}

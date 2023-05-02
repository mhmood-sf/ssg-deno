export * as path from "path";
export * as fs from "fs";
export * as dom from "linkedom";

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

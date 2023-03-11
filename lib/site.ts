import { Plugin, SiteData, SiteDataOptions } from "./types.ts";
import * as utils from "./utils.ts";

// Create a new SiteData object.
export function create(opts?: SiteDataOptions): SiteData {
    return {
        url: opts ? opts.url : "localhost",

        path: opts ? opts.path : Deno.cwd(),

        assets: [],

        content: new Map(),

        templates: new Map(),

        pages: new Map(),

        output: new Map(),

        // We include a default parser for HTML files.
        parser: new Map([
            [
                ".html",
                (file) => ({
                    content: file[0],
                    data: new Map(Object.entries(file[1])),
                }),
            ],
        ]),

        data: new Map(),

        async load(): Promise<void> {
            const cwd = this.path;

            // Load content files.
            const contentPaths = utils.recReadDirSync(cwd + "/content");

            for (const path of contentPaths) {
                // Get ext name and slice off the '.'
                const ext = utils.path.extname(path);

                // If we have a parser for that extension then we store
                // the file into the content map.
                if (this.parser.has(ext)) {
                    const info = Deno.statSync(path);
                    const contents = Deno.readTextFileSync(path);

                    const key = path.slice((cwd + "/content").length);
                    this.content.set(key, [contents, info]);
                }
            }

            // Load template files.
            const templatePaths = utils.recReadDirSync(cwd + "/templates");

            for (const path of templatePaths) {
                const ext = utils.path.extname(path);
                if (ext === ".ts") {
                    const template = (await import(path)).default;
                    const key = path.slice((cwd + "/templates").length);
                    this.templates.set(key, template);
                }
            }
        },

        parse(): void {
            for (const [path, file] of this.content.entries()) {
                const ext = utils.path.extname(path);
                const parse = this.parser.get(ext);

                if (parse !== undefined) {
                    const page = parse(file);
                    this.pages.set(path, page);
                }
            }
        },

        build(): void {
            // put pagedata into templates and set stuff into output.
            for (const [path, page] of this.pages.entries()) {
                const ext = utils.path.extname(path);
                // Replace page extension with .ts extension.
                const templatePath = path.slice(0, path.length - ext.length);
                const pageTemplate = this.templates.get(templatePath + ".ts");

                if (pageTemplate !== undefined) {
                    const outputPath = templatePath + ".html";
                    const outputHtml = pageTemplate(this, page);
                    this.output.set(outputPath, outputHtml);
                    continue;
                }

                const defaultPath = utils.path.join(
                    utils.path.dirname(path),
                    "_default.ts",
                );
                const defaultTemplate = this.templates.get(defaultPath);

                if (defaultTemplate !== undefined) {
                    const outputPath = templatePath + ".html";
                    const outputHtml = defaultTemplate(this, page);
                    this.output.set(outputPath, outputHtml);
                    continue;
                }

                throw new Error("No template found for: " + path);
            }
        },

        apply(plugin: Plugin): SiteData {
            plugin(this);
            return this;
        },

        qualifiedUrlFor(resource: string): string {
            return resource;
        },
    };
}

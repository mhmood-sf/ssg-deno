import { Plugin, SiteData, SiteDataOptions } from "./types.ts";
import * as utils from "./utils.ts";

export function init(opts?: SiteDataOptions): SiteData {
    return {
        url: opts ? opts.url : "localhost",
        path: opts ? opts.path : Deno.cwd(),
        assets: [],
        data: new Map(),
        content: new Map(),
        pages: new Map(),
        templates: new Map(),
        output: new Map(),

        // We include a default parser for HTML files, which just returns
        // the file contents without doing anything.
        parser: new Map([[
            ".html",
            (file) => ({
                content: file[0],
                data: new Map(Object.entries(file[1])),
            }),
        ]]),

        async load(): Promise<void> {
            const cwd = this.path;

            // Load content files.
            const contentPaths = utils.recReadDirSync(cwd + "/content");

            // Store every content file into the content map IF
            // there exists a parser for that content file. For example,
            // if there is a parser for .html but not .md, then .html
            // files will be added to the map, and .md files will be
            // ignored.
            for (const path of contentPaths) {
                const ext = utils.path.extname(path);

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
            // Put pagedata into templates and set stuff into output.
            for (const [path, page] of this.pages.entries()) {
                // Replace page extension with .ts extension.
                const ext = utils.path.extname(path);
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

        async make(): Promise<void> {
            const plugins = this.data.get("plugins");

            if (plugins.preload) {
                for (const p of plugins.preload) this.apply(p);
            }

            await this.load();

            if (plugins.preparse) {
                for (const p of plugins.preparse) this.apply(p);
            }

            this.parse();

            if (plugins.prebuild) {
                for (const p of plugins.prebuild) this.apply(p);
            }

            this.build();

            if (plugins.postbuild) {
                for (const p of plugins.postbuild) this.apply(p);
            }
        },

        config(opts: { [key: string]: any }): void {
            for (const [key, val] of Object.entries(opts)) {
                this.data.set(key, val);
            }
        },

        // TODO: Full implementation.
        _qualifiedUrlFor(resource: string): string {
            return resource;
        },
    };
}

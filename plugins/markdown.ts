import { renderMarkdown } from "https://deno.land/x/markdown_renderer/mod.ts";
import { SiteData } from "../mod.ts";

export default (site: SiteData) => {
    site.parser.set(".md", (file) => ({
        content: renderMarkdown(file[0]),
        data: new Map(Object.entries(file[1])),
    }));
};

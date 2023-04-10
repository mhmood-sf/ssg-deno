import { renderMarkdown } from "https://deno.land/x/markdown_renderer/mod.ts";
import { extract, test } from "https://deno.land/std/front_matter/any.ts";
import { SiteData } from "../mod.ts";

export default (site: SiteData) => {
    site.parser.set(".md", (file) => {
        const pageData = {
            content: "",
            data: new Map(Object.entries(file[1]))
        }

        if (test(file[0])) {
            const extracted = extract(file[0]);
            const frontMatter = extracted.attrs;

            for (const [key, val] of Object.entries(frontMatter)) {
                pageData.data.set(key, val);
            }

            pageData.content = renderMarkdown(
                extracted.body,
                site.data.get("markdown-options")
            );
        } else {
            pageData.content = renderMarkdown(
                file[0],
                site.data.get("markdown-options")
            );
        }

        return pageData;
    });
};

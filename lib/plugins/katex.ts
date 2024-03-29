import { SiteData, utils } from "../../mod.ts";
import katex from "https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.mjs";

const dom = utils.dom
const toDOM = str => new dom.DOMParser().parseFromString(str, "text/html");

export default (site: SiteData) => {
    site.output.forEach((val, key) => {
        const doc = toDOM(val);

        doc.getElementsByTagName(site.data.get("katexInline"))
            .forEach((e) => {
                const k = katex.renderToString(
                    e.innerHTML,
                    site.data.get("katexOpts")
                );

                const span = doc.createElement("span");
                span.innerHTML = k;
                e.replaceWith(span);
            });

        doc.getElementsByTagName(site.data.get("katexDisplay"))
            .forEach((e) => {
                const k = katex.renderToString(
                    e.innerHTML,
                    {
                        ...site.data.get("katexOpts"),
                        displayMode: true,
                    }
                );

                const span = doc.createElement("span");
                span.innerHTML = k;
                e.replaceWith(span);
            });

        site.output.set(key, doc.toString());
    });
};

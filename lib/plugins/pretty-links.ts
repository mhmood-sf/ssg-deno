import { SiteData } from "../../mod.ts";

export default (site: SiteData) => {
    site.output.forEach((val, key) => {
        if (!key.endsWith("/index.html")) {
            const newKey = key.slice(0, key.length - 5) + "/index.html";

            site.output.delete(key);
            site.output.set(newKey, val);
        }
    });
};

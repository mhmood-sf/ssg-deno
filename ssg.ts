import { serve } from "http";
import { contentType } from "media_types";

import { parse } from "flags";
import { SiteData, utils } from "./mod.ts";

const defaultConfig = `import * as ssg from "../mod.ts";

const site = ssg.init();

site.config({
    title: "My Site"
})

await site.make();
export default site;
`;

const defaultNotFound = `<!DOCTYPE html>
<html>
    <head>
        <title>404</title>
        <style>
            body {
                margin: 10% 0;
                padding: 0;
                background-color: #fafafa;
                font-family: sans-serif;
                text-align: center;
                width: 100%;
            }

            p {
                font-size: 1.1em;
            }

            a {
                text-decoration: none;
                color: deepskyblue;
                font-size: 1.1em;
            }

            a:hover {
                color: dodgerblue;
            }
        </style>
    </head>
    <body>
        <h1>404: Not Found</h1>
        <p>The resource you requested was not found.</p>
        <a href="/">Return home</a>
    </body>
</html>
`;

const { log, error } = console;

const args = parse(Deno.args);
const cmds = args._;

const cmd = cmds[0];

switch (cmd) {
    case "help":
        showHelp();
        break;
    case "init":
        initSite();
        break;
    case "build":
        buildSite();
        break;
    case "serve":
        serveSite();
        break;

    default: {
        if (args.v || args.version) {
            log("ssg v0.1.0");
        } else {
            showHelp();
        }
    }
}

function showHelp() {
    log(
        "%c ssg %c - A static site generator",
        "color: mediumslateblue; font-weight: bold",
        "color: default",
    );
    log("");
    log("%cUSAGE:", "font-weight: bold");
    log("    ssg <SUBCOMMAND> [FLAGS]");
    log("");
    log("%cFLAGS:", "font-weight: bold");
    log("    -h, --help         Show this help message.");
    log("    -v, --version      Show ssg version information.");
    log("");
    log("%cSUBCOMMANDS:", "font-weight: bold");
    log("    help               Show help message for the given subcommand.");
    log("    init [name]        Create a new ssg site.");
    log(
        "    build              Deletes output directory (if there is one) and builds the site.",
    );
    log(
        "      -d, --dry-run      Build the site but do not write anything to the filesystem.",
    );
    log("    serve              Serve the site on a local server.");
    log("      -p, --port         Specify port for the local server.");
}

async function buildSite() {
    const cwd = Deno.cwd();

    try {
        const site: SiteData = (await import(cwd + "/config.ts")).default;

        if (args.d || args.dryRun) {
            log(
                "%cDRY RUN:%c No files written to the file system.",
                "color: red",
                "color: default",
            );
        } else {
            const outdir = cwd + "/output";

            // Clean output directory (+ ensure it exists)
            utils.fs.emptyDirSync(outdir);

            for (const [name, content] of site.output.entries()) {
                // Make sure the file exists!
                utils.fs.ensureFileSync(outdir + name);

                log(`Writing file: ${outdir + name}`);
                Deno.writeTextFileSync(outdir + name, content);
            }

            // Copy over static files.
            log("Copying static files...");
            utils.fs.copySync(cwd + "/static", cwd + "/output", {
                overwrite: true,
            });
        }

        log("%cFinished!", "color: green");
    } catch (e) {
        error(e);
    }
}

function initSite() {
    const prefix = cmds[1] ? cmds[1] : ".";

    try {
        if (prefix !== ".") {
            Deno.mkdirSync(`./${prefix}`);
            log(`Created root directory: ./${prefix}`);
        } else {
            log(`Initializing site in current working directory.`);
        }

        Deno.mkdirSync(`${prefix}/content`);
        log(`Created directory: ${prefix}/content`);

        Deno.mkdirSync(`${prefix}/templates`);
        log(`Created directory: ${prefix}/templates`);

        Deno.writeTextFileSync(`${prefix}/config.ts`, defaultConfig);
        log(`Created file: ${prefix}/config.ts`);
    } catch (e) {
        error(e);
    }
}

async function serveSite() {
    await buildSite();

    const port = args.p || args.port || 8080;

    // Source: https://medium.com/deno-the-complete-reference/a-beginners-guide-to-building-a-static-file-server-in-deno-a4d12745d233
    const BASE_PATH = "./site/output";

    const reqHandler = async (req: Request) => {
        const urlPath = new URL(req.url).pathname;
        const fileTail = urlPath.endsWith("/")
            ? urlPath + "index.html"
            : urlPath;
        const filePath = BASE_PATH + fileTail;
        const filePathExt = utils.path.extname(filePath);

        try {
            const fileSize = (await Deno.stat(filePath)).size;
            const body = (await Deno.open(filePath)).readable;

            return new Response(body, {
                headers: {
                    "content-length": fileSize.toString(),
                    "content-type": contentType(filePathExt) ||
                        "application/octet-stream",
                },
            });
        } catch (e) {
            // TODO: Return ./output/404.html page if it exists.
            if (e instanceof Deno.errors.NotFound) {
                return new Response(defaultNotFound, {
                    status: 404,
                    headers: {
                        "content-type": contentType(".html") ||
                            "application/octet-stream",
                    },
                });
            }

            return new Response(null, { status: 500 });
        }
    };

    await serve(reqHandler, { port });
}

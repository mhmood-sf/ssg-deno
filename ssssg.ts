import { serve } from "https://deno.land/std@0.178.0/http/mod.ts";
import { lookup } from "https://deno.land/x/media_types/mod.ts";

import { parse } from "https://deno.land/std@0.144.0/flags/mod.ts";
import { SiteData, utils } from "./mod.ts";

const defaultConfig = `import ssssg from "../lib/mod.ts";

export default async () => {
    const site = ssssg.create();

    await site.load();

    site.parse();

    site.build();

    return site;
};`;

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
            log("ssssg v0.1.0");
        } else {
            showHelp();
        }
    }
}

function showHelp() {
    log(
        "%c ssssg %c - A ssstatic site generator",
        "color: mediumslateblue; font-weight: bold",
        "color: default",
    );
    log("");
    log("%cUSAGE:", "font-weight: bold");
    log("    ssssg <SUBCOMMAND> [FLAGS]");
    log("");
    log("%cFLAGS:", "font-weight: bold");
    log("    -h, --help         Show this help message.");
    log("    -v, --version      Show ssssg version information.");
    log("");
    log("%cSUBCOMMANDS:", "font-weight: bold");
    log("    help               Show help message for the given subcommand.");
    log("    init [name]        Create a new ssssg site.");
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
    const BASE_PATH = "./output";

    const reqHandler = async (req: Request) => {
        const filePath = BASE_PATH + new URL(req.url).pathname;
        let fileSize;
        try {
            fileSize = (await Deno.stat(filePath)).size;
        } catch (e) {
            if (e instanceof Deno.errors.NotFound) {
                return new Response(null, { status: 404 });
            }
            return new Response(null, { status: 500 });
        }
        const body = (await Deno.open(filePath)).readable;
        return new Response(body, {
            headers: {
                "content-length": fileSize.toString(),
                "content-type": lookup(filePath) || "application/octet-stream",
            },
        });
    };

    await serve(reqHandler, { port });
}

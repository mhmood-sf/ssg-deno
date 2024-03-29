// Just for documentative purposes.
type HTML = string;
type FileType = string;
type FilePath = string;
type FileContents = string;

// PageData describes a single HTML document at a specific
// URL. Similar to pages in most other SSGs. The content is
// required, other data may be attached as needed.
export type PageData = {
    content: string;
    data: Map<string, any>;
};

// Initial options for the SiteData object.
export type SiteDataOptions = {
    url: string;
    path: string;
};

// Templates have access to the site data and the current page
// being rendered by the template. The output is an HTML string.
export type Template = (site: SiteData, page: PageData) => HTML;

// A filetuple carries the file contents as a string and the
// FileInfo object from Deno.stat.
export type FileTuple = [string, Deno.FileInfo];

// Parsers take in filetuples and produce a PageData object after
// parsing the file contents.
export type Parser = (input: FileTuple) => PageData;

// Plugins just take in the site data object and modify it however
// they need. This gives them a lot of power, of course, so they
// need to be careful what they do with the object.
export type Plugin = (site: SiteData) => void;

export type SiteData = {
    // Base url for the site.
    url: string;

    // Path to the directory containing the site's config.ts
    path: string;

    // List of paths to asset/static files that will later be copied over
    // directly to the output directory, at the root of the website.
    // TODO: Unimplemented!
    assets: string[];

    // Content files, usually just the .md files for the site content, as
    // well as any other files that need to be included in the output. Those
    // with parsers are processed, others are ignored. Files prefixed with
    // an underscore are ignored entirely.
    content: Map<FilePath, FileTuple>;

    // Templates are .ts files that export a function taking in
    // SiteData and PageData and returning an HTML string. For each
    // page in the content directory, there must be a matching
    // template for producing the output. In each (sub)directory,
    // a `_default.ts` template can be provided as a fallback.
    templates: Map<FilePath, Template>;

    // Every content file is parsed into a PageData object and
    // stored in this list.
    pages: Map<FilePath, PageData>;

    // Output HTML files are stored here after processing. These
    // are then written to the filesystem.
    output: Map<FilePath, FileContents>;

    // Parsers are used for processing content files into PageData
    // objects. Also determine which content files are read. Those
    // that don't have a parser are ignored.
    parser: Map<FileType, Parser>;

    // We allow adding any other data needed to the SiteData object.
    data: Map<string, any>;

    // Loads content files/templates into the SiteData object.
    load: () => Promise<void>;

    // Parses content files into PageData objects.
    parse: () => void;

    // Builds the site, populating the output field with HTML data.
    build: () => void;

    // Applies a plugin function to the SiteData.
    apply: (plugin: Plugin) => SiteData;

    // Returns the full absolute URL for a resource.
    // The input string must be an absolute path from the root
    // of the project directory. This function will then
    // prepend the absolute file system path (for the
    // local webserver) or the website address for production
    // builds. This method should be used instead of manually
    // inserting links into templates.
    _qualifiedUrlFor: (resource: string) => string;

    // Data from a JS object is added to the site's data Map,
    // since it's more convenient.
    config: (opts: { [key: string]: any }) => void;

    // Runs each step of the site's build process, while also
    // applying plugins.
    make: () => Promise<void>;
};

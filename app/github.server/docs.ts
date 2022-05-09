import { getRepoContent } from "./repo-content";
import { getRepoTarballStream } from "./repo-tarball";
import { createTarFileProcessor } from "./tar.server";
import { processMarkdown } from "@ryanflorence/md";
import LRUCache from "lru-cache";
import parseYamlHeader from "gray-matter";
// @ts-expect-error
import sortBy from "sort-by";

export interface MenuDoc {
  filename: string;
  slug: string;
  hasContent: boolean;
  attrs: {
    title: string;
    order?: number;
    [key: string]: any;
  };
}

export interface Doc extends Omit<MenuDoc, "hasContent"> {
  html: string;
}

declare global {
  var menuCache: LRUCache<string, MenuDoc[]>;
  var cache: LRUCache<string, Doc>;
}

let menuCache =
  // we need a better hot reload story here
  global.menuCache ||
  (global.menuCache = new LRUCache<string, MenuDoc[]>({
    max: 30, // store up to 30 versions
  }));

export async function getMenu(
  repo: string,
  refId: string,
  lang: string
): Promise<MenuDoc[]> {
  let cacheKey = `${refId}:${lang}`;
  let cached = menuCache.get(cacheKey);
  if (cached) return cached;

  let menu: MenuDoc[] = [];

  let stream = await getRepoTarballStream(repo, refId);
  let processFiles = createTarFileProcessor(stream);
  await processFiles(async ({ filename, content }) => {
    let { attrs, content: md } = parseAttrs(content, filename);
    menu.push({
      attrs,
      filename,
      slug: makeSlug(filename),
      hasContent: md.length > 0,
    });
  });

  menu.sort(sortBy("slug"));
  menuCache.set(cacheKey, menu);

  return menu;
}

function parseAttrs(md: string, filename: string) {
  let { data, content } = parseYamlHeader(md);
  return {
    content,
    attrs: {
      title: filename,
      ...data,
    },
  };
}

/**
 * While we're using HTTP caching, we have this memory cache too so that
 * document requests and data request to the same document can do less work for
 * new versions. This makes our origin server very fast, but adding HTTP caching
 * let's have simpler and faster deployments with just one origin server, but
 * still distribute the documents across the CDN.
 */
let docCache =
  // we need a better hot reload story here
  global.cache ||
  (global.cache = new LRUCache<string, Doc>({
    max: 500,
    ttl: 300,
    allowStale: true,
    fetchMethod: async (key) => {
      let [repo, ref, slug] = key.split(":");
      let filename = `docs/${slug}.md`;
      let md = await getRepoContent(repo, ref, filename);
      let { content, attrs } = parseAttrs(md, filename);
      let html = await processMarkdown(content);
      return { attrs, filename, html, slug };
    },
  }));

export async function getDoc(
  repo: string,
  ref: string,
  slug: string
): Promise<Doc | undefined> {
  let key = `${repo}:${ref}:${slug}`;
  let doc = await docCache.fetch(key);
  return doc;
}

/**
 * Removes the extension from markdown file names.
 */
function makeSlug(docName: string): string {
  // Could be as simple as `/^docs\//` but local development tarballs have more
  // path in front of "docs/", so grab any of that stuff too. Maybe there's a
  // way to control the basename of files when we make the local tarball but I
  // dunno how to do that right now.
  return docName.replace(/^(.+\/)?docs\//, "").replace(/\.md$/, "");
}

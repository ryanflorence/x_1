import { getRepoContent, getRepoTarballStream } from "./github.server";
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
}

let menuCache =
  // we need a better hot reload story here
  global.menuCache ||
  (global.menuCache = new LRUCache<string, MenuDoc[]>({
    max: 30, // store up to 30 versions
  }));

export async function getMenu(refId: string, lang: string): Promise<MenuDoc[]> {
  let cacheKey = `${refId}:${lang}`;
  let cached = menuCache.get(cacheKey);
  if (cached) return cached;

  let menu: MenuDoc[] = [];

  let stream = await getRepoTarballStream(refId);
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

export async function getDoc(ref: string, slug: string): Promise<Doc | null> {
  let docFilename = `docs/${slug}.md`;
  let md = await getRepoContent(ref, docFilename);
  let { content, attrs } = parseAttrs(md, docFilename);
  return {
    attrs,
    filename: docFilename,
    html: await processMarkdown(content),
    slug,
  };
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

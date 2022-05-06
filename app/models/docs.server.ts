import arc from "@architect/functions";
import { getRepoTarballStream } from "./github.server";
import { createTarFileProcessor } from "./tar.server";
import { processMarkdown } from "@ryanflorence/md";
// @ts-expect-error
import sortBy from "sort-by";

export interface Doc {
  pk: string;
  sk: string;
  name: string;
  markdown: string;
  ref: string;
  lang: string;
  html?: string;
  parentPk?: string;
}

export interface DocRef {
  pk: string;
  status: "seeding" | "failed" | "complete";
  lastDoc?: string;
}

type MenuDoc = Pick<Doc, "pk" | "name"> & { slug: string };

export async function getMenu(ref: string, lang: string): Promise<MenuDoc[]> {
  let db = await arc.tables();
  let result = await db.doc.query({
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": ref },
  });
  return result.Items.map((item: any) => ({
    sk: item.sk,
    name: item.name,
    // just want the "slug" part of this: {ref}#docs/{slug}.md
    // should use `match`, I'm too tired.
    slug: item.sk.match(/docs\/(.+)\.md/)[1],
  })).sort(sortBy("slug"));
}

export async function getDoc(
  ref: string,
  slug: string
): Promise<Doc | undefined> {
  let db = await arc.tables();
  let sk = makeDocId(ref, `docs/${slug}.md`);
  let pk = ref;
  let result = await db.doc.get({ pk, sk });
  return result;
}

let makeDocId = (ref: string, filename: string) => `${ref}#${filename}`;

export async function getDocRef(ref: string): Promise<DocRef> {
  let db = await arc.tables();
  return db.docRef.get({ pk: ref });
}

export async function addGitHubRefToDB(ref: string): Promise<void> {
  let db = await arc.tables();

  let docRef = await db.docRef.get({ pk: ref });

  // already seeding
  if (docRef && docRef.status === "seeding") {
    return;
  }

  db.docRef.put({ pk: ref, status: "seeding" } as DocRef);
  let stream = await getRepoTarballStream(ref);
  let processFiles = createTarFileProcessor(stream);
  await processFiles(async ({ filename, content }) => {
    // # TODO make a function for this
    console.log(`Processing markdown: ${filename}`);
    let pk = ref;
    let sk = makeDocId(ref, filename);
    let html = await processMarkdown(content);
    let name = pk; // TODO: use frontmatter
    let doc: Doc = {
      pk,
      sk,
      lang: "en",
      markdown: content,
      name,
      html: html,
      parentPk: "",
      ref,
    };

    try {
      console.log(`Writing to dynamo: ${filename}`);
      let result = await db.doc.put(doc);
      console.log(`✅ processed ${result.pk}`);
      db.docRef.put({
        pk: ref,
        status: "seeding",
        lastDoc: filename,
      } as DocRef);
    } catch (e) {
      console.error(`🚫 failed ${filename}`);
      console.error(e);
      db.docRef.put({ pk: ref, status: "failed" } as DocRef);
      throw e;
    }
  });
  await db.docRef.put({ pk: ref, status: "complete" } as DocRef);
}

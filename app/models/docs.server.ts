import type { Doc, DocGithubRef } from "@prisma/client";
import { getRepoTarballStream } from "./github.server";
import { createTarFileProcessor } from "./tar.server";
import { processMarkdown } from "@ryanflorence/md";
// @ts-expect-error
import sortBy from "sort-by";
import { prisma } from "~/db.server";

export type MenuDoc = Pick<Doc, "id" | "name"> & { slug: string };

export async function getMenu(refId: string, lang: string): Promise<MenuDoc[]> {
  let docs = await prisma.doc.findMany({
    where: {
      refId: refId,
      lang: lang,
    },
  });

  return docs
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      slug: getDocSlug(doc.name),
    }))
    .sort(sortBy("slug"));
}

/**
 * Removes the extension from markdown file names
 */
function getDocSlug(docName: string): string {
  return docName.replace(/^docs\//, "").replace(/\.md$/, "");
}

export async function getDoc(refId: string, slug: string): Promise<Doc | null> {
  let name = `docs/${slug}.md`;
  return prisma.doc.findFirst({
    where: {
      refId: refId,
      name: name,
    },
  });
}

export async function getDocRef(ref: string): Promise<DocGithubRef | null> {
  return prisma.docGithubRef.findFirst({ where: { id: ref } });
}

export async function addGitHubRefToDB(refId: string): Promise<void> {
  let docRef = await getDocRef(refId);

  // already seeding
  if (docRef?.status === "seeding") {
    return;
  }

  // mark as seeding in case other requests come in for this one at the same
  // time so we don't seed it multiple times
  await prisma.docGithubRef.create({
    data: {
      id: refId,
      status: "seeding",
    },
  });

  let stream = await getRepoTarballStream(refId);
  let processFiles = createTarFileProcessor(stream);

  await processFiles(async ({ filename, content }) => {
    console.log(`Processing markdown: ${filename}`);
    // let html = await processMarkdown(content);
    let html = "";

    try {
      console.log(`Writing to database: ${filename}`);
      let result = await prisma.doc.create({
        data: {
          lang: "en",
          markdown: content,
          name: filename,
          html: html,
          refId: refId,
        },
      });
      console.log(`✅ processed ${result.name}`);

      prisma.docGithubRef.update({
        where: { id: refId },
        data: { lastDoc: result.id },
      });
    } catch (e) {
      console.error(`🚫 failed ${filename}`);
      console.error(e);
      // TODO: what happens if somebody comes later after a failed attempt? (or
      // the user simply hits refresh after a failure, ofc)
      prisma.docGithubRef.update({
        where: { id: refId },
        data: { status: "failed" },
      });
      throw e;
    }
  });

  await prisma.docGithubRef.update({
    where: { id: refId },
    data: { status: "complete" },
  });
}

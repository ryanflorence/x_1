import { getTags } from "./tags";
import { getDoc, getMenu } from "./docs";

export { validateParams } from "./params";
export { getRepoTarballStream } from "./repo-tarball";

export type { MenuDoc } from "./docs";

const REPO = process.env.GITHUB_REPO!;
if (!REPO) throw new Error("Missing process.env.GITHUB_REPO");

export function getRepoTags() {
  return getTags(REPO);
}

export function getRepoDocsMenu(ref: string, lang: string) {
  return getMenu(REPO, ref, lang);
}

export function getRepoDoc(ref: string, slug: string) {
  return getDoc(REPO, ref, slug);
}

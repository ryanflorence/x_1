import fsp from "fs/promises";
import invariant from "tiny-invariant";
import path from "path";

/**
 * Fetches the contents of a file in a repository or from your local disk.
 *
 * @param ref The GitHub ref, use `"local"` for local docs development
 * @param filepath The filepath inside the repo (including "docs/")
 * @returns The text of the file
 */
export async function getRepoContent(
  repo: string,
  ref: string,
  filepath: string
) {
  if (ref === "local") return getLocalContent(filepath);
  let url = `https://raw.githubusercontent.com/${repo}/${ref}/${filepath}`;
  let res = await fetch(url);
  if (res.status !== 200) throw res;
  return res.text();
}

/**
 * Reads a single file from your local source repository
 */
async function getLocalContent(filepath: string): Promise<string> {
  invariant(
    process.env.LOCAL_REPO_RELATIVE_PATH,
    "Expected LOCAL_REPO_RELATIVE_PATH"
  );
  let localFilePath = path.join(process.env.LOCAL_REPO_RELATIVE_PATH, filepath);
  let content = await fsp.readFile(localFilePath);
  return content.toString();
}

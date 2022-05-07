import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import followRedirects from "follow-redirects";
import tar from "tar";
import invariant from "tiny-invariant";

const REPO = "remix-run/react-router";

/**
 * Fetches a repo tarball from GitHub or your local repo as a tarball in
 * development.
 *
 * @param ref GitHub ref (main, v6.0.0, etc.) use "local" for local repo.
 * @returns The repo tarball
 */
export async function getRepoTarballStream(
  ref: string
): Promise<NodeJS.ReadableStream> {
  if (ref === "local") {
    return getLocalTarballStream();
  }

  let agent = new followRedirects.https.Agent({ keepAlive: true });
  let tarballURL = `https://github.com/${REPO}/archive/${ref}.tar.gz`;
  let { hostname, pathname } = new URL(tarballURL);
  let options = { agent: agent, hostname: hostname, path: pathname };

  let res = await get(options);

  if (res.statusCode === 200) {
    return res;
  }

  throw new Error(`Could not fetch ${tarballURL}`);
}

/**
 * Fetches the contents of a file in a repository or from your local disk.
 *
 * @param ref The GitHub ref, use `"local"` for local docs development
 * @param filepath The filepath inside the repo (including "docs/")
 * @returns The text of the file
 */
export async function getRepoContent(ref: string, filepath: string) {
  if (ref === "local") {
    return getLocalContent(filepath);
  }

  let url = `https://raw.githubusercontent.com/${REPO}/${ref}/${filepath}`;
  let res = await fetch(url);
  return res.text();
}

////////////////////////////////////////////////////////////////////////////////

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

/**
 * Creates a tarball out of your local source repository so that the rest of the
 * code in this app can continue to work the same for local dev as in
 * production.
 */
export async function getLocalTarballStream(): Promise<NodeJS.ReadableStream> {
  invariant(
    process.env.LOCAL_REPO_RELATIVE_PATH,
    "Expected LOCAL_REPO_RELATIVE_PATH"
  );
  let localDocsPath = path.join(
    process.cwd(),
    process.env.LOCAL_REPO_RELATIVE_PATH,
    "docs"
  );
  await tar.c(
    {
      gzip: true,
      file: ".local.tgz",
    },
    [localDocsPath]
  );
  return fs.createReadStream(".local.tgz");
}

// FIXME: I don't know the types here
function get(options: any): any {
  return new Promise((accept, reject) => {
    followRedirects.https.get(options, accept).on("error", reject);
  });
}

import fs from "fs";
import path from "path";
import followRedirects from "follow-redirects";

export async function getRepoTarballStream(ref: string) {
  if (ref === "local") return getLocalTarballStream();
  return getGitHubTarballStream(ref);
}

export function getLocalTarballStream(): NodeJS.ReadableStream {
  let fixturePath = path.join(__dirname, "..", "test", "fixture.tar.gz");
  return fs.createReadStream(fixturePath);
}

async function getGitHubTarballStream(ref: string) {
  let agent = new followRedirects.https.Agent({ keepAlive: true });
  let tarballURL = `https://github.com/remix-run/react-router/archive/${ref}.tar.gz`;
  let { hostname, pathname } = new URL(tarballURL);
  let options = { agent: agent, hostname: hostname, path: pathname };

  console.debug(`Fetching ${tarballURL}`);
  let res = (await get(options)) as any;

  if (res.statusCode === 200) {
    console.debug(`Fetch succeeded: ${tarballURL}`);
    return res;
  }

  throw new Error(`Could not fetch ${tarballURL}`);
}

function get(options: any) {
  return new Promise((accept, reject) => {
    followRedirects.https.get(options, accept).on("error", reject);
  });
}

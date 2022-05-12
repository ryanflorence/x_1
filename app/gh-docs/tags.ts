import LRUCache from "lru-cache";

/**
 * Fetches the repo tags
 */
export async function getTags(repo: string) {
  return tagsCache.fetch(repo);
}

declare global {
  var tagsCache: LRUCache<string, string[]>;
}

let tagsCache =
  // we need a better hot reload story here
  global.tagsCache ||
  (global.tagsCache = new LRUCache<string, string[]>({
    max: 10,
    ttl: 30000, // 5 minutes, so we can see new tags quickly
    fetchMethod: async (key) => {
      console.log("fetching tags", key);
      let url = `https://api.github.com/repos/${key}/tags?per_page=100`;
      let res = await fetch(url);
      if (res.status !== 200) {
        console.log(res.status, await res.text());
        throw new Error(
          "Could not fetch tags! Previous message is the github response."
        );
      }
      let json = await res.json();
      return json.map((tag: { name: string }) => tag.name);
    },
  }));

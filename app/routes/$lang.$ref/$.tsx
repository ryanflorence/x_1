import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getRepoDoc } from "~/github.server";

// Keep it in the browser (and CDN) for 5 minutes so when they click
// back/forward/etc. it's super fast, swr for 1 week on CDN so it stays fast but
// people get typos fixes and stuff, too.
const CACHE_CONTROL = "max-age=300, stale-while-revalidate=604800";

export let loader: LoaderFunction = async ({ params }) => {
  invariant(params.ref, "expected `ref` params");
  invariant(params["*"], "expected splat param");

  let doc = await getRepoDoc(params.ref, params["*"]);
  if (!doc) throw new Response("", { status: 404 });

  return json(doc, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
};

export function headers() {
  return {
    "Cache-Control": CACHE_CONTROL,
  };
}

export default function Doc() {
  let doc = useLoaderData();
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: doc.html }} />
    </div>
  );
}

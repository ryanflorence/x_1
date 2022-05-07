import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getDoc } from "~/models/docs.server";

export let loader: LoaderFunction = async ({ params }) => {
  invariant(params.ref, "expected `ref` params");
  invariant(params["*"], "expected splat param");
  let doc = await getDoc(params.ref, params["*"]);
  if (!doc) throw new Response("", { status: 404 });
  return json(doc, {
    headers: { "Cache-Control": "max-age=60, stale-while-revalidate=3600" },
  });
};

export function headers() {
  return {
    "Cache-Control": "max-age=60, stale-while-revalidate=3600",
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

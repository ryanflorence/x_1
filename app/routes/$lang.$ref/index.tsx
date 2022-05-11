import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import type { Doc } from "~/gh-docs";
import { getRepoDoc } from "~/gh-docs";
import { CACHE_CONTROL } from "~/http";

type LoaderData = Doc;

export let loader: LoaderFunction = async ({ params }) => {
  invariant(params.ref, "expected `ref` params");

  let doc = await getRepoDoc(params.ref, "index");
  if (!doc) throw new Response("", { status: 404 });

  return json<Doc>(doc, {
    headers: { "Cache-Control": CACHE_CONTROL.doc },
  });
};

export function headers() {
  return { "Cache-Control": CACHE_CONTROL.doc };
}

export default function DocPage() {
  let doc = useLoaderData<LoaderData>();
  return (
    <div
      className="markdown max-w-4xl px-3 py-8"
      dangerouslySetInnerHTML={{ __html: doc.html }}
    />
  );
}

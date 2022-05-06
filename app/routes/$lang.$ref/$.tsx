import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getDoc } from "~/models/docs.server";

export let loader: LoaderFunction = async ({ params }) => {
  invariant(params.ref, "expected `ref` params");
  invariant(params["*"], "expected splat param");
  let doc = await getDoc(params.ref, params["*"]);
  console.log({ doc });
  // FIXME: handle not found, need to know if it's seeding or not though
  return json(doc ? { name: doc.name, html: doc.html } : null);
};

export default function Doc() {
  let doc = useLoaderData();
  return (
    <div>
      <h1>{doc.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: doc.html }} />
    </div>
  );
}

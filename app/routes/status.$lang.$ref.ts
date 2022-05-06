import { LoaderFunction, redirect } from "remix";
import { json } from "remix";
import invariant from "tiny-invariant";
import { getDocRef } from "~/models/docs.server";

export let loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.lang, "expected `params.lang`");
  invariant(params.ref, "expected `params.ref`");
  let url = new URL(request.url);
  let refreshUrl = url.searchParams.get("r");

  // don't want people to use our endpoint for phishing attacks by redirecting
  // to any random website but initiating with a valid URL to us
  if (!refreshUrl?.startsWith("/")) {
    throw new Response("", { status: 405 });
  }

  let docRef = await getDocRef(params.ref);
  if (docRef.status === "complete") {
    return redirect(refreshUrl);
  }

  return json(docRef);
};

import { json, redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getRepoDocsMenu, getRepoTags, validateParams } from "~/gh-docs";
import type { MenuDoc } from "~/gh-docs";
import styles from "~/styles/docs.css";

type LoaderData = {
  menu: MenuDoc[];
};

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export function headers() {
  return { "Cache-Control": "max-age=300" };
}

export let loader: LoaderFunction = async ({ params, request }) => {
  let { lang, ref } = params;
  invariant(lang, "expected `params.lang`");
  invariant(ref, "expected `params.ref`");

  let tags = await getRepoTags();
  if (!tags) throw new Response("Cannot reach GitHub", { status: 503 });

  let branches = ["main", "dev", "local"];
  let betterUrl = validateParams(tags, branches, { lang, ref });
  if (betterUrl) throw redirect("/" + betterUrl);

  let menu = await getRepoDocsMenu(ref, lang);
  return json<LoaderData>({ menu }, {});
};

export default function Doc() {
  let data = useLoaderData<LoaderData>();

  return (
    <div className="flex">
      <div className="w-80 flex-shrink-0 px-8">
        <div className="sticky top-0 py-8">
          <h1>Docs!</h1>
          <ul>
            {data.menu.map((doc, index) => (
              <li key={index}>
                {doc.hasContent ? (
                  <Link className="block py-2 text-blue-500" to={doc.slug}>
                    {doc.attrs.title}
                  </Link>
                ) : (
                  <span className="block">{doc.attrs.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex-1 p-8">
        <Outlet />
      </div>
    </div>
  );
}

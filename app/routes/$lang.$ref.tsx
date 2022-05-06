import React from "react";
import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import {
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useLocation,
  useParams,
} from "@remix-run/react";
import invariant from "tiny-invariant";
import * as Docs from "~/models/docs.server";
import styles from "~/styles/docs.css";

type LoaderData =
  | {
      menu: Docs.MenuDoc[];
      seeding: false;
    }
  | {
      menu: null;
      seeding: true;
    };

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export let loader: LoaderFunction = async ({ params, request }) => {
  let { lang, ref } = params;

  invariant(lang, "expected `params.lang`");
  invariant(ref, "expected `params.ref`");

  let menu = await Docs.getMenu(ref, lang);

  let needsToSeed = menu.length === 0;

  if (needsToSeed) {
    Docs.addGitHubRefToDB(ref);
    return json<LoaderData>({ seeding: true, menu: null });
  } else {
    return json<LoaderData>({ seeding: false, menu });
  }
};

export default function Doc() {
  let data = useLoaderData<LoaderData>();

  return data.seeding ? (
    <Seeding />
  ) : (
    <div className="flex">
      <div className="w-80 flex-shrink-0 px-8">
        <div className="sticky top-0 py-8">
          <h1>Docs!</h1>
          <ul>
            {data.menu.map((doc, index) => (
              <li key={index}>
                <Link className="block py-2 text-blue-500" to={doc.slug}>
                  {doc.slug}
                </Link>
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

function Seeding() {
  let fetcher = useFetcher();
  let params = useParams();
  let location = useLocation();

  React.useEffect(() => {
    if (fetcher.state !== "loading") {
      let id = setTimeout(() => {
        fetcher.load(
          `/status/${params.lang}/${params.ref}?r=${location.pathname}`
        );
      }, 200);
      return () => clearTimeout(id);
    }
  }, [fetcher, params, location]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <p className="mb-2 text-lg">
          Building fresh docs just for you, sit tight!
        </p>
        {fetcher.data?.lastDoc ? (
          <p>
            Processing:
            <br />
            <i>{fetcher.data.lastDoc}</i>
          </p>
        ) : (
          <p>Fetching Tarball from GitHub...</p>
        )}
      </div>
    </div>
  );
}

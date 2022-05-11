import { json, redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useMatches,
} from "@remix-run/react";
import invariant from "tiny-invariant";
import { getRepoDocsMenu, getRepoTags, validateParams } from "~/gh-docs";
import type { MenuDoc } from "~/gh-docs";
import iconsHref from "~/icons.svg";

type LoaderData = {
  menu: MenuDoc[];
  versions: string[];
  branches: string[];
  lang: string;
  currentGitHubRef: string;
};

export function headers() {
  return { "Cache-Control": "max-age=300" };
}

export let loader: LoaderFunction = async ({ params, request }) => {
  let { lang, ref } = params;
  invariant(lang, "expected `params.lang`");
  invariant(ref, "expected `params.ref`");

  let tags = await getRepoTags();
  if (!tags) throw new Response("Cannot reach GitHub", { status: 503 });

  let branches = ["main", "dev"];

  if (process.env.NODE_ENV === "development") {
    branches.push("local");
  }

  let betterUrl = validateParams(tags, branches, { lang, ref });
  if (betterUrl) throw redirect("/" + betterUrl);

  let menu = await getRepoDocsMenu(ref, lang);
  return json<LoaderData>({
    menu,
    versions: tags.slice(0, 1),
    branches,
    currentGitHubRef: ref,
    lang,
  });
};

export default function Doc() {
  return (
    <>
      <div className="sticky top-0 z-20">
        <Header />
        <Breadcrumbs />
      </div>
      <Outlet />
    </>
  );
}

function Header() {
  return (
    <div className="flex w-full items-center justify-between bg-gray-900 px-3 py-3 text-gray-100">
      <div className="flex items-center gap-4">
        <Link to="." className="block">
          <svg
            aria-label="React Router logo, nine dots in an upward triangle (one on top, two in the middle, three on the bottom) with a path of three highlighted and connected from top to bottom"
            className="h-9 w-9"
          >
            <use href={`${iconsHref}#logo`} />
          </svg>
          <div className="hidden">React Router</div>
        </Link>
        <VersionSelect />
      </div>
      <div className="flex items-center gap-4">
        <HeaderLink
          className="hidden md:block"
          href="https://github.com/remix-run/react-router"
        >
          GitHub
        </HeaderLink>{" "}
        <HeaderLink className="hidden md:block" href="https://rmx.as/discord">
          Discord
        </HeaderLink>
        <HeaderLink
          href="https://remix.run"
          className="flex items-center gap-1 border-l border-gray-600 pl-2"
        >
          By{" "}
          <svg aria-hidden className="h-3 w-3">
            <use href={`${iconsHref}#remix-r`} />
          </svg>{" "}
          ↗
        </HeaderLink>
      </div>
    </div>
  );
}

function Breadcrumbs() {
  let [isOpen, setIsOpen] = useState(false);
  let location = useLocation();
  let doc = useMatches().slice(-1)[0].data;
  invariant(doc, "expected child match for the doc");

  useEffect(
    () => {
      if (isOpen) setIsOpen(false);
    },
    // eslint-disable-next-line
    [location]
  );

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
      className="group relative flex h-full flex-col"
    >
      <summary className="_no-triangle flex cursor-pointer select-none items-center gap-2 border-b border-gray-200 bg-white bg-opacity-75 px-2 py-3 text-sm font-medium backdrop-blur hover:bg-gray-50 active:bg-white">
        <div className="flex items-center gap-2">
          <svg aria-hidden className="h-5 w-5 group-open:hidden">
            <use href={`${iconsHref}#chevron-r`} />
          </svg>
          <svg aria-hidden className="hidden h-5 w-5 group-open:block">
            <use href={`${iconsHref}#chevron-d`} />
          </svg>
        </div>
        <div className="whitespace-nowrap font-bold">{doc.attrs.title}</div>
      </summary>
      <div className="absolute h-[70vh] w-full overflow-auto overscroll-contain bg-white p-3 shadow-xl">
        <Menu />
      </div>
    </details>
  );
}

function HeaderLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={"text-d-p-sm font-medium text-gray-100" + " " + className}
      children={children}
    />
  );
}

function VersionSelect() {
  let { versions, branches, currentGitHubRef, lang } =
    useLoaderData<LoaderData>();
  let [isOpen, setIsOpen] = useState(false);
  let location = useLocation();

  useEffect(
    () => {
      if (isOpen) setIsOpen(false);
    },
    // eslint-disable-next-line
    [location]
  );

  return (
    <details
      open={isOpen}
      onToggle={(e) => {
        let open = e.currentTarget.open;
        setIsOpen(open);
      }}
      onBlur={(e) => {
        // capture because react cleans up the event
        let me = e.currentTarget;
        // let focus rest
        requestAnimationFrame(() => {
          let maybeMe = document.activeElement?.closest("details");
          let activeElementIsMeOrMyPosterity = maybeMe === me;
          if (!activeElementIsMeOrMyPosterity) setIsOpen(false);
        });
      }}
    >
      <summary className="_no-triangle relative flex cursor-pointer list-none items-center justify-center gap-1 rounded-full bg-gray-800 px-3 py-2 text-center text-xs font-medium text-gray-200 hover:bg-gray-700">
        <div>{currentGitHubRef}</div>
        <svg aria-hidden className="h-3 w-3">
          <use href={`${iconsHref}#chevron-d`} />
        </svg>
      </summary>
      <div className="absolute z-10">
        <div className="relative top-1 flex items-stretch gap-6 rounded bg-gray-800 p-4 shadow">
          <div className="leading-loose">
            <VersionsLabel label="Branches" />
            {branches.map((branch) => (
              <VersionLink key={branch} to={`/${lang}/${branch}`}>
                {branch}
              </VersionLink>
            ))}
          </div>

          <div className="w-0 border-r border-gray-600" />

          <div>
            <VersionsLabel label="Versions" />
            {versions.map((version) => (
              <VersionLink key={version} to={`/${lang}/${version}`}>
                {version}
              </VersionLink>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

function VersionsLabel({ label }: { label: string }) {
  return (
    <div className="mb-2 text-xs font-bold uppercase text-gray-300">
      {label}
    </div>
  );
}
function VersionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      className="block font-medium text-gray-100 hover:underline"
      to={to}
      children={children}
    />
  );
}

function Menu() {
  let data = useLoaderData<LoaderData>();
  return (
    <nav>
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
    </nav>
  );
}

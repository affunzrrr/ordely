import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pages } from "./routes.mjs";

const homepage = await readFile(
  new URL("./index.html", import.meta.url),
  "utf8",
);
const main = /<main id="main">[\s\S]*?<\/main>/;
const canonical = homepage.match(/<link rel="canonical" href="([^"]+)" \/>/);
if (
  !homepage.includes('<base href="./" />') ||
  !main.test(homepage) ||
  !canonical
) {
  throw new Error(
    "The homepage must contain the shared base URL, canonical URL, and main element.",
  );
}

for (const page of pages) {
  const folder = new URL(page.path, import.meta.url);
  const root = "../".repeat(page.path.split("/").length - 1);
  const html = homepage
    .replace(
      "<!doctype html>",
      "<!doctype html>\n<!-- Generated from index.html by build-pages.mjs. -->",
    )
    .replace('<base href="./" />', `<base href="${root}" />`)
    .replace(
      canonical[0],
      `<link rel="canonical" href="${new URL(page.path, canonical[1])}" />`,
    )
    .replace(
      'class="skip" href="#main"',
      `class="skip" href="./${page.path}#main"`,
    )
    .replace(/<title>[^<]*<\/title>/, `<title>${page.title} — Ordely</title>`)
    .replace(
      main,
      `<main id="main">
      <section id="page-view" class="wrap subpage">
        <h1>${page.title}</h1>
        <noscript><p>Enable JavaScript to use this part of Ordely.</p></noscript>
      </section>
    </main>`,
    );
  await mkdir(folder, { recursive: true });
  await writeFile(new URL("index.html", folder), html);
}

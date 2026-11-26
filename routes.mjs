export const pages = [
  { id: "shop", path: "shop/", title: "Shop the edit", category: "All pieces" },
  { id: "shop", path: "shop/apparel/", title: "Apparel", category: "Apparel" },
  {
    id: "shop",
    path: "shop/footwear/",
    title: "Footwear",
    category: "Footwear",
  },
  { id: "shop", path: "shop/bags/", title: "Bags", category: "Bags" },
  {
    id: "shop",
    path: "shop/accessories/",
    title: "Accessories",
    category: "Accessories",
  },
  { id: "shop", path: "shop/makeup/", title: "Makeup", category: "Makeup" },
  { id: "brands", path: "brands/", title: "Approved brands" },
  { id: "groups", path: "collective-unlock/", title: "Collective Unlock" },
  { id: "orders", path: "orders/", title: "My orders" },
  { id: "admin", path: "admin/", title: "Admin demo" },
];

export const siteRoot = new URL("./", import.meta.url);

export function identifyPage(url) {
  const relative = url.pathname
    .slice(siteRoot.pathname.length)
    .replace(/(^|\/)index\.html$/, "$1");
  const path = relative && !relative.endsWith("/") ? `${relative}/` : relative;
  return pages.find((page) => page.path === path) ?? { id: "home" };
}

export function shopHref(category = "All pieces", sort = "featured") {
  const path =
    pages.find((page) => page.category === category)?.path ?? "shop/";
  return `./${path}${sort === "price" ? "?sort=price" : ""}`;
}

export function legacyHref(hash) {
  const [page, detail] = hash.slice(1).split("/");
  if (page === "edit")
    return shopHref(
      pages.find((entry) => entry.path === `shop/${detail}/`)?.category,
    );
  if (page === "orders") return "./orders/";
  const targets = {
    brands: ["brands", "brand"],
    "collective-unlock": ["collective-unlock", "filter"],
    admin: ["admin", "tab"],
  };
  if (!Object.hasOwn(targets, page)) return null;
  const [directory, parameter] = targets[page];
  return `./${directory}/${detail ? `?${new URLSearchParams({ [parameter]: detail })}` : ""}`;
}

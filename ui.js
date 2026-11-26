import { esc, estimateNotice } from "./data.js";

const icons = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  "up-right": '<path d="M6 18 18 6M7 6h11v11"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.8"/><path d="m15 15 4.6 4.6"/>',
  user: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>',
  bag: '<path d="M5 8h14l1.2 12H3.8L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  calendar:
    '<rect x="4" y="6" width="16" height="14" rx="1"/><path d="M8 3.5v5m8-5v5M4 10h16"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 6-2 7-2 8h16c0-1-2-2-2-8ZM10 20h4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sliders:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="var(--paper)"/><circle cx="15" cy="17" r="2" fill="var(--paper)"/>',
  shirt: '<path d="m9 4-6 3 2 5 3-1v9h8v-9l3 1 2-5-6-3a3 3 0 0 1-6 0Z"/>',
};
export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || ""}</svg>`;
export const button = (
  title,
  action,
  id = "",
  classes = "button",
  extra = "",
) =>
  `<button type="button" class="${classes}" data-action="${action}" data-id="${esc(id)}" ${extra}>${title}</button>`;
export const iconButton = (label, name, action, classes = "", extra = "") =>
  `<button type="button" class="icon-button ${classes}" data-action="${action}" aria-label="${label}" title="${label}">${icon(name)}${extra}</button>`;
export const tag = (value, dark = false) =>
  `<span class="tag${dark ? " dark" : ""}">${esc(value)}</span>`;
export const empty = (title, copy, action = "") =>
  `<div class="empty"><h3>${title}</h3><p>${copy}</p>${action}</div>`;
export const notice = (copy, type = "") =>
  `<p class="notice ${type}">${esc(copy)}</p>`;
export const disclaimer = () => `<p class="disclaimer">${estimateNotice}</p>`;
export const field = (label, name, options = "", full = false) =>
  `<label${full ? ' class="full"' : ""}>${label}<input name="${name}" ${options}></label>`;
export const area = (label, name, value = "", options = "", full = true) =>
  `<label${full ? ' class="full"' : ""}>${label}<textarea name="${name}" ${options}>${esc(value)}</textarea></label>`;
export const select = (label, name, choices, selected = "", full = false) =>
  `<label${full ? ' class="full"' : ""}>${label}<select name="${name}">${choices
    .map((choice) => {
      const [value, text] = Array.isArray(choice) ? choice : [choice, choice];
      return `<option value="${esc(value)}" ${selected === value ? "selected" : ""}>${esc(text)}</option>`;
    })
    .join("")}</select></label>`;
export const check = (label, name, checked = false, required = false) =>
  `<label class="choice full"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} ${required ? "required" : ""}><span>${label}</span></label>`;
export const submit = (label) =>
  `<div class="full actions"><button class="button primary" type="submit">${label}</button></div>`;
export const form = (kind, body, id = "") =>
  `<form class="form-grid" data-form="${kind}" data-id="${esc(id)}">${body}<p class="notice error full" data-error role="alert" hidden></p></form>`;
export const rows = (entries) =>
  `<div class="listing">${entries.map(([label, value, important]) => `<div class="list-row${important ? " total" : ""}"><span>${label}</span><span>${value}</span></div>`).join("")}</div>`;
export const fold = (label, body) =>
  `<details class="info-fold"><summary>${label}</summary>${body}</details>`;
export const table = (label, headings, data) =>
  `<div class="table-wrap"><table><caption>${label}</caption><thead><tr>${headings.map((heading) => `<th scope="col">${heading}</th>`).join("")}</tr></thead><tbody>${data.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
export const art = (item) =>
  item.image
    ? `<img src="./assets/${esc(item.image)}-color.webp" width="621" height="621" loading="lazy" alt="${esc(item.title)}">`
    : `<span class="missing-art" aria-label="No product photograph">${icon("shirt")}</span>`;
export const heading = (eyebrow, title, copy = "") =>
  `<div class="section-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}<span>.</span></h1>${copy ? `<p class="lead">${copy}</p>` : ""}</div></div>`;

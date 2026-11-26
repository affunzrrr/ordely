export const categories = ["Apparel", "Footwear", "Bags", "Accessories"];
export const estimateNotice =
  "Simulated estimate. Final charges depend on the exchange rate and actual customs costs.";
export const testNotice =
  "Test mode · No money is charged. Use sample information only.";
export const statuses = [
  "Deposit received",
  "Batch closed",
  "Purchased",
  "Shipped",
  "Ready for balance",
  "Balance paid",
  "Out for delivery",
  "Delivered",
];
export const names = [
  "Item cost",
  "Shared freight",
  "Customs duty and levies",
  "VAT and SSCL",
  "Service fee",
  "Local delivery",
];

export const hs = {
  Apparel: {
    code: "6206.30",
    wording: "Women’s or girls’ blouses and shirts, of cotton",
    alt: "6106.10 · Knitted cotton blouses",
    duty: 17,
    levies: 7,
    weight: 0.45,
  },
  Footwear: {
    code: "6404.11",
    wording: "Sports footwear with textile uppers",
    alt: "6403.99 · Other footwear with leather uppers",
    duty: 20,
    levies: 9,
    weight: 0.85,
  },
  Bags: {
    code: "4202.21",
    wording: "Handbags with an outer surface of leather",
    alt: "4202.22 · Handbags with textile or plastic outer surfaces",
    duty: 19,
    levies: 8,
    weight: 0.65,
  },
  Accessories: {
    code: "9004.10",
    wording: "Sunglasses",
    alt: "9004.90 · Other spectacles and goggles",
    duty: 15,
    levies: 6,
    weight: 0.19,
  },
};

const products = [
  {
    id: "shirt",
    title: "Striped Poplin Shirt",
    brand: "COS",
    category: "Apparel",
    currency: "GBP",
    price: 39,
    material: "Cotton poplin",
    variant: "S / White stripe",
    interested: 4,
    threshold: 5,
    popularity: "Filling fast",
    image: "shirt",
    description:
      "An oversized cotton-poplin shirt with a curved hem and narrow stripes.",
  },
  {
    id: "sneakers",
    title: "Retro Runner",
    brand: "New Balance",
    category: "Footwear",
    currency: "USD",
    price: 79,
    material: "Mesh and suede",
    variant: "EU 39 / Grey",
    interested: 5,
    threshold: 5,
    popularity: "Filling fast",
    unlocked: true,
    image: "sneakers",
    description:
      "A low-profile runner with a layered upper and a softly treaded sole.",
  },
  {
    id: "bag",
    title: "Curve Shoulder Bag",
    brand: "ARKET",
    category: "Bags",
    currency: "EUR",
    price: 59,
    material: "Leather",
    variant: "Black",
    interested: 3,
    threshold: 5,
    popularity: "On track",
    image: "bag",
    description:
      "A curved shoulder bag with a single strap and a softly structured shape.",
  },
  {
    id: "sunglasses",
    title: "The 01 Sunglasses",
    brand: "Le Specs",
    category: "Accessories",
    currency: "USD",
    price: 39,
    material: "Acetate",
    variant: "Black",
    interested: 2,
    threshold: 5,
    popularity: "Slow",
    image: "sunglasses",
    description:
      "A clean rectangular frame with dark lenses and a substantial acetate rim.",
  },
].map((item) => ({ quantity: 1, confidence: "High", ...item }));

const brands = [
  ["COS", "Apparel", "cos.com"],
  ["New Balance", "Footwear", "newbalance.com"],
  ["ARKET", "Bags", "arket.com"],
  ["Le Specs", "Accessories", "lespecs.com"],
  ["UNIQLO", "Apparel", "uniqlo.com"],
  ["Charles & Keith", "Bags", "charleskeith.com"],
  ["Veja", "Footwear", "veja-store.com"],
].map(([name, category, evidence], index) => ({
  name,
  category,
  evidence: `https://${evidence}`,
  status: index === 5 ? "Unclear" : index === 6 ? "Not approved" : "Approved",
  date: "2026-11-20",
  shipping: index % 2 ? "Via forwarder" : "To selected regions",
  terms: "Simulated policy record for agent purchases.",
  history: [],
}));

const demoUser = {
  id: "demo",
  name: "Maya Fernando",
  email: "maya@example.test",
  address: "12 Flower Road, Colombo 07",
  emailOptIn: true,
};
const day = 86400000;
const period = 14 * day;
const anchor = Date.parse("2026-11-20T18:00:00+05:30");
const batchId = (index) => `SL-${String(index + 11).padStart(2, "0")}`;
export function batch(at = Date.now()) {
  const index = Math.floor((at - anchor) / period) + 1;
  const closes = anchor + index * period;
  return { id: batchId(index), closes, days: Math.ceil((closes - at) / day) };
}
export function currentBatch(state) {
  let at = Date.now();
  let next = batch(at);
  while (state.closedBatches.includes(next.id)) {
    at = next.closes;
    next = batch(at);
  }
  return { ...next, days: Math.ceil((next.closes - Date.now()) / day) };
}
export const date = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
export const shortDate = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
const formatNumber = new Intl.NumberFormat("en-LK", {
  maximumFractionDigits: 0,
});
export const money = (value) => `LKR ${formatNumber.format(value)}`;
export const range = ([low, high]) =>
  `${money(low)}–${formatNumber.format(high)}`;
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export const round = (value) => Math.round(value / 10) * 10;
export const activeVersion = (state) =>
  [...state.versions]
    .filter(
      (entry) =>
        entry.status === "Approved" &&
        entry.effective <= new Date().toISOString().slice(0, 10),
    )
    .sort((a, b) => b.effective.localeCompare(a.effective) || b.id - a.id)[0] ||
  state.versions[0];

export function lineItems(item, state, groupSize = 1) {
  const version = activeVersion(state);
  const tariff = hs[item.tariffCategory || item.category] || hs.Accessories;
  const quantity = item.quantity || 1;
  const rate = version.rates[item.currency];
  const buffer = version.buffer / 100;
  const rawItem = item.price * rate * quantity;
  const weight = (item.weight || tariff.weight) * quantity;
  const freight = 1000 + weight * (1250 + 1850 / Math.max(1, groupSize));
  const customs =
    ((rawItem + freight) *
      ((version.duty[tariff.code] ?? tariff.duty) +
        (version.levies?.[tariff.code] ?? tariff.levies))) /
    100;
  const tax =
    ((rawItem + freight + customs) *
      ((version.vat ?? 18) + (version.sscl ?? 2.5))) /
    100;
  const fee = Math.max(850, (rawItem * version.fee) / 100);
  return [
    [rawItem * (1 - buffer), rawItem * (1 + buffer)],
    [freight * 0.88, freight * 1.16],
    [customs * 0.91, customs * 1.12],
    [tax * 0.93, tax * 1.09],
    [fee, fee],
    [version.delivery, version.delivery],
  ].map((pair) => pair.map(round));
}
export function total(lines) {
  return lines.reduce(([lo, hi], [a, b]) => [lo + a, hi + b], [0, 0]);
}
export const midpoint = ([lo, hi]) => (lo + hi) / 2;
export const members = (state, item) =>
  item.interested + (state.interest[item.id] || []).length;
export const isApproved = (state, item) =>
  state.brands.some(
    (brand) => brand.name === item.brand && brand.status === "Approved",
  );
export const canOrder = (state, item) =>
  isApproved(state, item) &&
  item.unlocked &&
  ["High", "Medium"].includes(item.confidence) &&
  item.review !== "Rejected";
export function classification(item) {
  const text =
    `${item.title} ${item.description} ${item.material}`.toLowerCase();
  const cue = {
    Apparel: /cotton|linen|shirt|denim|wool|poplin/,
    Footwear: /shoe|runner|mesh|sneaker|sole|suede/,
    Bags: /bag|leather|canvas|tote/,
    Accessories: /sunglass|acetate|glasses|frames|eyewear/,
  };
  if (
    item.material.trim().length < 3 ||
    /\b(unknown|mixed|other|unsure|tbd)\b/i.test(item.material)
  )
    return {
      confidence: "Low",
      reason:
        "The tariff depends on details about the material or construction. An admin will review the item.",
    };
  if (cue[item.category].test(text))
    return {
      confidence: "High",
      reason:
        "The item description and material match the selected tariff category.",
    };
  return {
    confidence: "Medium",
    reason:
      "The selected product category is clear, but the material has fewer matching cues.",
  };
}
export function findDuplicate(items, item) {
  const clean = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const url = safeURL(item.url);
  const canonical = (value) => {
    const parsed = new URL(value);
    return `${parsed.hostname}${parsed.pathname}`
      .toLowerCase()
      .replace(/\/$/, "");
  };
  return items.find(
    (entry) =>
      entry.brand === item.brand &&
      (clean(entry.title) === clean(item.title) ||
        (url && safeURL(entry.url) && canonical(url) === canonical(entry.url))),
  );
}

function initialState() {
  const current = batch();
  const past = batch(current.closes - period - 1);
  const firstVersion = {
    id: 1,
    effective: "2026-11-20",
    checked: "2026-11-20",
    status: "Approved",
    rates: { USD: 306.5, GBP: 399.4, EUR: 352.2 },
    buffer: 3.5,
    fee: 6.5,
    delivery: 850,
    duty: {},
    levies: {},
    vat: 18,
    sscl: 2.5,
  };
  const state = {
    products,
    brands,
    versions: [firstVersion],
    people: [demoUser],
    active: null,
    orders: [],
    interest: {},
    alerts: {},
    audit: [],
    closedBatches: [],
    plans: {},
  };
  const seed = (item, id, status, actual) => {
    const lines = lineItems(item, state, 5);
    const estimate = total(lines);
    const deposit = Math.ceil(midpoint(estimate) / 2);
    const history = statuses
      .slice(0, statuses.indexOf(status) + 1)
      .map((label, index) => ({
        label,
        at: past.closes + (index - 1) * day,
        note:
          label === "Ready for balance" ? "Customs clearance completed." : "",
      }));
    return {
      id,
      buyer: demoUser.id,
      item,
      estimate,
      lines,
      deposit,
      batch: past.id,
      closes: past.closes,
      status,
      history,
      address: demoUser.address,
      payment: "Deposit paid",
      tracking: "SLX-" + id,
      actual,
    };
  };
  state.orders = [
    seed(products[2], "ORD-042", "Ready for balance", 1560),
    seed(products[0], "ORD-037", "Shipped", null),
  ];
  state.alerts.demo = [
    {
      message: "The Curve Shoulder Bag cleared customs. Your balance is ready.",
      at: state.orders[0].history.at(-1).at,
      read: false,
    },
  ];
  return state;
}
const key = "ordely-prototype-v1";
export function load() {
  try {
    return JSON.parse(localStorage.getItem(key)) || initialState();
  } catch {
    return initialState();
  }
}
export const save = (state) => localStorage.setItem(key, JSON.stringify(state));
export const person = (state) =>
  state.people.find((entry) => entry.id === state.active);
export function notify(state, user, message) {
  const alerts = (state.alerts[user] ||= []);
  alerts.unshift({ message, at: Date.now(), read: false });
}
export function log(state, action, note = "") {
  state.audit.unshift({ action, note, at: Date.now(), actor: "Demo admin" });
}
export function changeOrder(state, order, status, note = "") {
  const orderLog = { label: status, at: Date.now(), note };
  order.status = status;
  order.history.push(orderLog);
  notify(
    state,
    order.buyer,
    `${order.id} · ${status}${note ? ` — ${note}` : ""}`,
  );
}
export function finalLines(order) {
  const lines = order.lines.map(midpoint);
  if (order.actual != null) lines[2] = order.actual;
  return lines;
}
export const finalTotal = (order) =>
  finalLines(order).reduce((sum, amount) => sum + amount, 0);
export const cancellable = (state, order) =>
  ["Deposit received", "On hold"].includes(order.status) &&
  !state.closedBatches.includes(order.batch) &&
  Date.now() < order.closes;
export const identifier = (prefix) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

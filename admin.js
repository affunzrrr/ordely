import {
  activeVersion,
  categories,
  changeOrder,
  currentBatch,
  date,
  esc,
  finalTotal,
  hs,
  isApproved,
  log,
  members,
  money,
  notify,
  round,
  safeURL,
  statuses,
} from "./data.js";
import {
  area,
  button,
  empty,
  field,
  form,
  heading,
  notice,
  rows,
  select,
  submit,
  table,
  tag,
} from "./ui.js";

const tabs = [
  ["overview", "Overview"],
  ["reviews", "Review queue"],
  ["brands", "Brand policies"],
  ["rates", "Tariffs & rates"],
  ["groups", "Groups & forecast"],
  ["batches", "Batches & freight"],
  ["orders", "Orders"],
  ["evaluation", "AI evaluation"],
];
const approvedStatus = ["Approved", "Unclear", "Not approved"];
const labels = {
  "Deposit received": "Close the batch first",
  "Batch closed": "Purchased",
  Purchased: "Shipped",
  Shipped: "Ready for balance",
  "Balance paid": "Out for delivery",
  "Out for delivery": "Delivered",
};

export function adminView(state, section, filters = {}) {
  if (!tabs.some(([id]) => id === section)) section = "overview";
  const title = tabs.find(([id]) => id === section)[1];
  const body = {
    overview,
    reviews,
    brands,
    rates,
    groups,
    batches,
    orders,
    evaluation,
  }[section](state, filters);
  return `${heading("Admin demo", title, "Simulation workspace · Changes are visible in this browser only.")}<nav class="admin-tabs" aria-label="Admin navigation">${tabs.map(([id, label]) => `<a href="#admin/${id}" ${section === id ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav><div class="subpage-body">${body}</div>`;
}

function overview(state) {
  const current = currentBatch(state);
  const queue = state.products.filter(
    (item) => item.confidence === "Low" && item.review !== "Rejected",
  );
  const close = state.products.filter(
    (item) =>
      isApproved(state, item) &&
      !item.unlocked &&
      members(state, item) >= item.threshold - 1,
  );
  const deposits = state.orders.reduce(
    (sum, order) => sum + (order.status === "Cancelled" ? 0 : order.deposit),
    0,
  );
  const stale = (value) => Date.now() - Date.parse(value) > 30 * 86400000;
  const version = activeVersion(state);
  const staleBrands = state.brands.filter((brand) => stale(brand.date)).length;
  return `<div class="stats"><div><span>Open batch</span><strong>${current.id}</strong></div><div><span>Awaiting review</span><strong>${queue.length}</strong></div><div><span>Groups near threshold</span><strong>${close.length}</strong></div><div><span>Sandbox deposits</span><strong>${money(deposits)}</strong></div></div>${notice(`Closes ${date(current.closes)} at 6 pm LKT · ${current.days} days left`)}${stale(version.checked) ? notice("Check tariff and exchange tables before the next batch.") : ""}${staleBrands ? notice(`${staleBrands} brand policy records are due for review.`) : ""}${table(
    "Orders by status",
    ["Status", "Orders"],
    [...new Set(state.orders.map((order) => order.status))].map((status) => [
      status,
      state.orders.filter((order) => order.status === status).length,
    ]),
  )}${table(
    "Recent activity",
    ["When", "Actor", "Change", "Note"],
    state.audit
      .slice(0, 12)
      .map((entry) => [
        date(entry.at),
        entry.actor,
        esc(entry.action),
        esc(entry.note),
      ]),
  )}`;
}

function reviews(state) {
  const queue = state.products.filter(
    (item) => item.confidence === "Low" && item.review !== "Rejected",
  );
  return queue.length
    ? table(
        "Classification review",
        ["Product", "Material", "Status", ""],
        queue.map((item) => [
          esc(item.title),
          esc(item.material),
          tag(item.review || "Awaiting review"),
          button("Review", "admin-review", item.id, "button small"),
        ]),
      )
    : empty(
        "The queue is clear",
        "Submit an estimate with an unknown material on the customer site to try a review.",
      );
}

function brands(state) {
  return table(
    "Brand Policy Register",
    [
      "Brand",
      "Status",
      "Shipping / agent terms",
      "Last checked",
      "Evidence",
      "",
    ],
    state.brands.map((brand) => [
      esc(brand.name),
      tag(brand.status, brand.status === "Approved"),
      `${esc(brand.shipping)}<p>${esc(brand.terms)}</p>`,
      esc(brand.date),
      safeURL(brand.evidence)
        ? `<a href="${esc(safeURL(brand.evidence))}" target="_blank" rel="noopener">Policy reference</a>`
        : "—",
      button("Edit policy", "admin-brand", brand.name, "button small"),
    ]),
  );
}

function rates(state) {
  const version = activeVersion(state);
  return `<div class="actions">${button("Draft a rate version", "admin-rate", "", "button primary")}</div>${table(
    "Current approved tariff table",
    ["Category", "HS code", "Duty", "Levies", "VAT", "SSCL"],
    categories.map((category) => {
      const tariff = hs[category];
      return [
        category,
        tariff.code,
        `${version.duty[tariff.code] ?? tariff.duty}%`,
        `${version.levies?.[tariff.code] ?? tariff.levies}%`,
        `${version.vat ?? 18}%`,
        `${version.sscl ?? 2.5}%`,
      ];
    }),
  )}${rows([
    [
      "USD · GBP · EUR exchange rates",
      `${version.rates.USD} · ${version.rates.GBP} · ${version.rates.EUR}`,
    ],
    ["Buffer", `${version.buffer}%`],
    ["Service fee", `${version.fee}%`],
    ["Local delivery", money(version.delivery)],
  ])}${table(
    "Version history",
    ["Version", "Effective date", "Status", ""],
    [...state.versions]
      .reverse()
      .map((entry) => [
        entry.id,
        esc(entry.effective),
        tag(entry.status, entry.status === "Approved"),
        entry.status === "Draft"
          ? button(
              "Approve version",
              "admin-rate-approve",
              entry.id,
              "button small",
            )
          : "",
      ]),
  )}`;
}

function groups(state) {
  const forecasts = {
    "Filling fast": ["Likely to fill", 3],
    "On track": ["At risk", 1],
    Slow: ["Unlikely", 0],
  };
  return `${table(
    "Collective Unlock and simulated weekly demand",
    ["Product", "Brand", "Group", "Forecast", ""],
    state.products.map((item) => {
      const count = members(state, item);
      const [label, projected] = forecasts[item.popularity] || forecasts.Slow;
      return [
        esc(item.title),
        esc(item.brand),
        `${count} / ${item.threshold}${item.unlocked ? " · Unlocked" : ""}`,
        `${label}<p>${count} current · ${count + projected} forecast</p>`,
        button("Manage", "admin-group", item.id, "button small"),
      ];
    }),
  )}${notice("Simulated weekly-interest backtest · WAPE 22.4% · Moving-average baseline 30.1%")}`;
}

const weightOf = (order) =>
  (order.item.weight || hs[order.item.category].weight) *
  (order.item.quantity || 1);
const volumeOf = (order) => weightOf(order) * 0.006;
function batches(state) {
  const current = currentBatch(state);
  const distinct = [
    ...new Set([
      current.id,
      ...state.closedBatches,
      ...state.orders.map((order) => order.batch),
    ]),
  ];
  return `${notice(`Open batch ${current.id} · Closes ${date(current.closes)} at 6 pm LKT`)}${table(
    "Batch register",
    ["Batch", "Orders", "Weight / volume", "Deposits", "Status", ""],
    distinct.map((id) => {
      const active = state.orders.filter(
        (order) => order.batch === id && order.status !== "Cancelled",
      );
      return [
        esc(id),
        active.length,
        `${active.reduce((sum, order) => sum + weightOf(order), 0).toFixed(2)} kg / ${active.reduce((sum, order) => sum + volumeOf(order), 0).toFixed(3)} m³`,
        money(active.reduce((sum, order) => sum + order.deposit, 0)),
        tag(id === current.id ? "Open" : "Closed"),
        button("View batch", "admin-batch", id, "button small"),
      ];
    }),
  )}`;
}

function orders(state, filters) {
  const entries = [...state.orders]
    .reverse()
    .filter(
      (order) =>
        (!filters.status || order.status === filters.status) &&
        (!filters.batch || order.batch === filters.batch) &&
        (!filters.customer ||
          findBuyer(state, order)
            .toLowerCase()
            .includes(filters.customer.toLowerCase())) &&
        (!filters.since ||
          order.history[0].at >= new Date(filters.since).getTime()),
    );
  return `${form("admin-filter", select("Status", "status", [["", "All statuses"], ...statuses, "On hold", "Cancelled"], filters.status) + select("Batch", "batch", [["", "All batches"], ...new Set(state.orders.map((order) => order.batch))], filters.batch) + field("Customer name", "customer", `value="${esc(filters.customer)}"`) + field("Deposited on or after", "since", `type="date" value="${esc(filters.since)}"`) + submit("Apply filters"))}${
    entries.length
      ? table(
          "Orders and shipments",
          ["Order", "Customer", "Batch", "Status", "Final price", ""],
          entries.map((order) => [
            `${esc(order.id)}<p>${esc(order.item.title)}</p>`,
            esc(findBuyer(state, order)),
            esc(order.batch),
            tag(order.status),
            order.actual == null ? "—" : money(finalTotal(order)),
            button("Manage", "admin-order", order.id, "button small"),
          ]),
        )
      : empty("No matching orders", "Change the filters or place a test order.")
  }`;
}

const findBuyer = (state, order) =>
  state.people.find((entry) => entry.id === order.buyer)?.name ||
  "Demo customer";

function evaluation() {
  return `${notice("Illustrative results from a simulated dataset. These figures do not measure a live AI system.")}${table(
    "Prototype evaluation",
    ["Component", "Sample", "Result", "Baseline or comparison"],
    [
      [
        "HS classifier",
        "180 labelled items",
        "Top-1 81.7% · Top-3 94.4%",
        "Keyword 63.9% · Embeddings only 74.4% top-1",
      ],
      [
        "Auto-accept rule",
        "126 of 180 items",
        "70% auto-accepted · 7.1% error",
        "High or Medium confidence",
      ],
      [
        "Landed-cost range",
        "96 simulated clearances",
        "87.5% inside range",
        "84 of 96 sampled orders",
      ],
      [
        "Shipment optimiser",
        "12 simulated batches",
        "16.8% less per kg · 8.3% rolled over",
        "Ship everything in order",
      ],
      [
        "Demand forecast",
        "24 weeks of simulated data",
        "22.4% WAPE",
        "30.1% moving-average WAPE",
      ],
    ],
  )}<p class="subtle">The customer estimate also shows price drivers, comparison and sample product-review themes. Group progress drives the availability indicator.</p>`;
}

function candidateTable(item) {
  const choices = [
    item.category,
    ...categories.filter((category) => category !== item.category),
  ].slice(0, 3);
  return table(
    "Candidate classifications",
    ["Category", "HS code and wording", "Reason"],
    choices.map((category, index) => [
      category,
      `${hs[category].code} · ${hs[category].wording}`,
      index === 0
        ? "Matches the submitted product category."
        : index === 1
          ? "Consider if the material or construction is different."
          : "Lower confidence based on the item description.",
    ]),
  );
}

const moneyField = (label, name, value, options = "", min = 0) =>
  field(
    label,
    name,
    `type="number" ${options} min="${min}" step="0.01" value="${esc(value)}" required`,
  );
const percentField = (label, name, value) =>
  moneyField(label, name, value, 'max="100"');

export function adminDialog(state, action, id) {
  if (action === "admin-review") {
    const item = state.products.find((entry) => entry.id === id);
    if (!item) return;
    return [
      item.title,
      `${notice(item.reason || "Material details are pending.")}${candidateTable(item)}${form(action, select("Decision", "decision", ["Approve category", "Request more information", "Reject"]) + select("Category override", "category", categories, item.category) + area("Review note", "note", "", 'required maxlength="350"') + submit("Confirm decision"), id)}`,
      true,
    ];
  }
  if (action === "admin-brand") {
    const brand = state.brands.find((entry) => entry.name === id);
    if (!brand) return;
    const history = brand.history || [];
    return [
      `${id} policy`,
      `${form(action, select("Approval status", "status", approvedStatus, brand.status) + field("Date checked", "date", `type="date" value="${esc(brand.date)}" required`) + field("Evidence URL", "evidence", `type="url" value="${esc(brand.evidence)}"`, true) + field("Shipping to Sri Lanka", "shipping", `value="${esc(brand.shipping)}" required maxlength="80"`, true) + area("Agent-purchase and resale terms", "terms", brand.terms, 'required maxlength="400"') + submit("Confirm policy change"), id)}${
        history.length
          ? table(
              "Policy history",
              ["Date", "Status"],
              history.map((entry) => [date(entry.at), esc(entry.status)]),
            )
          : ""
      }`,
    ];
  }
  if (action === "admin-rate") {
    const value = activeVersion(state);
    return [
      "New rate version",
      form(
        action,
        field(
          "Effective date",
          "effective",
          `type="date" required value="${new Date().toISOString().slice(0, 10)}"`,
        ) +
          percentField("Exchange-rate buffer (%)", "buffer", value.buffer) +
          ["USD", "GBP", "EUR"]
            .map((currency) =>
              moneyField(
                `${currency} to LKR`,
                currency,
                value.rates[currency],
                "",
                0.01,
              ),
            )
            .join("") +
          percentField("Service fee (%)", "fee", value.fee) +
          moneyField("Local delivery (LKR)", "delivery", value.delivery) +
          percentField("VAT (%)", "vat", value.vat ?? 18) +
          percentField("SSCL (%)", "sscl", value.sscl ?? 2.5) +
          categories
            .map((category) => {
              const tariff = hs[category];
              return (
                percentField(
                  `${category} duty (%)`,
                  `duty-${tariff.code}`,
                  value.duty[tariff.code] ?? tariff.duty,
                ) +
                percentField(
                  `${category} levies (%)`,
                  `levies-${tariff.code}`,
                  value.levies?.[tariff.code] ?? tariff.levies,
                )
              );
            })
            .join("") +
          submit("Confirm and save draft"),
      ),
      true,
    ];
  }
  if (action === "admin-rate-approve") {
    const version = state.versions.find((entry) => entry.id === Number(id));
    if (!version) return;
    return [
      "Approve rates",
      `${notice(`Version ${id} becomes eligible for new estimates on ${version.effective}.`)}${form(action, submit("Confirm approval"), id)}`,
    ];
  }
  if (action === "admin-group") {
    const item = state.products.find((entry) => entry.id === id);
    if (!item) return;
    const options = [
      ["", "Select a target"],
      ...state.products
        .filter(
          (entry) =>
            entry.id !== id &&
            entry.brand === item.brand &&
            entry.category === item.category,
        )
        .map((entry) => [entry.id, entry.title]),
    ];
    return [
      item.title,
      `${notice(`${members(state, item)} interested · Threshold ${item.threshold}`)}${form(action, select("Action", "operation", ["Update threshold", "Unlock group", "Merge into another group", "Remove product"]) + field("Threshold", "threshold", `type="number" min="1" max="100" value="${item.threshold}" required`) + select("Merge target", "target", options, "", true) + submit("Confirm action"), id)}`,
    ];
  }
  if (action === "admin-batch") return batchDialog(state, id);
  if (action === "admin-close")
    return [
      "Close batch",
      `${notice("Closing locks customer cancellations for this batch and rolls unfinished groups to the next batch.")}${form(action, submit("Confirm batch close"), id)}`,
    ];
  if (action === "admin-plan")
    return [
      "Plan shared shipments",
      form(
        action,
        moneyField("Forwarder rate per kg (LKR)", "rate", 2250) +
          moneyField("Rate per kg above 5 kg (LKR)", "bulk", 1725) +
          moneyField("Minimum shipment weight (kg)", "min", 0.5) +
          moneyField("Maximum box weight (kg)", "max", 8) +
          moneyField("Maximum wait (days)", "wait", 14) +
          field(
            "Purchase cut-off date",
            "cutoff",
            `type="date" required value="${new Date().toISOString().slice(0, 10)}"`,
          ) +
          submit("Run optimiser"),
        id,
      ),
    ];
  if (action === "admin-order") return orderDialog(state, id);
}

function batchDialog(state, id) {
  const current = currentBatch(state).id === id;
  const entries = state.orders.filter(
    (order) => order.batch === id && order.status !== "Cancelled",
  );
  const plan = state.plans[id];
  return [
    `Batch ${id}`,
    `${rows([
      ["Orders", entries.length],
      [
        "Total weight",
        `${entries.reduce((sum, order) => sum + weightOf(order), 0).toFixed(2)} kg`,
      ],
      [
        "Sandbox deposits",
        money(entries.reduce((sum, order) => sum + order.deposit, 0)),
      ],
    ])}<div class="actions">${current ? button("Close batch", "admin-close", id, "button primary") : plan?.accepted ? "" : button(plan ? "Re-run optimiser" : "Run optimiser", "admin-plan", id, "button primary")}${entries.length ? button("Export manifest CSV", "admin-manifest", id) : ""}</div>${
      plan
        ? `${notice(`${plan.accepted ? "Accepted plan" : "Proposed plan"} · ${money(plan.total)} total freight · ${money(plan.perKg)} per kg · Baseline ${money(plan.baseline)}`)}${table(
            "Proposed shipments",
            ["Box", "Orders", "Weight", "Freight"],
            plan.boxes.map((box, index) => [
              index + 1,
              esc(box.orders.join(", ")),
              `${box.weight.toFixed(2)} kg`,
              money(box.cost),
            ]),
          )}${
            plan.rolls.length
              ? table(
                  "Rolled over",
                  ["Order", "Reason"],
                  plan.rolls.map((entry) => [esc(entry.id), esc(entry.reason)]),
                )
              : ""
          }${plan.accepted ? "" : form("admin-accept", submit("Confirm and accept plan"), id)}`
        : ""
    }${
      entries.length
        ? table(
            "Master manifest",
            ["Brand", "Product", "Variant", "Qty", "Original price", ""],
            [...entries]
              .sort((a, b) => a.item.brand.localeCompare(b.item.brand))
              .map(({ item }) => [
                esc(item.brand),
                esc(item.title),
                esc(item.variant),
                item.quantity,
                `${item.currency} ${item.price}`,
                safeURL(item.url)
                  ? `<a href="${esc(safeURL(item.url))}" target="_blank" rel="noopener">Product link</a>`
                  : "—",
              ]),
          )
        : ""
    }`,
    true,
  ];
}

function orderDialog(state, id) {
  const order = state.orders.find((entry) => entry.id === id);
  if (!order) return;
  const next = labels[order.status];
  const actions = [["note", "Add note or message"]];
  if (next && order.status !== "Deposit received")
    actions.unshift(["advance", `Mark ${next.toLowerCase()}`]);
  if (order.status === "On hold")
    actions.unshift(["resume", "Resume previous status"]);
  if (
    order.status !== "On hold" &&
    order.status !== "Cancelled" &&
    order.status !== "Delivered"
  )
    actions.push(["hold", "Put on hold"]);
  if (["Deposit received", "Batch closed", "On hold"].includes(order.status))
    actions.push(["refund", "Cancel and refund deposit"]);
  return [
    order.id,
    `${rows([
      ["Customer", esc(findBuyer(state, order))],
      ["Product", esc(order.item.title)],
      ["Status", esc(order.status)],
      ["Deposit", money(order.deposit)],
      ["Purchase reference", esc(order.purchaseRef || "—")],
      [
        "Forwarder / tracking",
        `${esc(order.forwarder || "—")} / ${esc(order.tracking || "—")}`,
      ],
      [
        "Customs agent / arrival",
        `${esc(order.agent || "—")} / ${esc(order.arrival || "—")}`,
      ],
      [
        "Actual customs duty and levies",
        order.actual == null ? "—" : money(order.actual),
      ],
    ])}${table(
      "Order history",
      ["Date", "Event", "Note"],
      order.history.map((entry) => [
        date(entry.at),
        esc(entry.label),
        esc(entry.note),
      ]),
    )}${form("admin-order", select("Action", "operation", actions, "", true) + field("Purchase reference", "purchaseRef", `maxlength="100" value="${esc(order.purchaseRef)}"`) + field("Forwarder", "forwarder", `maxlength="100" value="${esc(order.forwarder)}"`) + field("Tracking number", "tracking", `maxlength="80" value="${esc(order.tracking)}"`) + field("Expected arrival", "arrival", `type="date" value="${esc(order.arrival)}"`) + field("Customs agent", "agent", `maxlength="100" value="${esc(order.agent)}"`) + field("Actual customs duty and levies (LKR)", "actual", `type="number" min="0" step="0.01" value="${esc(order.actual)}"`) + area("Note to customer", "note", "", 'maxlength="350"') + submit("Confirm order action"), id)}`,
    true,
  ];
}

function optimiser(entries, data) {
  const minimum = Number(data.min),
    maximum = Number(data.max),
    rate = Number(data.rate),
    bulk = Number(data.bulk),
    wait = Number(data.wait);
  if (minimum > maximum || maximum <= 0)
    throw Error(
      "Maximum box weight must be positive and at least the minimum shipment weight.",
    );
  const cutoff = Date.parse(`${data.cutoff}T23:59:59+05:30`);
  const boxes = [],
    rolls = [];
  [...entries]
    .sort((a, b) => weightOf(b) - weightOf(a))
    .forEach((order) => {
      const weight = weightOf(order);
      if (weight > maximum || order.history[0].at > cutoff) {
        rolls.push({
          id: order.id,
          reason:
            weight > maximum
              ? "Exceeds maximum box weight."
              : "Received after the cut-off.",
        });
        return;
      }
      let box = boxes.find((entry) => entry.weight + weight <= maximum);
      if (!box) {
        box = { weight: 0, orders: [], at: order.history[0].at };
        boxes.push(box);
      }
      box.orders.push(order.id);
      box.weight += weight;
      box.at = Math.min(box.at, order.history[0].at);
    });
  const shippable = boxes.filter((box) => {
    if (box.weight >= minimum || (Date.now() - box.at) / 86400000 >= wait)
      return true;
    rolls.push(
      ...box.orders.map((id) => ({
        id,
        reason:
          "Below minimum weight and still within the customer wait limit.",
      })),
    );
    return false;
  });
  for (const box of shippable)
    box.cost = round(
      Math.max(minimum, box.weight) * (box.weight >= 5 ? bulk : rate) + 650,
    );
  const total = shippable.reduce((sum, box) => sum + box.cost, 0);
  const weight = shippable.reduce((sum, box) => sum + box.weight, 0);
  return {
    boxes: shippable,
    rolls,
    total,
    perKg: weight ? round(total / weight) : 0,
    baseline: entries.reduce(
      (sum, order) =>
        sum + round(Math.max(minimum, weightOf(order)) * rate + 650),
      0,
    ),
    accepted: false,
  };
}

export function submitAdmin(state, action, id, data) {
  const item = state.products.find((entry) => entry.id === id);
  const order = state.orders.find((entry) => entry.id === id);
  if (action === "admin-review" && item) {
    item.review =
      data.decision === "Approve category"
        ? "Approved"
        : data.decision === "Reject"
          ? "Rejected"
          : "More information requested";
    if (item.review === "Approved") {
      item.confidence = "High";
      item.tariffCategory = data.category;
      item.reason = data.note;
    }
    notify(state, item.owner, `${item.title} · ${item.review}. ${data.note}`);
    log(state, `Reviewed ${item.title}`, `${item.review} · ${data.note}`);
  } else if (action === "admin-brand") {
    if (data.status === "Approved" && (!safeURL(data.evidence) || !data.date))
      throw Error("An approval requires a valid evidence link and a date.");
    if (data.date > new Date().toISOString().slice(0, 10))
      throw Error("Use today or an earlier date for a completed policy check.");
    const brand = state.brands.find((entry) => entry.name === id);
    Object.assign(brand, data);
    brand.history.unshift({ at: Date.now(), status: data.status });
    if (data.status === "Not approved")
      state.orders
        .filter(
          (entry) =>
            entry.item.brand === id &&
            ![
              "Delivered",
              "Cancelled",
              "On hold",
              "Balance paid",
              "Out for delivery",
            ].includes(entry.status),
        )
        .forEach((entry) => {
          entry.beforeHold = entry.status;
          changeOrder(state, entry, "On hold", "Brand policy requires review.");
        });
    log(state, `Updated ${id} policy`, data.status);
  } else if (action === "admin-rate") {
    const numbers = (prefix) =>
      Object.fromEntries(
        categories.map((category) => {
          const code = hs[category].code;
          return [code, Number(data[`${prefix}-${code}`])];
        }),
      );
    state.versions.push({
      id: Math.max(...state.versions.map((entry) => entry.id)) + 1,
      effective: data.effective,
      checked: new Date().toISOString().slice(0, 10),
      status: "Draft",
      rates: {
        USD: Number(data.USD),
        GBP: Number(data.GBP),
        EUR: Number(data.EUR),
      },
      buffer: Number(data.buffer),
      fee: Number(data.fee),
      delivery: Number(data.delivery),
      vat: Number(data.vat),
      sscl: Number(data.sscl),
      duty: numbers("duty"),
      levies: numbers("levies"),
    });
    log(state, "Drafted tariff and rate version", data.effective);
  } else if (action === "admin-rate-approve") {
    const version = state.versions.find((entry) => entry.id === Number(id));
    if (version.status !== "Draft")
      throw Error("This version has already been approved.");
    version.status = "Approved";
    log(state, `Approved rate version ${id}`, version.effective);
  } else if (action === "admin-group" && item) {
    editGroup(state, item, data);
    log(state, `${data.operation} · ${item.title}`);
  } else if (action === "admin-close") {
    const current = currentBatch(state);
    if (current.id !== id) throw Error("This batch has already closed.");
    state.closedBatches.push(id);
    state.orders
      .filter(
        (entry) => entry.batch === id && entry.status === "Deposit received",
      )
      .forEach((entry) => changeOrder(state, entry, "Batch closed"));
    const next = currentBatch(state);
    state.products
      .filter((entry) => !entry.unlocked)
      .forEach((entry) =>
        (state.interest[entry.id] || []).forEach((user) =>
          notify(
            state,
            user,
            `${entry.title} rolled into ${next.id}. Your interest stays active.`,
          ),
        ),
      );
    log(state, `Closed batch ${id}`);
  } else if (action === "admin-plan") {
    if (state.plans[id]?.accepted)
      throw Error("This batch already has an accepted plan.");
    const entries = state.orders.filter(
      (entry) =>
        entry.batch === id &&
        ["Deposit received", "Batch closed", "Purchased"].includes(
          entry.status,
        ),
    );
    state.plans[id] = optimiser(entries, data);
    log(state, `Ran optimiser for ${id}`);
    return ["admin-batch", id];
  } else if (action === "admin-accept") {
    const plan = state.plans[id];
    if (!plan || plan.accepted) throw Error("There is no pending plan.");
    plan.accepted = true;
    const next = currentBatch(state);
    for (const { id: orderId, reason } of plan.rolls) {
      const rolled = state.orders.find(
        (entry) =>
          entry.id === orderId &&
          entry.batch === id &&
          ["Batch closed", "Purchased"].includes(entry.status),
      );
      if (!rolled) continue;
      rolled.batch = next.id;
      rolled.history.push({
        label: `Rolled into ${next.id}`,
        at: Date.now(),
        note: reason,
      });
      notify(
        state,
        rolled.buyer,
        `${rolled.id} moved to ${next.id}. ${reason}`,
      );
    }
    log(state, `Accepted shipment plan for ${id}`);
    return ["admin-batch", id];
  } else if (action === "admin-order" && order) {
    editOrder(state, order, data);
    log(state, `${order.id} · ${data.operation}`, data.note);
  } else {
    throw Error("This item is no longer available.");
  }
}

function editGroup(state, item, data) {
  const target = state.products.find((entry) => entry.id === data.target);
  const notifyUnlock = (entry) =>
    (state.interest[entry.id] || []).forEach((user) =>
      notify(state, user, `${entry.title} unlocked. Pre-orders are open.`),
    );
  if (data.operation === "Update threshold") {
    item.threshold = Number(data.threshold);
    if (!item.unlocked && members(state, item) >= item.threshold) {
      item.unlocked = true;
      notifyUnlock(item);
    }
  } else if (data.operation === "Unlock group") {
    item.unlocked = true;
    notifyUnlock(item);
  } else {
    if (data.operation === "Merge into another group") {
      if (
        !target ||
        target.id === item.id ||
        target.brand !== item.brand ||
        target.category !== item.category
      )
        throw Error("Choose a group from the same brand and category.");
      state.interest[target.id] = [
        ...new Set([
          ...(state.interest[target.id] || []),
          ...(state.interest[item.id] || []),
        ]),
      ];
      if (!target.unlocked && members(state, target) >= target.threshold) {
        target.unlocked = true;
        notifyUnlock(target);
      }
    }
    state.products = state.products.filter((entry) => entry.id !== item.id);
    delete state.interest[item.id];
  }
}

function editOrder(state, order, data) {
  if (data.operation === "advance") {
    const next = labels[order.status];
    if (!next || order.status === "Deposit received")
      throw Error("This order cannot advance from its current status.");
    if (next === "Purchased" && !data.purchaseRef)
      throw Error("Enter the store purchase reference.");
    if (next === "Shipped" && (!data.tracking || !data.forwarder))
      throw Error("Enter the forwarder and tracking number.");
    if (next === "Ready for balance") {
      if (data.actual === "" || !data.agent)
        throw Error("Enter the customs agent and actual customs charges.");
      order.actual = Number(data.actual);
    }
    changeOrder(state, order, next, data.note);
  } else if (
    data.operation === "hold" &&
    !["On hold", "Cancelled", "Delivered"].includes(order.status)
  ) {
    if (!data.note) throw Error("Give the customer a reason for the hold.");
    order.beforeHold = order.status;
    changeOrder(state, order, "On hold", data.note);
  } else if (
    data.operation === "resume" &&
    order.status === "On hold" &&
    order.beforeHold
  ) {
    if (!isApproved(state, order.item))
      throw Error("Restore the brand approval before resuming this order.");
    let status = order.beforeHold;
    if (
      status === "Deposit received" &&
      (state.closedBatches.includes(order.batch) || Date.now() >= order.closes)
    )
      status = "Batch closed";
    changeOrder(state, order, status, data.note);
  } else if (
    data.operation === "refund" &&
    ["Deposit received", "Batch closed", "On hold"].includes(order.status)
  ) {
    if (!data.note) throw Error("Enter a reason for the sandbox refund.");
    order.payment = "Deposit refunded (sandbox)";
    changeOrder(state, order, "Cancelled", data.note);
  } else if (data.operation === "note") {
    if (!data.note) throw Error("Enter a note for the customer.");
    order.history.push({
      label: "Order update",
      at: Date.now(),
      note: data.note,
    });
    notify(state, order.buyer, `${order.id} · ${data.note}`);
  } else {
    throw Error("This status change is unavailable.");
  }
  for (const key of [
    "purchaseRef",
    "forwarder",
    "tracking",
    "arrival",
    "agent",
  ])
    if (data[key]) order[key] = data[key];
}

export function manifest(state, id) {
  const items = state.orders
    .filter((order) => order.batch === id && order.status !== "Cancelled")
    .map((order) => order.item)
    .sort((a, b) => a.brand.localeCompare(b.brand));
  const entries = [
    [
      "Brand",
      "Product",
      "Link",
      "Size or colour",
      "Quantity",
      "Currency",
      "Unit price",
    ],
    ...items.map((item) => [
      item.brand,
      item.title,
      safeURL(item.url),
      item.variant,
      item.quantity,
      item.currency,
      item.price,
    ]),
  ];
  const cell = (value) =>
    `"${String(value ?? "")
      .replace(/^[\s]*[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const url = URL.createObjectURL(
    new Blob([entries.map((entry) => entry.map(cell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `ordely-${id}-manifest.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

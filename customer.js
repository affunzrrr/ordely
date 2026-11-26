import {
  activeVersion,
  cancellable,
  canGroupOrder,
  categories,
  currentBatch,
  date,
  esc,
  estimateNotice,
  finalLines,
  finalTotal,
  hs,
  isApproved,
  joinedGroup,
  lineItems,
  members,
  money,
  names,
  person,
  range,
  shortDate,
  testNotice,
  total,
  canOrder,
} from "./data.js";
import {
  area,
  art,
  button,
  check,
  disclaimer,
  empty,
  field,
  fold,
  form,
  heading,
  icon,
  notice,
  rows,
  select,
  submit,
  tag,
} from "./ui.js";

export const ranked = (item) => (item.unlocked ? "Unlocked" : item.popularity);
export const visibleItems = (state) =>
  state.products.filter(
    (item) =>
      isApproved(state, item) &&
      item.review !== "Rejected" &&
      (item.confidence !== "Low" || item.owner === state.active),
  );
const reducedPrice = (state, item) =>
  total(lineItems(item, state, members(state, item)));
const individualPrice = (state, item) => total(lineItems(item, state));

const meter = (state, item) =>
  `<div class="progress" role="progressbar" aria-label="Group progress" aria-valuemin="0" aria-valuemax="${item.threshold}" aria-valuenow="${Math.min(item.threshold, members(state, item))}"><span style="width:${item.unlocked ? 100 : Math.min(100, (members(state, item) * 100) / item.threshold)}%"></span></div>`;

export function catalogueView(state, filter, sort) {
  const entries = visibleItems(state).filter(
    (item) => filter === "All pieces" || item.category === filter,
  );
  if (sort === "price")
    entries.sort(
      (a, b) => individualPrice(state, a)[0] - individualPrice(state, b)[0],
    );
  const tabs = ["All pieces", ...categories]
    .map((label) =>
      button(
        esc(label),
        "filter",
        label,
        "filter",
        `aria-pressed="${filter === label}"`,
      ),
    )
    .join("");
  return `<div class="catalogue-bar"><div class="filters" aria-label="Filter the edit">${tabs}</div><div class="count"><span aria-live="polite">${entries.length} ${entries.length === 1 ? "piece" : "pieces"}</span>${button(icon("sliders"), "sort", "", "icon-button", 'aria-label="Sort the edit" title="Sort the edit"')}</div></div>${entries.length ? `<div class="product-grid">${entries.map((item) => catalogueCard(state, item)).join("")}</div><p class="catalogue-disclaimer disclaimer">Illustrative product photos. ${estimateNotice}</p>` : empty("No pieces in this category", "Choose another category or request an estimate.", button("Get an estimate", "estimate", "", "button primary"))}`;
}

function productCard(item, price, content, badge = "") {
  const cover = button(
    `${art(item)}${badge}`,
    "product",
    item.id,
    "product-cover",
    `aria-label="View ${esc(item.title)}"`,
  );
  return `<article class="product">${cover}<div class="product-meta"><p class="eyebrow">${esc(item.brand)}</p><h3>${button(esc(item.title), "product", item.id, "")}</h3><p class="price">${range(price)}</p>${content}</div></article>`;
}

function catalogueCard(state, item) {
  const action = canOrder(state, item)
    ? button(
        "Pre-order",
        "checkout",
        item.id,
        "text-button product-action",
        `aria-label="Pre-order ${esc(item.title)}"`,
      )
    : button(
        "View estimate review",
        "product",
        item.id,
        "text-button product-action",
      );
  return productCard(item, individualPrice(state, item), action);
}

export const groupFilters = [
  ["all", "All groups"],
  ["close", "Nearly unlocked"],
  ["open", "Unlocked"],
  ["mine", "My groups"],
];

function groupProgress(state, item) {
  const remaining = Math.max(0, item.threshold - members(state, item));
  return `${meter(state, item)}<p class="group-meta"><span>${members(state, item)} of ${item.threshold} interested</span><span>${item.unlocked ? "Group unlocked" : `${remaining} more needed`}</span></p>`;
}

function groupCard(state, item) {
  let action = button(
    "Join group free",
    "interest",
    item.id,
    "button small",
    `aria-label="Join group for ${esc(item.title)}"`,
  );
  if (joinedGroup(state, item)) {
    action = canGroupOrder(state, item)
      ? button(
          "Group pre-order",
          "group-checkout",
          item.id,
          "button primary small",
          `aria-label="Group pre-order for ${esc(item.title)}"`,
        )
      : button("View your group", "product", item.id, "button small");
  }
  return productCard(
    item,
    reducedPrice(state, item),
    `${groupProgress(state, item)}<div class="group-card-actions">${action}</div>`,
    tag(item.unlocked ? "Unlocked" : ranked(item), item.unlocked),
  );
}

export function groupsView(state, filter) {
  const batch = currentBatch(state);
  const entries = visibleItems(state).filter((item) => canOrder(state, item));
  const remaining = (item) => item.threshold - members(state, item);
  const shown = entries
    .filter((item) => {
      if (filter === "mine") return joinedGroup(state, item);
      if (filter === "open") return item.unlocked;
      if (filter === "close") return !item.unlocked && remaining(item) <= 2;
      return true;
    })
    .sort(
      (a, b) =>
        Number(Boolean(a.unlocked)) - Number(Boolean(b.unlocked)) ||
        remaining(a) - remaining(b),
    );
  const tabs = groupFilters
    .map(([key, label]) =>
      button(
        label,
        "group-filter",
        key,
        "filter",
        `aria-pressed="${key === filter}"`,
      ),
    )
    .join("");
  const emptyCopy =
    filter === "mine" && !person(state)
      ? empty(
          "Open your demo account",
          "Sign in to see the groups you’ve joined.",
          button("Open account", "account", "", "button primary"),
        )
      : empty(
          "No groups to show",
          "Browse all groups to find a piece you’d like to order.",
          '<a class="button" href="#collective-unlock">Browse all groups</a>',
        );
  return `<div class="group-intro"><div><h1>Collective Unlock</h1><p class="lead">Join a group for free. When enough shoppers join, you can place a group pre-order and share the cost of shipping.</p></div><div class="group-cutoff"><p class="eyebrow">Next group batch · ${batch.id}</p><p>Closes ${shortDate(batch.closes)} at 6 pm LKT</p></div></div><div class="subpage-body">${fold("How Collective Unlock works", '<p>Choose a group and add your interest. Once it reaches its target, confirm your details and decide whether to pay a deposit. You can also <a class="inline-link" href="#edit">pre-order individually</a> from the catalogue.</p>')}<div class="catalogue-bar"><div class="filters" aria-label="Filter groups">${tabs}</div><div class="count" aria-live="polite">${shown.length} ${shown.length === 1 ? "group" : "groups"}</div></div>${shown.length ? `<div class="product-grid">${shown.map((item) => groupCard(state, item)).join("")}</div>${disclaimer()}` : emptyCopy}</div>`;
}

export function brandsView(state, query = "", filter = "") {
  const available = state.brands
    .filter(
      (brand) =>
        brand.status === "Approved" &&
        brand.name.toLowerCase().includes(query.toLowerCase()),
    )
    .map((brand) => ({
      ...brand,
      departments: [
        ...new Set([
          brand.category,
          ...state.products
            .filter((item) => item.brand === brand.name)
            .map((item) => item.category),
        ]),
      ],
    }))
    .filter((brand) => !filter || brand.departments.includes(filter))
    .sort((a, b) => a.name.localeCompare(b.name));
  const directory = available.map((brand) => [
    `<strong>${esc(brand.name)}</strong><p>${esc(brand.departments.join(" · "))}</p>`,
    button("Estimate a piece", "estimate", brand.name, "text-button"),
  ]);
  return `${heading("Brand catalogue", "Approved brands", "Choose a brand to estimate the full price of a piece. Brand approvals are simulated.")}<div class="subpage-body">${form("brand-filter", field("Search approved brands", "query", `type="search" value="${esc(query)}" placeholder="Brand name"`) + select("Category", "category", [["", "All categories"], ...categories], filter) + submit("Search brands"))}${directory.length ? rows(directory) : empty("No brands found", "Try a different name or category.")}</div>`;
}

export function ordersView(state) {
  const user = person(state);
  const entries = user
    ? state.orders.filter((order) => order.buyer === user.id).reverse()
    : [];
  const groups = user
    ? state.products.filter(
        (item) =>
          (state.interest[item.id] || []).includes(user.id) &&
          isApproved(state, item),
      )
    : [];
  const requests = user
    ? state.products.filter(
        (item) =>
          item.owner === user.id && (item.confidence === "Low" || item.review),
      )
    : [];
  const intro = heading(
    "Customer area",
    "My orders",
    "Follow your pre-orders from deposit to delivery.",
  );
  if (!user)
    return (
      intro +
      empty(
        "Open your demo account",
        "Sign in to view orders or try the sample account.",
        button("Open account", "account", "", "button primary"),
      )
    );
  const body = entries
    .map(
      (order) =>
        `<article class="order-entry"><h3>${esc(order.item.title)}</h3>${tag(order.status, order.status === "Ready for balance")}<p class="subtle">${esc(order.id)} · ${esc(order.batch)} · ${order.actual != null ? money(finalTotal(order)) : range(order.estimate)}</p>${button("Track order", "order", order.id, "text-button")}</article>`,
    )
    .join("");
  return `${intro}<div class="subpage-body">${body ? `<section class="order-list">${body}</section>${disclaimer()}` : empty("No orders yet", "Explore the edit and pre-order when a group opens.", '<a class="button primary" href="#edit">Explore the edit</a>')}${groups.length ? `<section><h3>Your groups</h3>${rows(groups.map((item) => [esc(item.title), button(ranked(item), "product", item.id, "text-button")]))}</section>` : ""}${requests.length ? `<section><h3>Your estimate reviews</h3>${rows(requests.map((item) => [esc(item.title), button(item.review || "Awaiting review", "product", item.id, "text-button")]))}</section>` : ""}</div>`;
}

export function estimateForm(state, brand = "") {
  const choices = state.brands
    .filter((entry) => entry.status === "Approved")
    .map((entry) => entry.name);
  if (!choices.length)
    return empty(
      "No approved brands",
      "Check back after an admin approves a brand.",
    );
  return form(
    "estimate",
    select("Approved brand", "brand", choices, brand) +
      select(
        "Category",
        "category",
        categories,
        state.brands.find((entry) => entry.name === brand)?.category,
      ) +
      field(
        "Product title",
        "title",
        'required maxlength="100" placeholder="e.g. Cotton poplin shirt"',
        true,
      ) +
      area(
        "Description",
        "description",
        "",
        'required maxlength="350" placeholder="Describe the piece and its construction"',
      ) +
      field(
        "Material",
        "material",
        'required maxlength="80" placeholder="e.g. Cotton, or unknown"',
      ) +
      field(
        "Size, colour or shade",
        "variant",
        'required maxlength="60" placeholder="e.g. S / White"',
      ) +
      select("Currency", "currency", ["USD", "GBP", "EUR"]) +
      field(
        "Unit price",
        "price",
        'required type="number" min="0.01" max="100000" step="0.01"',
      ) +
      field(
        "Quantity",
        "quantity",
        'required type="number" min="1" max="30" value="1"',
      ) +
      field(
        "Unit weight in kg (optional)",
        "weight",
        'type="number" min="0.01" max="30" step="0.01"',
      ) +
      field(
        "Product link (optional)",
        "url",
        'type="url" maxlength="500" placeholder="https://"',
        true,
      ) +
      submit("Calculate my estimate"),
  );
}

const sampleReviews = {
  shirt:
    "Roomy shoulders and long cuffs. Check sleeve length if you prefer a closer fit.",
  sneakers:
    "Cushioned for daily wear. Check the width guide if you are between sizes.",
  bag: "Soft leather and a close-underarm fit. The compact interior holds the basics.",
  sunglasses:
    "A substantial frame with dark lenses. Check the bridge width for a closer fit.",
};

export function productView(state, item) {
  const inReview = item.confidence === "Low";
  const brandOkay = isApproved(state, item);
  const batch = currentBatch(state);
  const lines = lineItems(item, state);
  const tariff = hs[item.tariffCategory || item.category];
  const latest = activeVersion(state);
  const stateLabel = inReview ? item.review || "Awaiting review" : ranked(item);
  const recommended = visibleItems(state)
    .filter((entry) => entry.id !== item.id && entry.confidence !== "Low")
    .sort(
      (a, b) =>
        Number(b.category === item.category) -
          Number(a.category === item.category) ||
        Math.abs(individualPrice(state, a)[0] - total(lines)[0]) -
          Math.abs(individualPrice(state, b)[0] - total(lines)[0]),
    )[0];
  const groupPanel =
    brandOkay && item.review !== "Rejected"
      ? `<section class="product-group"><h3>Collective Unlock <span class="subtle">Optional</span></h3>${groupProgress(state, item)}<div class="actions">${button(joinedGroup(state, item) ? "Leave group" : "Join group free", "interest", item.id, "button small")}${canGroupOrder(state, item) ? button("Group pre-order", "group-checkout", item.id, "button primary small") : ""}</div></section>`
      : "";
  const reviewMessage = inReview
    ? notice(
        item.review === "Rejected"
          ? "This request was declined."
          : `${stateLabel}. Pre-orders stay closed until an admin approves the classification.`,
      )
    : "";
  const label =
    item.reason ||
    "The sample description and materials match the tariff category.";
  const solo = range(total(lineItems(item, state, 1)));
  const crowded = range(
    total(
      lineItems(item, state, Math.max(members(state, item), item.threshold)),
    ),
  );
  return `<div class="detail-grid"><div>${art(item)}</div><div class="detail-content"><div class="actions">${tag(`${item.confidence} confidence`)}</div><p>${esc(item.description)}</p><p class="subtle">${esc(item.variant)} · ${esc(item.material)} · ${esc(item.currency)} ${item.price} each</p><p class="price">${range(total(lines))}</p><p class="subtle">Next batch closes ${shortDate(batch.closes)}.</p>${brandOkay ? "" : notice("This brand is unavailable for new pre-orders.")}${reviewMessage}${canOrder(state, item) ? `<div class="actions">${button("Pre-order · 50% deposit", "checkout", item.id, "button primary")}</div>` : ""}${groupPanel}</div></div>${item.sample ? '<p class="disclaimer">Illustrative product photo.</p>' : ""}${disclaimer()}${fold("Landed cost breakdown", rows(names.map((name, index) => [name, range(lines[index])]).concat([["Estimated total", range(total(lines)), true]])))}${fold("Why this range?", `<p>Simulated tariff reference HS ${tariff.code} · ${tariff.wording}. ${esc(label)}</p><p>Other candidates include ${tariff.alt}. The exchange rate includes a ${latest.buffer}% buffer in each direction.</p>`)}${fold(
    "Compare shipping and availability",
    `${rows([
      ["Estimated total on your own", solo],
      ["Estimated total as a group", crowded],
      [
        "Availability outlook",
        item.unlocked
          ? "Group unlocked"
          : `${Math.max(0, item.threshold - members(state, item))} more needed · ${esc(item.popularity)}`,
      ],
    ])}<p>Availability reflects simulated group demand. Store stock is checked when the batch is purchased.</p>`,
  )}${sampleReviews[item.image] ? fold("Sample review themes", `<p>${sampleReviews[item.image]} These themes are illustrative.</p>`) : ""}${recommended ? `<p class="subtle">You may also like ${button(esc(recommended.title), "product", recommended.id, "text-button")}.</p>` : ""}`;
}

export function accountView(state) {
  const user = person(state);
  if (!user)
    return `${notice("Demo account access · Use sample information. Profiles are stored in this browser.")}<div class="actions">${button("Try the demo account", "demo", "", "button primary")}${button("Create demo profile", "signup")}</div>${form("login", field("Demo email", "email", 'type="email" required maxlength="120" placeholder="you@example.test"', true) + submit("Open saved profile"))}${button("Reset password (demo)", "reset", "", "text-button")}`;
  return `${rows([
    ["Profile", esc(user.name)],
    ["Email", esc(user.email)],
  ])}${form("preferences", area("Default delivery address", "address", user.address, 'maxlength="220"') + check("Opt in to simulated email notifications", "emailOptIn", user.emailOptIn) + submit("Save preferences"))}<div class="actions"><a class="button" href="#orders">My orders</a>${button("Sign out", "signout")}</div>`;
}

export const signupView = () =>
  `${notice("Use a sample name and email address to create a local demo profile.")}${form("signup", field("Name", "name", 'required maxlength="80"', true) + field("Email", "email", 'type="email" required maxlength="120" placeholder="you@example.test"', true) + check("Opt in to simulated email notifications", "emailOptIn") + submit("Create profile"))}`;
export const resetView = () =>
  `${notice("The email step is simulated. Demo profiles open by email in this browser.")}${form("reset", field("Demo email", "email", 'type="email" required maxlength="120"', true) + submit("Simulate reset"))}`;

export function alertsView(state) {
  const user = person(state);
  if (!user)
    return empty(
      "Notifications need a profile",
      "Open the demo account to see order updates.",
      button("Open account", "account", "", "button primary"),
    );
  const alerts = state.alerts[user.id] || [];
  return `${notice(user.emailOptIn ? "In-app notifications · Simulated email is enabled." : "In-app notifications · Simulated email is disabled.")}${alerts.length ? `<ol class="timeline">${alerts.map((entry) => `<li>${esc(entry.message)}<time>${date(entry.at)}</time></li>`).join("")}</ol>` : empty("You’re all caught up", "Updates appear here as your groups and orders progress.")}`;
}

export function checkoutReviewView(item, quote, details, mode) {
  return `${notice("Confirming your details is free. You can leave before paying the deposit.")}${rows(
    [
      ["Product", esc(item.title)],
      [
        "Order type",
        mode === "group" ? "Collective Unlock group" : "Individual pre-order",
      ],
      ["Estimated total", range(quote.estimate)],
      ["Deposit if you proceed", money(quote.deposit)],
      ["Order batch", `${quote.batch.id} · ${shortDate(quote.batch.closes)}`],
    ],
  )}${disclaimer()}${form("review-checkout", `<input type="hidden" name="mode" value="${mode}">` + field(item.category === "Makeup" ? "Shade" : "Size or colour", "variant", `required maxlength="60" value="${esc(details.variant)}"`, true) + area("Delivery address", "address", details.address, 'required maxlength="220" minlength="8"') + submit("Confirm details"), item.id)}`;
}

export function checkoutPaymentView(item, quote, details) {
  return `${notice(testNotice, "test")}${rows([
    ["Product", esc(item.title)],
    [
      "Order type",
      details.mode === "group"
        ? "Collective Unlock group"
        : "Individual pre-order",
    ],
    [
      item.category === "Makeup" ? "Shade" : "Size or colour",
      esc(details.variant),
    ],
    ["Delivery address", esc(details.address)],
    ["Estimated total", range(quote.estimate)],
    ["Deposit · 50% of the estimate midpoint", money(quote.deposit), true],
  ])}${disclaimer()}${form("checkout", check("I accept the prototype terms and cancellation window.", "terms", false, true) + check("I appoint Ordely as my purchasing agent for this sandbox order.", "agent", false, true) + select("Simulate payment result", "result", ["Success", "Failure"], "Success", true) + submit(`Pay ${money(quote.deposit)} in test mode`), item.id)}${button("Edit confirmed details", details.mode === "group" ? "group-checkout" : "checkout", item.id, "text-button")}`;
}

export function orderView(state, order) {
  const cleared = order.actual != null;
  const now = finalTotal(order);
  const details = [
    ["Status", tag(order.status, true)],
    ["Batch", esc(order.batch)],
    ["Courier tracking", esc(order.tracking || "Pending")],
    ["Delivery address", esc(order.address)],
    ["Estimated total", range(order.estimate)],
    ["Deposit", `${money(order.deposit)} · ${esc(order.payment)}`],
  ];
  if (order.mode)
    details.splice(1, 0, [
      "Order type",
      order.mode === "group"
        ? "Collective Unlock group"
        : "Individual pre-order",
    ]);
  if (cleared)
    details.push(
      ["Final price", money(now), true],
      [
        "Remaining balance",
        order.balancePaid != null
          ? "Paid"
          : money(Math.max(0, now - order.deposit)),
      ],
    );
  return `${rows(details)}${disclaimer()}${order.status === "On hold" ? notice(order.history.findLast((entry) => entry.label === "On hold")?.note || "The team is checking this order.") : ""}${cleared ? fold("Final breakdown and estimate comparison", `${rows(names.map((label, index) => [label, money(finalLines(order)[index])]))}<p>Actual customs duty and levies replaced the provisional amount. The ${money(now)} final price ${now >= order.estimate[0] && now <= order.estimate[1] ? "is within" : "falls outside"} the estimated range.</p>`) : ""}<h3>Order timeline</h3><ol class="timeline">${order.history.map((entry) => `<li>${esc(entry.label)}<time>${date(entry.at)}</time>${entry.note ? `<p>${esc(entry.note)}</p>` : ""}</li>`).join("")}</ol><div class="actions">${order.status === "Ready for balance" ? button("Pay balance in test mode", "balance", order.id, "button primary") : ""}${cancellable(state, order) ? button("Cancel pre-order", "cancel", order.id) : ""}</div>`;
}

export const balanceView = (order) =>
  `${notice(testNotice, "test")}${rows([
    ["Final price", money(finalTotal(order))],
    ["Deposit already paid", money(order.deposit)],
    [
      "Balance due",
      money(Math.max(0, finalTotal(order) - order.deposit)),
      true,
    ],
  ])}${form("balance", select("Simulate payment result", "result", ["Success", "Failure"], "Success", true) + submit("Pay balance in test mode"), order.id)}`;
export const cancelView = (order) =>
  `${notice(testNotice, "test")}${notice(`Cancelling before the batch closes returns the full ${money(order.deposit)} deposit in this simulation.`)}${form("cancel", submit("Confirm cancellation"), order.id)}`;

export const helpView = () =>
  `${fold("How does the purchasing agent arrangement work?", "<p>You select the item and appoint Ordely to order it on your behalf. Ordely combines eligible orders into shared shipments and holds no stock.</p>")}${fold("What does my estimate include?", "<p>Item cost, freight, customs duty and levies, VAT and SSCL, our service fee and delivery in Sri Lanka. The estimate uses a buffered exchange rate. The final total uses actual customs charges.</p>")}${fold("When can I cancel?", "<p>Cancel before your batch closes to receive a full refund of your test deposit. Batches close every other Friday at 6 pm Sri Lanka time.</p>")}${fold("When is the balance due?", "<p>Once your order clears customs, the final charges appear under My orders. Pay the remaining amount before local delivery.</p>")}${fold("Prototype terms and contact", "<p>All charges, approvals and orders are simulated. Use sample information for demo forms. For help in this prototype, open the Admin demo and view the relevant order or review.</p>")}`;

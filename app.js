import {
  cancellable,
  canGroupOrder,
  canOrder,
  categories,
  changeOrder,
  checkoutQuote,
  classification,
  currentBatch,
  esc,
  findDuplicate,
  finalTotal,
  identifier,
  isApproved,
  load,
  members,
  money,
  notify,
  person,
  safeURL,
  save,
  shortDate,
} from "./data.js";
import {
  adminDialog,
  adminView,
  manifest,
  submitAdmin,
} from "./admin.js?v=page-routes";
import { identifyPage, legacyHref, siteRoot } from "./routes.mjs";
import {
  accountView,
  alertsView,
  balanceView,
  brandsView,
  cancelView,
  catalogueView,
  checkoutPaymentView,
  checkoutReviewView,
  estimateForm,
  groupFilters,
  groupsView,
  helpView,
  ordersView,
  orderView,
  productView,
  resetView,
  signupView,
  visibleItems,
} from "./customer.js?v=page-routes";
import { button, heading, icon, iconButton, notice } from "./ui.js";

let state = load();
let orderFilters = {};
let pending = null;
let checkoutDraft = null;
let estimateTimer = null;
let toastTimer;
const modal = document.querySelector("#dialog");
const page = document.querySelector("#page-view");
const toast = document.querySelector("#toast");
const currentPage = identifyPage(new URL(location.href));
const params = () => new URL(location.href).searchParams;
const sortOrder = () =>
  params().get("sort") === "price" ? "price" : "featured";

function normalizeOrders() {
  let changed = false;
  for (const order of state.orders) {
    if (order.status === "Deposit received" && Date.now() >= order.closes) {
      changeOrder(state, order, "Batch closed");
      order.history.at(-1).at = order.closes;
      changed = true;
    }
  }
  if (changed) save(state);
}

function render() {
  normalizeOrders();
  const batch = currentBatch(state);
  const user = person(state);
  const unread =
    user && (state.alerts[user.id] || []).some((entry) => !entry.read);
  document.querySelector("#batch-strip").innerHTML =
    `<div class="batch-copy">${icon("calendar")}<span>Batch closes ${shortDate(batch.closes)}<span class="batch-time">, 6 pm LKT</span></span><b class="batch-time">·</b><span class="batch-time">${batch.days} ${batch.days === 1 ? "day" : "days"} left</span></div><a class="strip-unlock" href="./collective-unlock/">Collective Unlock ${icon("up-right")}</a>`;
  document.querySelector("#nav-actions").innerHTML =
    iconButton("Search approved brands", "search", "search") +
    iconButton("Account", "user", "account") +
    iconButton(
      "Notifications",
      "bell",
      "alerts",
      "",
      unread ? '<span class="unread"></span>' : "",
    ) +
    `<a href="./orders/" class="icon-button" aria-label="My orders" title="My orders">${icon("bag")}</a>` +
    iconButton("Menu", "menu", "menu", "mobile-menu");
  document.querySelector(".skip").href = new URL("#main", location.href);
  for (const link of document.querySelectorAll(".main-nav a, .strip-unlock")) {
    const destination = identifyPage(new URL(link.href));
    if (
      destination.id === currentPage.id &&
      destination.category === currentPage.category
    )
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const query = params();
  if (currentPage.id === "orders") page.innerHTML = ordersView(state);
  else if (currentPage.id === "brands") {
    const linkedBrand = state.brands.find(
      ({ name }) =>
        name.toLowerCase().replaceAll(" ", "-") === query.get("brand"),
    );
    page.innerHTML = brandsView(
      state,
      linkedBrand?.name ?? query.get("query") ?? "",
      query.get("category") ?? "",
    );
  } else if (currentPage.id === "admin") {
    page.innerHTML = adminView(
      state,
      query.get("tab") || "overview",
      orderFilters,
    );
  } else if (currentPage.id === "groups") {
    const filter =
      groupFilters.find(([key]) => key === query.get("filter"))?.[0] ?? "all";
    page.innerHTML = groupsView(state, filter);
  } else if (currentPage.id === "shop") {
    page.innerHTML =
      heading(
        "Overseas catalogue",
        currentPage.title,
        "See estimated prices in LKR and choose what to pre-order.",
      ) + catalogueView(state, currentPage.category, sortOrder());
  } else {
    document.querySelector("#catalogue").innerHTML = catalogueView(
      state,
      "All pieces",
      sortOrder(),
      false,
    );
  }
}

function openDialog(title, body, kicker = "", wide = false) {
  modal.classList.toggle("wide", wide);
  modal.innerHTML = `<header class="dialog-head"><div>${kicker ? `<p class="eyebrow">${esc(kicker)}</p>` : ""}<h2 id="dialog-title">${esc(title)}</h2></div>${iconButton("Close dialog", "x", "close")}</header><div class="dialog-body">${body}</div>`;
  if (!modal.open) modal.showModal();
  else
    modal.querySelector('[data-action="close"]').focus({ preventScroll: true });
  modal.scrollTop = 0;
}

function closeDialog() {
  clearTimeout(estimateTimer);
  checkoutDraft = null;
  if (modal.open) modal.close();
}

function message(copy) {
  clearTimeout(toastTimer);
  toast.textContent = copy;
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 4500);
}

function persist() {
  save(state);
  render();
}

function actionError(copy) {
  const body = modal.querySelector(".dialog-body");
  if (!modal.open || !body) {
    message(copy);
    return;
  }
  body.querySelector("[data-action-error]")?.remove();
  const error = document.createElement("p");
  error.className = "notice error";
  error.dataset.actionError = "";
  error.setAttribute("role", "alert");
  error.textContent = copy;
  body.prepend(error);
  modal.scrollTop = 0;
}

function requireProfile(action, id) {
  if (person(state)) return true;
  pending = [action, id];
  openDialog("Open your account", accountView(state), "Continue with Ordely");
  return false;
}

function returnToAction() {
  const next = pending;
  pending = null;
  if (next?.[0] === "estimate-draft") createEstimate(next[1]);
  else if (next) runAction(...next);
  else runAction("account");
}

function toggleInterest(item) {
  const user = person(state);
  const prior = state.interest[item.id] || [];
  const remove = prior.includes(user.id);
  state.interest[item.id] = remove
    ? prior.filter((id) => id !== user.id)
    : [...prior, user.id];
  const justUnlocked = !item.unlocked && members(state, item) >= item.threshold;
  if (justUnlocked) {
    item.unlocked = true;
    for (const id of state.interest[item.id])
      notify(state, id, `${item.title} unlocked. Pre-orders are open.`);
  }
  persist();
  runAction("product", item.id);
  message(
    remove
      ? "You left the group."
      : justUnlocked
        ? "Group unlocked. Group pre-orders are open."
        : "You joined the group for free.",
  );
}

function runAction(action, id = "") {
  const item = state.products.find((entry) => entry.id === id);
  const order = state.orders.find(
    (entry) => entry.id === id && entry.buyer === state.active,
  );
  switch (action) {
    case "close":
      pending = null;
      closeDialog();
      break;
    case "menu":
      openDialog(
        "Menu",
        '<div class="actions"><a class="button" href="./shop/">The Edit</a><a class="button" href="./brands/">Brands</a><a class="button" href="./collective-unlock/">Collective Unlock</a><a class="button" href="./#how">How it works</a><a class="button" href="./orders/">My orders</a></div>',
      );
      break;
    case "search":
      openDialog(
        "Find an approved brand",
        `<form class="form-grid" data-form="search"><label class="full">Brand name <input name="query" type="search" placeholder="Search brands" autofocus></label><div class="full actions"><button class="button primary">Search</button></div></form>`,
      );
      break;
    case "account":
      openDialog("Your account", accountView(state));
      break;
    case "signup":
      openDialog("Create a demo profile", signupView());
      break;
    case "reset":
      openDialog("Password reset", resetView());
      break;
    case "demo":
      state.active = "demo";
      persist();
      returnToAction();
      break;
    case "signout":
      state.active = null;
      pending = null;
      persist();
      runAction("account");
      message("Signed out.");
      break;
    case "alerts": {
      const user = person(state);
      if (user) {
        for (const alert of state.alerts[user.id] || []) alert.read = true;
        persist();
      }
      openDialog("Notifications", alertsView(state));
      break;
    }
    case "help":
      openDialog("Help and terms", helpView());
      break;
    case "sort":
      openDialog(
        "Sort the edit",
        `<div class="actions">${[
          ["featured", "Featured"],
          ["price", "Lowest estimate"],
        ]
          .map(([key, label]) =>
            button(
              label,
              "sort-set",
              key,
              key === sortOrder() ? "button primary" : "button",
            ),
          )
          .join("")}</div>`,
      );
      break;
    case "sort-set": {
      const url = new URL(location.href);
      if (id === "price") url.searchParams.set("sort", id);
      else url.searchParams.delete("sort");
      history.replaceState(null, "", url);
      closeDialog();
      render();
      document
        .querySelector('[data-action="sort"]')
        ?.focus({ preventScroll: true });
      break;
    }
    case "estimate":
      openDialog(
        "Get an estimate",
        notice(
          "Use sample product details. The tariff and costs are simulated.",
        ) + estimateForm(state, id),
        "Landed cost in LKR",
      );
      break;
    case "product":
      if (
        item &&
        (visibleItems(state).includes(item) || item.owner === state.active)
      )
        openDialog(item.title, productView(state, item), item.brand, true);
      else actionError("This piece is no longer in the catalogue.");
      break;
    case "interest":
      if (!item || !isApproved(state, item) || item.review === "Rejected") {
        actionError("This group is currently unavailable.");
        break;
      }
      if (requireProfile(action, id)) toggleInterest(item);
      break;
    case "checkout":
    case "group-checkout": {
      if (!item || !canOrder(state, item)) {
        actionError("Pre-orders are currently closed for this piece.");
        break;
      }
      if (requireProfile(action, id)) {
        const mode = action === "group-checkout" ? "group" : "individual";
        if (mode === "group" && !canGroupOrder(state, item)) {
          actionError("Join the unlocked group to place a group pre-order.");
          break;
        }
        const draft =
          checkoutDraft?.itemId === id &&
          checkoutDraft.buyer === state.active &&
          checkoutDraft.mode === mode
            ? checkoutDraft
            : { variant: item.variant, address: person(state).address };
        openDialog(
          "Review your pre-order",
          checkoutReviewView(
            item,
            checkoutQuote(state, item, mode),
            draft,
            mode,
          ),
          item.brand,
        );
      }
      break;
    }
    case "order":
      if (order)
        openDialog(order.item.title, orderView(state, order), order.id);
      break;
    case "balance":
      if (order?.status === "Ready for balance")
        openDialog("Pay the balance", balanceView(order), order.id);
      break;
    case "cancel":
      if (order && cancellable(state, order))
        openDialog("Cancel pre-order", cancelView(order), order.id);
      break;
    case "admin-manifest":
      manifest(state, id);
      break;
    default: {
      if (!action.startsWith("admin-") || currentPage.id !== "admin") break;
      const details = adminDialog(state, action, id);
      if (details) openDialog(details[0], details[1], "Admin demo", details[2]);
    }
  }
}

function formMessage(form, copy) {
  const error = form.querySelector("[data-error]");
  if (!error) {
    actionError(copy);
    return;
  }
  error.textContent = copy;
  error.hidden = false;
  error.scrollIntoView({ block: "nearest" });
}

function createEstimate(data) {
  if (data.url && !safeURL(data.url))
    throw Error("Enter an HTTP or HTTPS product link.");
  if (
    !["USD", "GBP", "EUR"].includes(data.currency) ||
    !categories.includes(data.category)
  )
    throw Error("Choose a supported category and currency.");
  if (
    !data.title ||
    !data.material ||
    !data.description ||
    !data.variant ||
    !isApproved(state, data)
  )
    throw Error(
      "Add a title, description, material and variant for an approved brand.",
    );
  const previous = findDuplicate(
    state.products.filter(
      (item) =>
        item.review !== "Rejected" &&
        (item.confidence !== "Low" || item.owner === state.active),
    ),
    data,
  );
  if (previous) {
    openDialog(
      "This piece already has a group",
      `${notice(`${previous.title} already has ${members(state, previous)} of ${previous.threshold} interested.`)}<div class="actions">${button("View existing group", "product", previous.id, "button primary")}${button("Back to estimates", "estimate", data.brand)}</div>`,
    );
    return;
  }
  if (!requireProfile("estimate", data.brand)) {
    pending = ["estimate-draft", data];
    return;
  }
  const classified = classification(data);
  const item = {
    ...data,
    price: Number(data.price),
    quantity: Number(data.quantity),
    weight: Number(data.weight) || null,
    owner: state.active,
    id: identifier("ITEM"),
    interested: 0,
    threshold: 5,
    popularity: "Slow",
    ...classified,
  };
  openDialog(
    "Calculating your estimate",
    '<p role="status">Checking the category and estimating your share of shipping…</p><div class="loading-bar" aria-hidden="true"></div>',
  );
  estimateTimer = setTimeout(() => {
    try {
      state = load();
      if (!isApproved(state, item) || state.active !== item.owner) {
        actionError(
          "The profile or brand changed while the estimate was running.",
        );
        return;
      }
      const match = findDuplicate(
        state.products.filter(
          (entry) =>
            entry.review !== "Rejected" &&
            (entry.confidence !== "Low" || entry.owner === state.active),
        ),
        item,
      );
      if (match) {
        runAction("product", match.id);
        return;
      }
      state.products.push(item);
      if (item.confidence === "Low")
        notify(
          state,
          item.owner,
          `${item.title} was sent for classification review.`,
        );
      persist();
      runAction("product", item.id);
    } catch (error) {
      actionError(error.message);
    }
  }, 1300);
}

function confirmCheckout(id, data) {
  const user = person(state);
  const item = state.products.find((entry) => entry.id === id);
  if (!user || !item || !canOrder(state, item))
    throw Error("This piece can no longer be pre-ordered.");
  if (data.address.length < 8 || !data.variant)
    throw Error("Enter your delivery address and chosen variant.");
  const mode = data.mode === "group" ? "group" : "individual";
  if (mode === "group" && !canGroupOrder(state, item))
    throw Error("Join the unlocked group to place a group pre-order.");
  const quote = checkoutQuote(state, item, mode);
  checkoutDraft = {
    itemId: id,
    buyer: user.id,
    address: data.address,
    variant: data.variant,
    mode,
    quote,
  };
  openDialog(
    "Place your pre-order",
    checkoutPaymentView(item, quote, checkoutDraft),
    "Details confirmed",
  );
}

function payments(action, id, data) {
  const user = person(state);
  if (!user) throw Error("Open your profile to continue.");
  if (action === "checkout") {
    const item = state.products.find((entry) => entry.id === id);
    if (!item || !canOrder(state, item))
      throw Error("This piece can no longer be pre-ordered.");
    const draft = checkoutDraft;
    if (!draft || draft.itemId !== id || draft.buyer !== user.id)
      throw Error("Review and confirm your details before paying the deposit.");
    if (draft.mode === "group" && !canGroupOrder(state, item))
      throw Error(
        "This group pre-order is no longer available. You can still pre-order individually.",
      );
    const quote = checkoutQuote(state, item, draft.mode);
    if (
      quote.batch.id !== draft.quote.batch.id ||
      quote.estimate.some(
        (amount, index) => amount !== draft.quote.estimate[index],
      )
    ) {
      runAction(draft.mode === "group" ? "group-checkout" : "checkout", id);
      actionError(
        "The batch or estimate changed. Review your details again before paying.",
      );
      return;
    }
    if (data.result === "Failure")
      throw Error(
        "The test payment was declined. Choose Success to try again.",
      );
    if (!data.agent || !data.terms)
      throw Error("Accept the prototype terms and agent appointment.");
    const order = {
      id: identifier("ORD"),
      buyer: user.id,
      item: { ...item, variant: draft.variant },
      estimate: quote.estimate,
      lines: quote.lines,
      deposit: quote.deposit,
      mode: draft.mode,
      batch: quote.batch.id,
      closes: quote.batch.closes,
      status: "Deposit received",
      history: [{ label: "Deposit received", at: Date.now() }],
      address: draft.address,
      payment: "Deposit paid (sandbox)",
      actual: null,
    };
    state.orders.push(order);
    checkoutDraft = null;
    notify(state, user.id, `${order.id} · Deposit received in test mode.`);
    persist();
    runAction("order", order.id);
    message(`Test deposit of ${money(order.deposit)} received.`);
    return;
  }
  const order = state.orders.find(
    (entry) => entry.id === id && entry.buyer === user.id,
  );
  if (!order) throw Error("This order is unavailable.");
  if (action === "balance") {
    if (order.status !== "Ready for balance" || order.actual == null)
      throw Error("The order must clear customs before the balance is due.");
    if (data.result === "Failure")
      throw Error(
        "The test payment was declined. Choose Success to try again.",
      );
    order.balancePaid = Math.max(0, finalTotal(order) - order.deposit);
    changeOrder(
      state,
      order,
      "Balance paid",
      "The test balance payment was received.",
    );
  } else {
    if (!cancellable(state, order))
      throw Error("Cancellation is closed for this batch.");
    order.payment = "Deposit refunded (sandbox)";
    changeOrder(
      state,
      order,
      "Cancelled",
      "The full deposit was refunded in test mode.",
    );
  }
  persist();
  runAction("order", id);
}

function submitForm(action, id, data) {
  if (action === "brand-filter" || action === "search") {
    const destination = new URL("brands/", siteRoot);
    if (data.query) destination.searchParams.set("query", data.query);
    if (data.category) destination.searchParams.set("category", data.category);
    closeDialog();
    if (location.href === destination.href) render();
    else location.assign(destination.href);
  } else if (action === "login" || action === "signup") {
    if (action === "signup" && !data.name) throw Error("Enter a demo name.");
    const existing = state.people.find(
      (entry) => entry.email === data.email.toLowerCase(),
    );
    if (action === "login" && !existing)
      throw Error("No saved profile uses that email in this browser.");
    if (action === "signup" && existing)
      throw Error(
        "That demo email is already in use. Open the saved profile instead.",
      );
    const user = existing || {
      id: identifier("USER"),
      name: data.name,
      email: data.email.toLowerCase(),
      address: "",
      emailOptIn: !!data.emailOptIn,
    };
    if (!existing) state.people.push(user);
    state.active = user.id;
    persist();
    returnToAction();
  } else if (action === "preferences") {
    const user = person(state);
    if (!user) throw Error("Your demo profile is closed.");
    user.address = data.address;
    user.emailOptIn = !!data.emailOptIn;
    persist();
    runAction("account");
    message("Preferences saved.");
  } else if (action === "reset") {
    openDialog(
      "Reset simulated",
      notice(
        "No email was sent. You can open a saved demo profile using its email address.",
      ) + button("Back to account", "account"),
    );
  } else if (action === "estimate") createEstimate(data);
  else if (action === "review-checkout") confirmCheckout(id, data);
  else if (["checkout", "balance", "cancel"].includes(action))
    payments(action, id, data);
  else if (action === "admin-filter") {
    orderFilters = data;
    render();
  } else if (action.startsWith("admin-") && currentPage.id === "admin") {
    const next = submitAdmin(state, action, id, data);
    persist();
    if (next) runAction(...next);
    else closeDialog();
    message("Admin change recorded.");
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("dialog a[href]");
  if (
    link &&
    modal.open &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    pending = null;
    closeDialog();
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;
  state = load();
  try {
    runAction(target.dataset.action, target.dataset.id);
  } catch (error) {
    actionError(error.message);
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  state = load();
  const data = Object.fromEntries(
    [...new FormData(form)].map(([key, value]) => [key, value.trim()]),
  );
  try {
    submitForm(form.dataset.form, form.dataset.id, data);
  } catch (error) {
    formMessage(form, error.message);
  }
});

modal.addEventListener("cancel", () => {
  clearTimeout(estimateTimer);
  pending = null;
  checkoutDraft = null;
});
modal.addEventListener("click", (event) => {
  if (event.target !== modal) return;
  const rect = modal.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    pending = null;
    closeDialog();
  }
});
function redirectLegacyLink() {
  const destination = currentPage.id === "home" && legacyHref(location.hash);
  if (!destination) return false;
  location.replace(new URL(destination, siteRoot));
  return true;
}
window.addEventListener("hashchange", redirectLegacyLink);
window.addEventListener("storage", () => {
  state = load();
  render();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    state = load();
    render();
  }
});
if (!redirectLegacyLink()) {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon);
  });
  render();
  const anchor = document.getElementById(location.hash.slice(1));
  if (anchor) requestAnimationFrame(() => anchor.scrollIntoView());
}

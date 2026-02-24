/* ═══════════════════════════════════════════════════════════════════
   Quest Campus Lost & Found — Client Application
   ─────────────────────────────────────────────────────────────────
   Student side:  Report Lost, Report Found, View Items
   Admin side:    Login → Manage Items (update status, delete)
   ═══════════════════════════════════════════════════════════════════ */

// ── DOM References ──────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Navigation
const navTabs = $$(".nav-tab");
const tabContents = $$(".tab-content");

// Header
const adminToggleBtn = $("#admin-toggle");
const adminBadge = $("#admin-badge");
const logoutBtn = $("#logout-btn");
const tabAdminLogin = $("#tab-admin-login");
const tabAdminManage = $("#tab-admin-manage");

// Report Lost Form
const reportLostForm = $("#report-lost-form");
const lostFeedback = $("#lost-feedback");
const sqlWarningLost = $("#sql-warning-lost");

// Report Found Form
const reportFoundForm = $("#report-found-form");
const foundFeedback = $("#found-feedback");
const sqlWarningFound = $("#sql-warning-found");

// View Items
const searchInput = $("#searchInput");
const statusFilter = $("#statusFilter");
const refreshBtn = $("#refresh-btn");
const boardFeedback = $("#board-feedback");
const lostList = $("#lost-list");
const foundList = $("#found-list");
const statTotal = $("#stat-total");
const statPending = $("#stat-pending");
const statClaimed = $("#stat-claimed");

// Admin Login
const adminLoginForm = $("#admin-login-form");
const loginFeedback = $("#login-feedback");
const sqlWarningLogin = $("#sql-warning-login");

// Admin Manage
const adminSearchInput = $("#adminSearchInput");
const adminCategoryFilter = $("#adminCategoryFilter");
const adminStatusFilter = $("#adminStatusFilter");
const adminRefreshBtn = $("#admin-refresh-btn");
const adminTableBody = $("#admin-table-body");

// Dialogs
const detailDialog = $("#detail-dialog");
const dialogContent = $("#dialog-content");
const dialogClose = $("#dialog-close");
const confirmDialog = $("#confirm-dialog");
const confirmIcon = $("#confirm-icon");
const confirmTitle = $("#confirm-title");
const confirmMessage = $("#confirm-message");
const confirmCancel = $("#confirm-cancel");
const confirmOk = $("#confirm-ok");

// Toast
const toastRegion = $("#toast-region");

// ── State ───────────────────────────────────────────────────────
let itemsCache = [];
let adminToken = sessionStorage.getItem("adminToken") || null;
let searchDebounce = null;
let adminSearchDebounce = null;
let confirmCallback = null;

// ── SQL Injection Detection (Client-Side) ───────────────────────
const SQL_INJECTION_PATTERNS = [
  /(\b(OR|AND)\b\s+[\w'"]+\s*[=<>!]+\s*[\w'"]+)/i,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(--|\/\*|#)/,
  /(\bUNION\b[\s\S]*\bSELECT\b)/i,
  /(;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
  /(\b(SLEEP|BENCHMARK|WAITFOR)\s*\()/i,
  /('\s*=\s*'|"\s*=\s*")/,
  /(\bSELECT\b[\s\S]*\bFROM\b)/i,
  /(\b(DROP|ALTER|TRUNCATE)\s+(TABLE|DATABASE)\b)/i,
  /(\bEXEC\s*\()/i,
  /(0x[0-9a-fA-F]+)/,
  /(\bCHAR\s*\(\s*\d+)/i,
  /(\bCONCAT\s*\()/i,
  /(\bINFORMATION_SCHEMA\b)/i,
  /(\bORDERS?\s*--)/i,
];

function containsSqlInjection(value) {
  if (typeof value !== "string") return false;
  return SQL_INJECTION_PATTERNS.some((p) => p.test(value));
}

function checkFormForSqlInjection(formData) {
  for (const [key, value] of Object.entries(formData)) {
    if (key === "category" || key === "itemDate") continue;
    if (containsSqlInjection(value)) {
      return true;
    }
  }
  return false;
}

// ── Utility ─────────────────────────────────────────────────────
function sanitize(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim();
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function truncate(text, limit = 100) {
  return text.length <= limit ? text : text.slice(0, limit - 1) + "...";
}

function showToast(message, type = "success") {
  const toast = document.createElement("p");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastRegion.prepend(toast);
  setTimeout(() => toast.remove(), 3500);
}

function setFeedback(el, message, type = "") {
  el.textContent = message;
  el.className = "feedback";
  if (type) el.classList.add(type);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Unexpected request error.");
  }
  return data;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  };
}

// ── Tab Navigation ──────────────────────────────────────────────
function switchTab(tabName) {
  navTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  tabContents.forEach((content) => {
    content.classList.toggle(
      "active",
      content.id === `tab-content-${tabName}`
    );
  });

  // Load data when switching to relevant tabs
  if (tabName === "view-items") loadItems();
  if (tabName === "admin-manage" && adminToken) loadAdminItems();
}

navTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

// ── Admin Auth State ────────────────────────────────────────────
function updateAdminUI() {
  const isLoggedIn = !!adminToken;

  adminToggleBtn.classList.toggle("active", isLoggedIn);
  adminBadge.classList.toggle("hidden", !isLoggedIn);
  logoutBtn.classList.toggle("hidden", !isLoggedIn);
  adminToggleBtn.classList.toggle("hidden", isLoggedIn);

  tabAdminLogin.classList.toggle("hidden", isLoggedIn);
  tabAdminManage.classList.toggle("hidden", !isLoggedIn);
}

adminToggleBtn.addEventListener("click", () => {
  if (adminToken) {
    switchTab("admin-manage");
  } else {
    tabAdminLogin.classList.remove("hidden");
    switchTab("admin-login");
  }
});

logoutBtn.addEventListener("click", () => {
  adminToken = null;
  sessionStorage.removeItem("adminToken");
  updateAdminUI();
  switchTab("view-items");
  showToast("Logged out successfully.");
});

// ── Confirm Dialog ──────────────────────────────────────────────
function showConfirm(icon, title, message, okLabel, okClass) {
  return new Promise((resolve) => {
    confirmIcon.textContent = icon;
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOk.textContent = okLabel || "Confirm";
    confirmOk.className = `btn ${okClass || "btn-danger"}`;

    confirmCallback = resolve;
    confirmDialog.showModal();
  });
}

confirmCancel.addEventListener("click", () => {
  confirmDialog.close();
  if (confirmCallback) confirmCallback(false);
  confirmCallback = null;
});

confirmOk.addEventListener("click", () => {
  confirmDialog.close();
  if (confirmCallback) confirmCallback(true);
  confirmCallback = null;
});

confirmDialog.addEventListener("close", () => {
  if (confirmCallback) confirmCallback(false);
  confirmCallback = null;
});

// ── Form Validation ─────────────────────────────────────────────
function validateReportForm(data) {
  if (!data.title || !data.description || !data.location || !data.contactInfo) {
    return "All fields are required.";
  }
  if (data.title.length > 100) return "Title must not exceed 100 characters.";
  if (data.description.length > 1000)
    return "Description must not exceed 1000 characters.";
  if (data.location.length > 120)
    return "Location must not exceed 120 characters.";
  if (!/^[^<>]{3,120}$/.test(data.contactInfo))
    return "Contact information contains invalid characters.";
  if (!data.itemDate) return "Date is required.";
  return "";
}

// ── Report Form Submission (shared logic) ───────────────────────
async function handleReportSubmit(form, category, feedbackEl, warningEl) {
  const payload = {
    title: sanitize(form.title.value),
    description: sanitize(form.description.value),
    category: category,
    location: sanitize(form.location.value),
    itemDate: form.itemDate.value,
    contactInfo: sanitize(form.contactInfo.value),
  };

  // Client-side SQL injection check
  if (checkFormForSqlInjection(payload)) {
    warningEl.classList.add("visible");
    setFeedback(
      feedbackEl,
      "Submission rejected: potentially dangerous content detected.",
      "error"
    );
    showToast(
      "SQL injection patterns detected. Submission blocked.",
      "error"
    );
    return;
  }
  warningEl.classList.remove("visible");

  const error = validateReportForm(payload);
  if (error) {
    setFeedback(feedbackEl, error, "error");
    return;
  }

  try {
    await fetchJson("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    form.reset();
    form.itemDate.value = new Date().toISOString().slice(0, 10);
    setFeedback(feedbackEl, "Report submitted successfully!", "success");
    showToast("Report submitted successfully!");
  } catch (err) {
    setFeedback(feedbackEl, err.message, "error");
    showToast(err.message, "error");
  }
}

reportLostForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleReportSubmit(reportLostForm, "lost", lostFeedback, sqlWarningLost);
});

reportFoundForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleReportSubmit(
    reportFoundForm,
    "found",
    foundFeedback,
    sqlWarningFound
  );
});

// ── Admin Login ─────────────────────────────────────────────────
adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = sanitize(adminLoginForm.username.value);
  const password = adminLoginForm.password.value;

  // SQL injection check on username
  if (containsSqlInjection(username)) {
    sqlWarningLogin.classList.add("visible");
    setFeedback(loginFeedback, "Login rejected: dangerous input detected.", "error");
    return;
  }
  sqlWarningLogin.classList.remove("visible");

  if (!username || !password) {
    setFeedback(loginFeedback, "Username and password are required.", "error");
    return;
  }

  try {
    const data = await fetchJson("/api/items/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    adminToken = data.token;
    sessionStorage.setItem("adminToken", adminToken);
    updateAdminUI();
    adminLoginForm.reset();
    setFeedback(loginFeedback, "", "");
    showToast("Login successful! Welcome, Admin.");
    switchTab("admin-manage");
  } catch (err) {
    setFeedback(loginFeedback, err.message, "error");
    showToast(err.message, "error");
  }
});

// ── Load Items (Student View) ───────────────────────────────────
async function loadItems() {
  lostList.innerHTML = "";
  foundList.innerHTML = "";

  for (let i = 0; i < 2; i++) {
    lostList.append(createSkeleton());
    foundList.append(createSkeleton());
  }

  try {
    const data = await fetchJson("/api/items");
    itemsCache = data.items || [];
    applyFiltersAndRender();
  } catch (err) {
    lostList.innerHTML = "";
    foundList.innerHTML = "";
    lostList.append(createEmpty("Failed to load items."));
    foundList.append(createEmpty("Failed to load items."));
    showToast(err.message, "error");
  }
}

function applyFiltersAndRender() {
  const selectedStatus = statusFilter.value;
  const query = normalizeText(searchInput.value);

  const filtered = itemsCache.filter((item) => {
    if (selectedStatus && item.status !== selectedStatus) return false;
    if (!query) return true;
    return [item.title, item.description, item.location, item.contactInfo]
      .map(normalizeText)
      .join(" ")
      .includes(query);
  });

  // Stats
  const total = filtered.length;
  const pending = filtered.filter((i) => i.status === "pending").length;
  const claimed = filtered.filter((i) => i.status === "claimed").length;
  statTotal.textContent = total;
  statPending.textContent = pending;
  statClaimed.textContent = claimed;

  const lost = filtered.filter((i) => i.category === "lost");
  const found = filtered.filter((i) => i.category === "found");

  renderStudentList(lostList, lost, "No lost items found.");
  renderStudentList(foundList, found, "No found items found.");
  boardFeedback.textContent = `Showing ${filtered.length} report(s).`;
}

function renderStudentList(container, items, emptyMsg) {
  container.innerHTML = "";
  if (!items.length) {
    container.append(createEmpty(emptyMsg));
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";

    const h4 = document.createElement("h4");
    h4.textContent = item.title;
    card.append(h4);

    const desc = document.createElement("p");
    desc.className = "item-meta";
    desc.textContent = truncate(item.description);
    card.append(desc);

    card.append(createMeta("Location", item.location));
    card.append(createMeta("Date", item.itemDate));
    card.append(createMeta("Contact", item.contactInfo));

    const badge = document.createElement("span");
    badge.className = `status-badge status-${item.status}`;
    badge.textContent = item.status;
    card.append(badge);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const viewBtn = document.createElement("button");
    viewBtn.className = "btn btn-outline btn-sm";
    viewBtn.textContent = "View Details";
    viewBtn.addEventListener("click", () => showItemDetails(item.id));
    actions.append(viewBtn);

    card.append(actions);
    container.append(card);
  });
}

// ── Admin Manage Items ──────────────────────────────────────────
async function loadAdminItems() {
  adminTableBody.innerHTML =
    '<tr><td colspan="8" style="text-align:center;padding:1.5rem;">Loading...</td></tr>';

  try {
    const data = await fetchJson("/api/items");
    itemsCache = data.items || [];
    renderAdminTable();
  } catch (err) {
    adminTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--danger);">Error: ${err.message}</td></tr>`;
    showToast(err.message, "error");
  }
}

function renderAdminTable() {
  const query = normalizeText(adminSearchInput.value);
  const catFilter = adminCategoryFilter.value;
  const statusF = adminStatusFilter.value;

  const filtered = itemsCache.filter((item) => {
    if (catFilter && item.category !== catFilter) return false;
    if (statusF && item.status !== statusF) return false;
    if (!query) return true;
    return [item.title, item.description, item.location, item.contactInfo]
      .map(normalizeText)
      .join(" ")
      .includes(query);
  });

  adminTableBody.innerHTML = "";

  if (!filtered.length) {
    adminTableBody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No items found.</td></tr>';
    return;
  }

  filtered.forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.id}</td>
      <td><strong>${escapeHtml(item.title)}</strong></td>
      <td><span style="text-transform:capitalize">${item.category}</span></td>
      <td>${escapeHtml(item.location)}</td>
      <td>${item.itemDate}</td>
      <td>${escapeHtml(item.contactInfo)}</td>
      <td><span class="status-badge status-${item.status}">${item.status}</span></td>
    `;

    const actionsTd = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "actions-cell";

    // Status select
    const sel = document.createElement("select");
    sel.setAttribute("aria-label", `Update status for ${item.title}`);
    ["pending", "claimed", "resolved"].forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      opt.selected = s === item.status;
      sel.append(opt);
    });

    const updateBtn = document.createElement("button");
    updateBtn.className = "btn btn-primary btn-sm";
    updateBtn.textContent = "Update";
    updateBtn.addEventListener("click", () =>
      handleStatusUpdate(item, sel.value)
    );

    const viewBtn = document.createElement("button");
    viewBtn.className = "btn btn-outline btn-sm";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => showItemDetails(item.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger btn-sm";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => handleDelete(item));

    actionsDiv.append(sel, updateBtn, viewBtn, deleteBtn);
    actionsTd.append(actionsDiv);
    tr.append(actionsTd);
    adminTableBody.append(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── Status Update Handler ───────────────────────────────────────
async function handleStatusUpdate(item, newStatus) {
  if (newStatus === item.status) {
    showToast("Status is already set to " + newStatus + ".", "warning");
    return;
  }

  // RESOLVED → confirm deletion
  if (newStatus === "resolved") {
    const confirmed = await showConfirm(
      "\u26A0\uFE0F",
      "Resolve & Delete Item",
      `Setting status to "Resolved" will permanently delete "${item.title}" from the system. This action cannot be undone.`,
      "Yes, Resolve & Delete",
      "btn-danger"
    );
    if (!confirmed) return;
  }

  // CLAIMED → inform about category move
  if (newStatus === "claimed" && item.category === "lost") {
    const confirmed = await showConfirm(
      "\u1F4E6",
      "Mark as Claimed",
      `Setting status to "Claimed" will move "${item.title}" from Lost Items to Found Items. Proceed?`,
      "Yes, Mark Claimed",
      "btn-primary"
    );
    if (!confirmed) return;
  }

  try {
    const data = await fetchJson(`/api/items/${item.id}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });

    if (data.action === "deleted") {
      showToast(
        `"${item.title}" has been resolved and removed from the system.`,
        "success"
      );
    } else if (data.action === "claimed") {
      showToast(data.message, "success");
    } else {
      showToast("Status updated successfully.", "success");
    }

    await loadAdminItems();
  } catch (err) {
    if (err.message.includes("Authentication") || err.message.includes("token")) {
      adminToken = null;
      sessionStorage.removeItem("adminToken");
      updateAdminUI();
      switchTab("admin-login");
      showToast("Session expired. Please log in again.", "error");
    } else {
      showToast(err.message, "error");
    }
  }
}

// ── Delete Handler ──────────────────────────────────────────────
async function handleDelete(item) {
  const confirmed = await showConfirm(
    "\u{1F5D1}",
    "Delete Item Report",
    `Are you sure you want to permanently delete "${item.title}"? This action cannot be undone.`,
    "Yes, Delete",
    "btn-danger"
  );
  if (!confirmed) return;

  try {
    await fetchJson(`/api/items/${item.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    showToast("Report deleted successfully.", "success");
    await loadAdminItems();
  } catch (err) {
    if (err.message.includes("Authentication") || err.message.includes("token")) {
      adminToken = null;
      sessionStorage.removeItem("adminToken");
      updateAdminUI();
      switchTab("admin-login");
      showToast("Session expired. Please log in again.", "error");
    } else {
      showToast(err.message, "error");
    }
  }
}

// ── View Item Details ───────────────────────────────────────────
async function showItemDetails(id) {
  try {
    const data = await fetchJson(`/api/items/${id}`);
    const item = data.item;
    dialogContent.innerHTML = "";

    const fields = [
      ["Title", item.title],
      ["Description", item.description],
      ["Category", item.category],
      ["Location", item.location],
      ["Date", item.itemDate],
      ["Contact", item.contactInfo],
      ["Status", item.status],
      ["Created", item.createdAt],
      ["Updated", item.updatedAt],
    ];

    fields.forEach(([key, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = key;
      const dd = document.createElement("dd");
      dd.textContent = value || "-";
      dialogContent.append(dt, dd);
    });

    detailDialog.showModal();
  } catch (err) {
    showToast(err.message, "error");
  }
}

dialogClose.addEventListener("click", () => detailDialog.close());

// ── Helper elements ─────────────────────────────────────────────
function createMeta(label, value) {
  const p = document.createElement("p");
  p.className = "item-meta";
  p.textContent = `${label}: ${value}`;
  return p;
}

function createEmpty(msg) {
  const p = document.createElement("p");
  p.className = "empty-note";
  p.textContent = msg;
  return p;
}

function createSkeleton() {
  const div = document.createElement("div");
  div.className = "skeleton-card";
  return div;
}

// ── Event Listeners ─────────────────────────────────────────────
// Student View filters
refreshBtn.addEventListener("click", loadItems);
statusFilter.addEventListener("change", () =>
  applyFiltersAndRender()
);
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(applyFiltersAndRender, 150);
});

// Admin filters
adminRefreshBtn.addEventListener("click", loadAdminItems);
adminCategoryFilter.addEventListener("change", renderAdminTable);
adminStatusFilter.addEventListener("change", renderAdminTable);
adminSearchInput.addEventListener("input", () => {
  clearTimeout(adminSearchDebounce);
  adminSearchDebounce = setTimeout(renderAdminTable, 150);
});

// ── Initialization ──────────────────────────────────────────────
(function init() {
  // Set default dates
  const today = new Date().toISOString().slice(0, 10);
  const lostDate = $("#lost-date");
  const foundDate = $("#found-date");
  if (lostDate) lostDate.value = today;
  if (foundDate) foundDate.value = today;

  // Restore admin session if token exists
  if (adminToken) {
    // Verify token is still valid
    fetchJson("/api/items/auth/verify", {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then(() => {
        updateAdminUI();
      })
      .catch(() => {
        adminToken = null;
        sessionStorage.removeItem("adminToken");
        updateAdminUI();
      });
  } else {
    updateAdminUI();
  }

  // Start on Report Lost tab
  switchTab("report-lost");
})();

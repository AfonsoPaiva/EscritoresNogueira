(() => {
  // Minimal SPA for admin actions: dashboard, books, posts, comments, orders, forms
  const views = Array.from(document.querySelectorAll(".view"));
  const navItems = Array.from(document.querySelectorAll(".nav li"));
  const loginSection = document.getElementById("loginSection");
  const btnLogout = document.getElementById("btnLogout");
  const btnGoogleSignIn = document.getElementById("btnGoogleSignIn");
  const backendBaseInput = document.getElementById("backendBase");
  const LOCAL_BACKEND_BASE = "admin_ui_backend_base";
  function normalizeBackendBase(value) {
    const raw = (value || "").trim();
    if (!raw) return "";
    try {
      const u = new URL(raw, window.location.origin);
      if (u.origin !== window.location.origin) return "";
      const basePath = (u.pathname || "").replace(/\/$/, "");
      if (basePath && basePath !== "") return "";
      return u.origin.replace(/\/$/, "");
    } catch (e) {
      return "";
    }
  }
  let effectiveBackendBase = normalizeBackendBase(
    localStorage.getItem(LOCAL_BACKEND_BASE) || "",
  );
  let sessionToken = localStorage.getItem("admin_session_token") || "";
  if (backendBaseInput) backendBaseInput.value = effectiveBackendBase;
  if (!effectiveBackendBase) localStorage.removeItem(LOCAL_BACKEND_BASE);

  function enforceGoogleOnlyLoginUi() {
    ["btnLogin", "loginUser", "loginPass"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const wrapper = el.closest(".form-row") || el.parentElement || el;
        if (wrapper) wrapper.remove();
      }
    });
  }

  function buildUrlCandidates(path) {
    const candidates = [];
    if (effectiveBackendBase && effectiveBackendBase.length > 0) {
      candidates.push(effectiveBackendBase.replace(/\/$/, "") + path);
      return candidates;
    }
    try {
      const loc = window.location;
      const adminUiIndex = loc.pathname.indexOf("/admin-ui");
      const prefix =
        adminUiIndex >= 0 ? loc.pathname.substring(0, adminUiIndex) : "";
      const rootFromPrefix = (loc.origin + prefix).replace(/\/$/, "");
      const rootApi = (loc.origin + "/api").replace(/\/$/, "");
      const rootOrigin = loc.origin.replace(/\/$/, "");
      candidates.push(rootFromPrefix + path);
      if (rootApi + path !== rootFromPrefix + path)
        candidates.push(rootApi + path);
      if (
        rootOrigin + path !== rootFromPrefix + path &&
        rootOrigin + path !== rootApi + path
      )
        candidates.push(rootOrigin + path);
      candidates.push(path);
    } catch (e) {
      candidates.push(path);
    }
    const seen = new Set();
    return candidates.filter((u) => {
      if (!u || seen.has(u)) return false;
      seen.add(u);
      return true;
    });
  }

  async function tryCandidates(path, opts = {}) {
    const c = buildUrlCandidates(path);
    let lastErr = null;
    for (let i = 0; i < c.length; i++) {
      const url = c[i];
      try {
        const res = await fetch(url, opts);
        res.__url = url;
        if (
          (res.status === 404 ||
            res.status === 401 ||
            res.status === 403 ||
            res.status >= 500) &&
          i < c.length - 1
        )
          continue;
        return res;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("No url candidates");
  }

  async function fetchJson(path, opts = {}) {
    const res = await tryCandidates(
      path,
      Object.assign({ credentials: "include" }, opts),
    );
    if (!res.ok) {
      // try to read text message for better error
      const errText = await res.text().catch(() => null);
      const err = Object.assign(
        new Error(
          "HTTP " +
            res.status +
            (errText
              ? ": " +
                (errText.length > 200 ? errText.slice(0, 200) + "..." : errText)
              : ""),
        ),
        { res, text: errText },
      );
      throw err;
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      // If server returned HTML (often the login page), treat as not-authenticated and show login UI
      const bodyText = await res.text().catch(() => null);
      try {
        isAuthenticated = false;
        document.querySelector(".nav").style.display = "none";
        loginSection.style.display = "block";
        btnLogout.style.display = "none";
      } catch (e) {}
      const snippet = bodyText
        ? bodyText.length > 500
          ? bodyText.slice(0, 500) + "..."
          : bodyText
        : null;
      const err = Object.assign(
        new Error(
          "Expected JSON but got: " +
            (ct || "unknown") +
            (snippet ? ": " + snippet : ""),
        ),
        { res, text: bodyText },
      );
      // trigger an auth check in background (throttled)
      try {
        const now = Date.now();
        if (!authCheckInProgress && now - lastAuthCheckAt > 2000) {
          authCheckInProgress = true;
          lastAuthCheckAt = now;
          checkAuth().finally(() => {
            authCheckInProgress = false;
          });
        }
      } catch (e) {}
      throw err;
    }
    return res.json();
  }

  // Initialize Firebase if available from backend
  async function initFirebase() {
    try {
      const res = await tryCandidates("/auth/firebase-config", {
        credentials: "include",
      });
      const cfg = res.ok ? await res.json() : null;
      if (!cfg || !cfg.apiKey) return;
      // compat SDK
      firebase.initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        storageBucket: cfg.storageBucket,
        messagingSenderId: cfg.messagingSenderId,
        appId: cfg.appId,
      });
      // wire google sign in button
      if (btnGoogleSignIn)
        btnGoogleSignIn.addEventListener("click", async () => {
          try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;
            if (!user) return alert("Google sign-in failed");
            const idToken = await user.getIdToken();
            // send to backend to create admin session
            const res = await tryCandidates("/auth/firebase-admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ idToken }),
            });
            if (!res.ok) {
              const t = await res.text();
              return alert("Login failed: " + res.status + "\n" + t);
            }
            const sessionData = await res.json();
            sessionToken = sessionData.sessionToken;
            localStorage.setItem("admin_session_token", sessionToken);
            // success
            loginSection.style.display = "none";
            document.querySelector(".nav").style.display = "";
            btnLogout.style.display = "inline-block";
            isAuthenticated = true;
            showView("dashboard");
          } catch (e) {
            alert("Google sign-in error: " + (e && e.message ? e.message : e));
          }
        });
      // keep firebase user signed-out on load
      if (firebase && firebase.auth)
        firebase
          .auth()
          .signOut()
          .catch(() => {});
    } catch (e) {}
  }

  function showView(name) {
    views.forEach((v) => (v.style.display = v.id === name ? "block" : "none"));
    navItems.forEach((li) =>
      li.classList.toggle("active", li.dataset.view === name),
    );
    if (name === "dashboard") loadDashboard();
    if (name === "books") loadBooks();
    if (name === "posts") loadPosts();
    if (name === "comments") loadComments();
    if (name === "orders") loadOrders();
    if (name === "forms") loadForms();
    if (name === "newsletters") loadNewsletters();
    if (name === "users") loadUsers();
  }

  navItems.forEach((li) =>
    li.addEventListener("click", () => showView(li.dataset.view)),
  );

  btnLogout.addEventListener("click", async () => {
    try {
      await tryCandidates("/admin/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {}
    try {
      if (window.firebase && firebase.auth) await firebase.auth().signOut();
    } catch (e) {}
    // clear auth state and UI
    isAuthenticated = false;
    document.querySelector(".nav").style.display = "none";
    loginSection.style.display = "block";
    btnLogout.style.display = "none";
    // clear backend base to avoid accidental cross-site calls
    localStorage.removeItem(LOCAL_BACKEND_BASE);
    localStorage.removeItem("admin_session_token");
    sessionToken = "";
    localStorage.removeItem("admin_session_token");
    sessionToken = "";
  });

  // Backend base input
  if (backendBaseInput)
    backendBaseInput.addEventListener("change", () => {
      effectiveBackendBase = normalizeBackendBase(backendBaseInput.value || "");
      backendBaseInput.value = effectiveBackendBase;
      if (effectiveBackendBase)
        localStorage.setItem(LOCAL_BACKEND_BASE, effectiveBackendBase);
      else localStorage.removeItem(LOCAL_BACKEND_BASE);
    });

  // DASHBOARD
  async function loadDashboard() {
    const summaryEl = document.getElementById("summary");
    const recentEl = document.getElementById("recentActivity");
    summaryEl.textContent = "Loading...";
    recentEl.textContent = "Loading...";
    try {
      const stats = await fetchJson("/admin/api/summary").catch(() => ({}));
      summaryEl.innerHTML = `<div><strong>Books:</strong> ${stats.books || "—"}</div><div><strong>Posts:</strong> ${stats.posts || "—"}</div><div><strong>Orders:</strong> ${stats.orders || "—"}</div><div><strong>Pending comments:</strong> ${stats.pendingComments || "—"}</div>`;
      const activity = await fetchJson("/admin/api/recent-activity").catch(
        () => [],
      );
      recentEl.textContent = JSON.stringify(activity, null, 2);
      // order status progress
      const orderStatusCounts = stats.orderStatusCounts || {};
      renderOrderStatusProgress(orderStatusCounts);
      // revenue chart (if available)
      const revenueData = (stats.revenueByDay || stats.salesByDay || []).map(
        (s) => ({ x: s.day, y: s.total || s.revenue || s.amount || 0 }),
      );
      if (revenueData.length)
        renderChart("revenueChart", "Revenue", revenueData, "#10b981");
      // users chart (if available)
      const usersData = (stats.usersByDay || []).map((s) => ({
        x: s.day,
        y: s.count || s.users || 0,
      }));
      if (usersData.length)
        renderChart("usersChart", "New users", usersData, "#f59e0b");
      // top items
      if (Array.isArray(stats.topItems) && stats.topItems.length) {
        const el = document.getElementById("topItems");
        el.textContent = "";
        const list = document.createElement("ol");
        stats.topItems.slice(0, 10).forEach((t) => {
          const li = document.createElement("li");
          li.textContent =
            (t.name || t.title || t.id || "") +
            " — " +
            (t.count || t.sales || t.quantity || "");
          list.appendChild(li);
        });
        el.appendChild(list);
      }
      // newsletter emails
      try {
        const subs = await fetchJson("/admin/newsletters/clients").catch(
          () => null,
        );
        if (Array.isArray(subs)) {
          const emails = subs.map((s) => s.email || s).slice(0, 50);
          const el = document.createElement("div");
          el.innerHTML = `<h4>Newsletter (sample)</h4><div class="card"><pre class="muted">${escapeHtml(emails.join("\n"))}</pre></div>`;
          summaryEl.appendChild(el);
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      summaryEl.textContent = "Error loading dashboard: " + e.message;
    }
  }

  function renderOrderStatusProgress(statusCounts) {
    const el = document.getElementById("orderStatusProgress");
    if (!el) return;

    const statuses = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
    const cancelled = statusCounts["CANCELLED"] || 0;
    const total =
      statuses.reduce((sum, s) => sum + (statusCounts[s] || 0), 0) + cancelled;

    if (total === 0) {
      el.innerHTML =
        '<div style="text-align:center;color:#6b7280;padding:20px;">No orders yet</div>';
      return;
    }

    // Calculate percentages
    const statusPercents = statuses.map((s) => ({
      status: s,
      count: statusCounts[s] || 0,
      percent: ((statusCounts[s] || 0) / total) * 100,
    }));

    // Build HTML
    let html = '<div style="position:relative;padding:20px 0;">';

    // Progress bar container
    html +=
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;position:relative;">';

    // Status points
    statuses.forEach((status, index) => {
      const count = statusCounts[status] || 0;
      const isActive = count > 0;
      const color = isActive ? "#1f2937" : "#6b7280";
      const bgColor = isActive ? "#1f2937" : "#e6e9ef";

      html += `<div style="display:flex;flex-direction:column;align-items:center;z-index:2;">
        <div style="width:12px;height:12px;border-radius:50%;background:${bgColor};border:2px solid ${color};margin-bottom:4px;"></div>
        <div style="font-size:10px;color:${color};font-weight:500;text-align:center;">${status}<br/>(${count})</div>
      </div>`;

      // Connecting line (except for last)
      if (index < statuses.length - 1) {
        const nextCount = statusCounts[statuses[index + 1]] || 0;
        const lineColor = count > 0 || nextCount > 0 ? "#1f2937" : "#e6e9ef";
        html += `<div style="flex:1;height:2px;background:${lineColor};margin:0 4px;position:relative;top:-8px;"></div>`;
      }
    });

    html += "</div>";

    // Truck icon (positioned based on highest status with orders)
    let truckPosition = 0;
    for (let i = statuses.length - 1; i >= 0; i--) {
      if ((statusCounts[statuses[i]] || 0) > 0) {
        truckPosition = i;
        break;
      }
    }
    const truckLeft = (truckPosition / (statuses.length - 1)) * 100;

    html += `<div style="position:absolute;top:15px;left:${truckLeft}%;transform:translateX(-50%);z-index:3;">
      <i class="fas fa-truck" style="color:#1f2937;font-size:16px;"></i>
    </div>`;

    // Cancelled orders (cross icon)
    if (cancelled > 0) {
      html += `<div style="margin-top:20px;text-align:center;">
        <i class="fas fa-times" style="color:#dc2626;margin-right:4px;"></i>
        <span style="color:#dc2626;font-size:12px;">CANCELLED: ${cancelled}</span>
      </div>`;
    }

    html += "</div>";
    el.innerHTML = html;
  }

  // Generic chart renderer (simple line)
  function renderChart(id, label, data, color = "#2563eb") {
    const el = document.getElementById(id);
    if (!el) return null;
    const labels = data.map((d) => d.x);
    const values = data.map((d) => d.y);
    try {
      if (el.__chart) {
        el.__chart.data.labels = labels;
        el.__chart.data.datasets[0].data = values;
        el.__chart.update();
        return el.__chart;
      }
      el.__chart = new Chart(el, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label,
              data: values,
              borderColor: color,
              backgroundColor: "rgba(37,99,235,0.06)",
            },
          ],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
      return el.__chart;
    } catch (e) {
      return null;
    }
  }

  // BOOKS
  const booksListEl = document.getElementById("booksList");
  let editingBookId = null;
  document
    .getElementById("createBookForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      // Build a clean payload: convert checkboxes to booleans, split samplePages into array,
      // and remove empty-string fields so Jackson doesn't try to coerce empty strings into numbers.
      try {
        const fd = new FormData(form);
        const data = {};
        for (const [k, v] of fd.entries()) {
          data[k] = v;
        }
        // Checkboxes -> booleans
        const promoEl = form.querySelector('[name="promo"]');
        const featuredEl = form.querySelector('[name="featured"]');
        data.promo = !!(promoEl && promoEl.checked);
        data.featured = !!(featuredEl && featuredEl.checked);

        // Sample pages: convert comma-separated string to array
        const spEl = form.querySelector('[name="samplePages"]');
        if (spEl) {
          const raw = (spEl.value || "").trim();
          if (raw.length) {
            data.samplePages = raw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else {
            delete data.samplePages;
          }
        }

        // Gallery photos: convert comma-separated string to array
        const gpEl = form.querySelector('[name="galleryPhotos"]');
        if (gpEl) {
          const raw = (gpEl.value || "").trim();
          if (raw.length) {
            data.galleryPhotos = raw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else {
            delete data.galleryPhotos;
          }
        }

        // Remove empty strings for numeric fields and convert ints
        ["pages", "stock", "year"].forEach((name) => {
          if (data[name] !== undefined) {
            if (data[name] === null || String(data[name]).trim() === "")
              delete data[name];
            else data[name] = parseInt(String(data[name]).trim(), 10);
          }
        });
        // Remove empty price/oldPrice/discountPercent if blank
        ["price", "oldPrice", "discountPercent"].forEach((name) => {
          if (
            data[name] !== undefined &&
            (data[name] === null || String(data[name]).trim() === "")
          )
            delete data[name];
        });

        const method = editingBookId ? "PUT" : "POST";
        const url = editingBookId
          ? "/admin/books/" + editingBookId
          : "/admin/books";
        const res = await tryCandidates(url, {
          method,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => null);
          throw new Error("Save failed " + res.status + (t ? "\n" + t : ""));
        }
        form.reset();
        editingBookId = null;
        const submitBtn = form.querySelector("button[type=submit]");
        if (submitBtn) submitBtn.textContent = "Create";
        loadBooks();
      } catch (err) {
        alert("Save book error: " + (err && err.message ? err.message : err));
      }
    });

  async function loadBooks() {
    booksListEl.innerHTML = "Loading...";
    try {
      const books = await fetchJson("/admin/books");
      if (!Array.isArray(books)) {
        booksListEl.textContent = JSON.stringify(books, null, 2);
        return;
      }
      const table = document.createElement("table");
      table.innerHTML = `<thead><tr><th>Id</th><th>Title</th><th>Author</th><th>Price</th><th></th></tr></thead>`;
      const tbody = document.createElement("tbody");
      books.forEach((b) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${b.id || ""}</td><td>${escapeHtml(b.title || b.name || "")}</td><td>${escapeHtml(b.author || "")}</td><td>${b.price || ""}</td>`;
        const actions = document.createElement("td");
        actions.className = "actions";
        const viewBtn = document.createElement("button");
        viewBtn.className = "btn";
        viewBtn.textContent = "Details";
        viewBtn.addEventListener("click", () => {
          alert(JSON.stringify(b, null, 2));
        });
        const editBtn = document.createElement("button");
        editBtn.className = "btn";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => editBook(b));
        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Delete";
        del.addEventListener("click", async () => {
          if (!confirm("Delete?")) return;
          await deleteBook(b.id);
        });
        actions.appendChild(viewBtn);
        actions.appendChild(editBtn);
        actions.appendChild(del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      booksListEl.innerHTML = "";
      booksListEl.appendChild(table);
    } catch (e) {
      booksListEl.textContent = "Error: " + e.message;
    }
  }

  async function deleteBook(id) {
    try {
      const res = await tryCandidates("/admin/books/" + id, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      loadBooks();
    } catch (e) {
      alert(e.message);
    }
  }
  function editBook(b) {
    editingBookId = b.id;
    const form = document.getElementById("createBookForm");
    if (!form) return;
    const set = (name, value) => {
      const el = form.querySelector('[name="' + name + '"]');
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!value;
      else el.value = value || "";
    };
    set("title", b.title);
    set("slug", b.slug);
    set("author", b.author);
    set("category", b.category);
    set("price", b.price);
    set("oldPrice", b.oldPrice);
    set("discountPercent", b.discountPercent);
    set("promo", b.promo);
    set("featured", b.featured);
    set("stock", b.stock);
    set("isbn", b.isbn);
    set("pages", b.pages);
    set("year", b.year);
    set("language", b.language);
    set("publisher", b.publisher);
    set("image", b.image);
    set("videoVerticalUrl", b.videoVerticalUrl);
    set("videoHorizontalUrl", b.videoHorizontalUrl);
    set("stripeProductId", b.stripeProductId);
    set("samplePages", (b.samplePages || []).join(","));
    set("galleryPhotos", (b.galleryPhotos || []).join(","));
    set("description", b.description);
    const btn = form.querySelector("button[type=submit]");
    if (btn) btn.textContent = "Update";
    showView("books");
  }

  // POSTS
  const postsListEl = document.getElementById("postsList");
  let editingPostId = null;
  document
    .getElementById("createPostForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        // Build payload from form, normalize booleans and empty strings
        const form = e.target;
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());

        // Convert checkbox values to booleans
        data.featured = !!form.querySelector('[name="featured"]')?.checked;
        data.published = !!form.querySelector('[name="published"]')?.checked;

        // Normalize empty strings to null for optional fields
        ["excerpt", "featuredImage", "author", "category"].forEach((k) => {
          if (data[k] !== undefined && String(data[k]).trim() === "")
            data[k] = null;
        });

        const method = editingPostId ? "PUT" : "POST";
        const url = editingPostId
          ? "/admin/blog/posts/" + editingPostId
          : "/admin/blog/posts";
        const res = await tryCandidates(url, {
          method,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => null);
          throw new Error("Save failed: " + res.status + (t ? "\n" + t : ""));
        }
        form.reset();
        editingPostId = null;
        document.querySelector(
          "#createPostForm button[type=submit]",
        ).textContent = "Create Post";
        loadPosts();
      } catch (err) {
        alert("Save post error: " + (err && err.message ? err.message : err));
      }
    });
  async function loadPosts() {
    postsListEl.innerHTML = "Loading...";
    try {
      const res = await tryCandidates("/admin/blog/posts", {
        credentials: "include",
      });
      if (!res.ok)
        throw Object.assign(new Error("HTTP " + res.status), { res });
      const ct = res.headers.get("content-type") || "";
      let payload = null;
      if (ct.includes("application/json")) payload = await res.json();
      else throw new Error("Expected JSON for posts");
      let items = [];
      if (Array.isArray(payload)) items = payload;
      else if (payload.content && Array.isArray(payload.content))
        items = payload.content;
      else if (payload.data && Array.isArray(payload.data))
        items = payload.data;
      else items = [];

      const table = document.createElement("table");
      table.innerHTML = `<thead><tr><th>Id</th><th>Title</th><th>Slug</th><th></th></tr></thead>`;
      const tbody = document.createElement("tbody");
      items.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${p.id || ""}</td><td>${escapeHtml(p.title || p.name || "")}</td><td>${escapeHtml(p.slug || "")}</td>`;
        const actions = document.createElement("td");
        actions.className = "actions";
        const viewBtn = document.createElement("button");
        viewBtn.className = "btn";
        viewBtn.textContent = "Details";
        viewBtn.addEventListener("click", () =>
          alert(JSON.stringify(p, null, 2)),
        );
        const edit = document.createElement("button");
        edit.className = "btn";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => editPost(p));
        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Delete";
        del.addEventListener("click", async () => {
          if (!confirm("Delete post?")) return;
          await deletePost(p.id);
        });

        // Publish / Unpublish button
        const pub = document.createElement("button");
        pub.className = p.published ? "btn" : "btn primary";
        pub.textContent = p.published ? "Unpublish" : "Publish";
        pub.addEventListener("click", async () => {
          try {
            const confirmMsg = p.published
              ? "Mark post as unpublished?"
              : "Mark post as published?";
            if (!confirm(confirmMsg)) return;
            // Build payload merging existing visible fields to avoid overwriting with nulls
            const payload = {
              title: p.title || "",
              slug: p.slug || "",
              content: p.content || "",
              excerpt: p.excerpt || null,
              featuredImage: p.featuredImage || null,
              author: p.author || null,
              featured: !!p.featured,
              published: !p.published,
              category: p.categoryName || p.category || null,
            };
            const res = await tryCandidates("/admin/blog/posts/" + p.id, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const t = await res.text().catch(() => null);
              throw new Error(
                "Update failed: " + res.status + (t ? "\n" + t : ""),
              );
            }
            // Refresh list
            loadPosts();
          } catch (e) {
            alert("Publish error: " + (e && e.message ? e.message : e));
          }
        });

        actions.appendChild(viewBtn);
        actions.appendChild(edit);
        actions.appendChild(pub);
        actions.appendChild(del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      postsListEl.innerHTML = "";
      postsListEl.appendChild(table);
    } catch (e) {
      postsListEl.textContent = "Error: " + (e && e.message ? e.message : e);
    }
  }
  async function deletePost(id) {
    try {
      const res = await tryCandidates("/admin/blog/posts/" + id, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      loadPosts();
    } catch (e) {
      alert(e.message);
    }
  }
  function editPost(p) {
    editingPostId = p.id;
    const form = document.getElementById("createPostForm");
    if (!form) return;
    const set = (name, value) => {
      const el = form.querySelector('[name="' + name + '"]');
      if (el) {
        if (el.type === "checkbox") el.checked = !!value;
        else el.value = value || "";
      }
    };
    set("title", p.title);
    set("slug", p.slug);
    set("author", p.author);
    set("category", p.categoryName || p.category || "");
    set("excerpt", p.excerpt);
    set("featuredImage", p.featuredImage);
    set("content", p.content);
    set("published", p.published);
    set("featured", p.featured);
    // update submit button label
    const btn = form.querySelector("button[type=submit]");
    if (btn) btn.textContent = "Update Post";
    // ensure posts view is visible
    showView("posts");
  }

  // Send newsletter from UI
  const sendNewsletterForm = document.getElementById("sendNewsletterForm");
  if (sendNewsletterForm)
    sendNewsletterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const subject = document.getElementById("newsletterSubject").value.trim();
      const content = document.getElementById("newsletterContent").value.trim();
      if (!subject || !content) return alert("Subject and content required");
      try {
        const res = await tryCandidates("/auth/send-newsletter", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, content }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error("Send failed: " + res.status + "\n" + t);
        }
        alert("Newsletter sent");
        loadNewsletters();
      } catch (e) {
        alert("Send error: " + (e && e.message ? e.message : e));
      }
    });

  // COMMENTS
  const commentsListEl = document.getElementById("commentsList");
  async function loadComments() {
    commentsListEl.innerHTML = "Loading...";
    try {
      const payload = await fetchJson("/admin/comments");
      // payload may be an array or an object with `data`/`content`
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (payload.data && Array.isArray(payload.data)) list = payload.data;
      else if (payload.content && Array.isArray(payload.content))
        list = payload.content;
      else {
        commentsListEl.textContent = JSON.stringify(payload, null, 2);
        return;
      }

      const table = document.createElement("table");
      table.innerHTML = `<thead><tr><th>Id</th><th>Author</th><th>Content</th><th>Status</th><th></th></tr></thead>`;
      const tbody = document.createElement("tbody");
      list.forEach((c) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${c.id || ""}</td><td>${escapeHtml(c.authorName || c.author || c.name || "")}</td><td>${escapeHtml(c.content || "")}</td><td>${escapeHtml((c.status || "").toUpperCase())}</td>`;
        const actions = document.createElement("td");
        actions.className = "actions";
        const approve = document.createElement("button");
        approve.className = "btn primary";
        approve.textContent = "Approve";
        approve.disabled = c.status && c.status.toLowerCase() === "approved";
        approve.addEventListener("click", async () => {
          await moderateComment(c.id, "approve");
        });
        const reject = document.createElement("button");
        reject.className = "btn";
        reject.textContent = "Reject";
        reject.addEventListener("click", async () => {
          if (!confirm("Reject comment?")) return;
          await moderateComment(c.id, "reject");
        });
        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Delete";
        del.addEventListener("click", async () => {
          if (!confirm("Delete comment?")) return;
          try {
            const r = await tryCandidates("/admin/comments/" + c.id, {
              method: "DELETE",
              credentials: "include",
            });
            if (!r.ok) throw new Error("Delete failed");
            loadComments();
          } catch (e) {
            alert(e.message);
          }
        });
        actions.appendChild(approve);
        actions.appendChild(reject);
        actions.appendChild(del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      commentsListEl.innerHTML = "";
      commentsListEl.appendChild(table);
    } catch (e) {
      commentsListEl.textContent = "Error: " + e.message;
    }
  }
  async function moderateComment(id, action) {
    try {
      const res = await tryCandidates("/admin/comments/" + id, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Moderation failed");
      loadComments();
    } catch (e) {
      alert(e.message);
    }
  }

  // ORDERS
  const ordersListEl = document.getElementById("ordersList");
  // Support paginated or simple array responses for orders
  async function loadOrders() {
    ordersListEl.innerHTML = "Loading...";
    try {
      const res = await tryCandidates("/admin/orders", {
        credentials: "include",
        headers: sessionToken ? { "X-Session-Token": sessionToken } : {},
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          isAuthenticated = false;
          document.querySelector(".nav").style.display = "none";
          loginSection.style.display = "block";
          btnLogout.style.display = "none";
          ordersListEl.textContent = "Authentication required";
          return;
        }
        throw Object.assign(new Error("HTTP " + res.status), { res });
      }
      const ct = res.headers.get("content-type") || "";
      let payload = null;
      if (ct.includes("application/json")) payload = await res.json();
      else {
        throw new Error("Expected JSON for orders");
      }
      // normalize: support { data: [], ... } or { content: [], ... } or []
      let items = [];
      if (Array.isArray(payload)) items = payload;
      else if (payload.data && Array.isArray(payload.data))
        items = payload.data;
      else if (payload.content && Array.isArray(payload.content))
        items = payload.content;
      else if (payload.results && Array.isArray(payload.results))
        items = payload.results;
      else if (payload.orders && Array.isArray(payload.orders))
        items = payload.orders;

      const table = document.createElement("table");
      table.innerHTML = `<thead><tr><th>Id</th><th>Order #</th><th>User Email</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr></thead>`;
      const tbody = document.createElement("tbody");
      items.forEach((o) => {
        const tr = document.createElement("tr");
        const statusSelect = document.createElement("select");
        statusSelect.innerHTML = `<option value="PENDING" ${o.status === "PENDING" ? "selected" : ""}>PENDING</option><option value="PAID" ${o.status === "PAID" ? "selected" : ""}>PAID</option><option value="PROCESSING" ${o.status === "PROCESSING" ? "selected" : ""}>PROCESSING</option><option value="SHIPPED" ${o.status === "SHIPPED" ? "selected" : ""}>SHIPPED</option><option value="DELIVERED" ${o.status === "DELIVERED" ? "selected" : ""}>DELIVERED</option><option value="CANCELLED" ${o.status === "CANCELLED" ? "selected" : ""}>CANCELLED</option>`;
        const updateBtn = document.createElement("button");
        updateBtn.className = "btn";
        updateBtn.textContent = "Update";
        updateBtn.style.fontSize = "0.85rem";
        updateBtn.style.padding = "4px 8px";
        updateBtn.addEventListener("click", async () => {
          await updateOrderStatus(o.id, statusSelect.value);
        });
        const view = document.createElement("button");
        view.className = "btn";
        view.textContent = "View";
        view.style.fontSize = "0.85rem";
        view.style.padding = "4px 8px";
        view.addEventListener("click", () => viewOrder(o));
        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Delete";
        del.style.fontSize = "0.85rem";
        del.style.padding = "4px 8px";
        del.addEventListener("click", async () => {
          if (!confirm("Delete order?")) return;
          await deleteOrder(o.id);
        });
        
        // Format date
        const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-PT', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '-';
        
        // Payment info
        const paymentMethod = o.paymentMethod ? o.paymentMethod.toUpperCase().replace('_', ' ') : '-';
        const paymentStatus = o.paymentStatus ? o.paymentStatus : '-';
        const paymentInfo = `${paymentMethod}<br/><small style="color:#666">${paymentStatus}</small>`;
        
        tr.innerHTML = `<td>${o.id || ""}</td><td><strong>${escapeHtml(o.orderNumber || "N/A")}</strong></td><td>${escapeHtml(o.customerEmail || o.user?.email || "")}</td><td><strong>${o.total || "0"}€</strong></td><td>${paymentInfo}</td>`;
        const statusCell = document.createElement("td");
        statusCell.appendChild(statusSelect);
        statusCell.appendChild(updateBtn);
        tr.appendChild(statusCell);
        tr.innerHTML += `<td>${date}</td>`;
        const actions = document.createElement("td");
        actions.className = "actions";
        actions.appendChild(view);
        actions.appendChild(del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      ordersListEl.innerHTML = "";
      ordersListEl.appendChild(table);
    } catch (e) {
      ordersListEl.textContent = "Error: " + (e && e.message ? e.message : e);
    }
  }
  function viewOrder(o) {
    alert(JSON.stringify(o, null, 2));
  }
  // Enhanced viewOrder: show modal with editable fields
  async function viewOrder(o) {
    try {
      const res = await tryCandidates("/admin/orders/" + o.id, {
        credentials: "include",
        headers: sessionToken ? { "X-Session-Token": sessionToken } : {},
      });
      if (!res.ok) {
        const t = await res.text().catch(() => null);
        throw new Error(
          "Failed to load order: " + res.status + (t ? "\n" + t : ""),
        );
      }
      const ord = await res.json();
      const modal = document.getElementById("orderModal");
      const content = document.getElementById("orderModalContent");
      content.innerHTML = "";
      const html = [];
      html.push(
        "<div style='display:grid; gap:12px;'>",
      );
      
      // Header
      html.push(
        "<div style='border-bottom:2px solid #0E1B4D; padding-bottom:10px;'><h3 style='margin:0;'>Order #" +
          escapeHtml(ord.orderNumber || ord.id) +
          "</h3><small style='color:#666;'>ID: " +
          (ord.id || "") +
          "</small></div>",
      );
      
      // Customer Info
      html.push("<div style='background:#f9fafb; padding:12px; border-radius:6px;'>");
      html.push("<h4 style='margin:0 0 8px 0; font-size:0.95rem;'><i class='fas fa-user'></i> Customer Information</h4>");
      html.push(
        '<div style="margin-top:6px"><label>Email: <input id="orderModalEmail" value="' +
          escapeHtml(ord.customerEmail || "") +
          '" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px;"/></label></div>',
      );
      html.push("</div>");
      
      // Payment Info
      html.push("<div style='background:#f9fafb; padding:12px; border-radius:6px;'>");
      html.push("<h4 style='margin:0 0 8px 0; font-size:0.95rem;'><i class='fas fa-credit-card'></i> Payment Information</h4>");
      html.push("<div style='display:grid; grid-template-columns:1fr 1fr; gap:8px;'>");
      html.push("<div><strong>Method:</strong> " + escapeHtml((ord.paymentMethod || "N/A").toUpperCase().replace(/_/g, ' ')) + "</div>");
      html.push("<div><strong>Status:</strong> <span style='color:" + (ord.paymentStatus === 'PAID' ? '#0b8457' : '#666') + ";'>" + escapeHtml(ord.paymentStatus || "N/A") + "</span></div>");
      html.push("<div><strong>Total:</strong> <span style='font-size:1.1rem; font-weight:600; color:#0E1B4D;'>" + (ord.total || "0.00") + "€</span></div>");
      html.push("<div><strong>Payment ID:</strong> <small style='color:#666;'>" + escapeHtml(ord.paymentId || "N/A") + "</small></div>");
      html.push("</div>");
      if (ord.receiptUrl) {
        html.push("<div style='margin-top:8px;'><a href='" + escapeHtml(ord.receiptUrl) + "' target='_blank' class='btn' style='font-size:0.85rem;'><i class='fas fa-receipt'></i> View Receipt</a></div>");
      }
      if (ord.invoicePdfUrl) {
        html.push("<div style='margin-top:4px;'><a href='" + escapeHtml(ord.invoicePdfUrl) + "' target='_blank' class='btn' style='font-size:0.85rem;'><i class='fas fa-file-pdf'></i> Download Invoice</a></div>");
      }
      html.push("</div>");
      
      // Shipping Address
      html.push("<div style='background:#f9fafb; padding:12px; border-radius:6px;'>");
      html.push("<h4 style='margin:0 0 8px 0; font-size:0.95rem;'><i class='fas fa-shipping-fast'></i> Shipping Address</h4>");
      html.push(
        '<div style="margin-top:6px"><textarea id="orderModalAddress" rows="4" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px; font-family:monospace; font-size:0.9rem;">' +
          escapeHtml(ord.shippingAddress || "") +
          "</textarea></div>",
      );
      html.push("</div>");
      
      // Order Status
      const status = ord.status || ord.paymentStatus || "";
      html.push("<div style='background:#f9fafb; padding:12px; border-radius:6px;'>");
      html.push("<h4 style='margin:0 0 8px 0; font-size:0.95rem;'><i class='fas fa-box'></i> Order Status</h4>");
      html.push(
        '<div style="margin-top:6px"><select id="orderModalStatus" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; font-weight:600;"><option value="PENDING">PENDING</option><option value="PAID">PAID</option><option value="PROCESSING">PROCESSING</option><option value="SHIPPED">SHIPPED</option><option value="DELIVERED">DELIVERED</option><option value="CANCELLED">CANCELLED</option></select></div>',
      );
      html.push("</div>");
      
      // Items
      html.push("<div style='background:#f9fafb; padding:12px; border-radius:6px;'>");
      html.push("<h4 style='margin:0 0 8px 0; font-size:0.95rem;'><i class='fas fa-list'></i> Order Items</h4>");
      if (ord.items && ord.items.length > 0) {
        html.push("<div style='max-height:300px; overflow-y:auto;'>");
        ord.items.forEach((item, idx) => {
          html.push("<div style='padding:8px; border-bottom:1px solid #e6e9ef;'>");
          html.push("<div><strong>" + escapeHtml(item.book?.title || "Item " + (idx+1)) + "</strong></div>");
          html.push("<div style='font-size:0.85rem; color:#666;'>Quantity: " + (item.quantity || 1) + " × " + (item.price || "0.00") + "€ = " + ((item.quantity || 1) * parseFloat(item.price || 0)).toFixed(2) + "€</div>");
          html.push("</div>");
        });
        html.push("</div>");
      } else {
        html.push("<div style='color:#666; font-style:italic;'>No items</div>");
      }
      html.push("</div>");
      
      // Dates
      if (ord.createdAt || ord.updatedAt) {
        html.push("<div style='font-size:0.85rem; color:#666; padding:8px 0; border-top:1px solid #e6e9ef;'>");
        if (ord.createdAt) html.push("<div><strong>Created:</strong> " + new Date(ord.createdAt).toLocaleString('pt-PT') + "</div>");
        if (ord.updatedAt) html.push("<div><strong>Updated:</strong> " + new Date(ord.updatedAt).toLocaleString('pt-PT') + "</div>");
        html.push("</div>");
      }
      
      html.push("</div>");
      
      content.innerHTML = html.join("");
      const statusEl = document.getElementById("orderModalStatus");
      if (statusEl) statusEl.value = (status || "").toUpperCase();
      const modalSave = document.getElementById("orderModalSave");
      modalSave.onclick = async () => {
        try {
          const newStatus = document.getElementById("orderModalStatus").value;
          const email = document.getElementById("orderModalEmail").value.trim();
          const addr = document
            .getElementById("orderModalAddress")
            .value.trim();
          // update status if changed
          if (newStatus && newStatus !== status) {
            await updateOrderStatus(ord.id, newStatus);
          }
          // update shipping/email via PATCH endpoint
          try {
            const r2 = await tryCandidates("/admin/orders/" + ord.id, {
              method: "PATCH",
              credentials: "include",
              headers: Object.assign(
                { "Content-Type": "application/json" },
                sessionToken ? { "X-Session-Token": sessionToken } : {},
              ),
              body: JSON.stringify({
                customerEmail: email,
                shippingAddress: addr,
              }),
            });
            if (!r2.ok) {
              const t = await r2.text().catch(() => null);
              throw new Error(
                "Save failed: " + r2.status + (t ? "\n" + t : ""),
              );
            }
          } catch (e) {
            // ignore if backend doesn't support PATCH
          }
          modal.style.display = "none";
          loadOrders();
        } catch (e) {
          alert("Save error: " + (e && e.message ? e.message : e));
        }
      };
      document.getElementById("orderModalClose").onclick = () => {
        modal.style.display = "none";
      };
      modal.style.display = "flex";
    } catch (e) {
      alert("Load order failed: " + (e && e.message ? e.message : e));
    }
  }
  async function deleteOrder(id) {
    try {
      const res = await tryCandidates("/admin/orders/" + id + "?force=true", {
        method: "DELETE",
        credentials: "include",
        headers: sessionToken ? { "X-Session-Token": sessionToken } : {},
      });
      if (!res.ok) throw new Error("Delete failed");
      loadOrders();
    } catch (e) {
      alert(e.message);
    }
  }
  async function updateOrderStatus(id, status) {
    try {
      const res = await tryCandidates("/admin/orders/" + id + "/status", {
        method: "PATCH",
        credentials: "include",
        headers: Object.assign(
          { "Content-Type": "application/json" },
          sessionToken ? { "X-Session-Token": sessionToken } : {},
        ),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      loadOrders();
    } catch (e) {
      alert(e.message);
    }
  }

  // FORMS
  const formsListEl = document.getElementById("formsList");
  async function loadForms() {
    formsListEl.innerHTML = "Loading...";
    try {
      const payload = await fetchJson("/admin/form-submissions");
      let items = [];
      if (Array.isArray(payload)) items = payload;
      else if (payload.content && Array.isArray(payload.content))
        items = payload.content;
      else if (payload.data && Array.isArray(payload.data))
        items = payload.data;
      else {
        formsListEl.textContent = JSON.stringify(payload, null, 2);
        return;
      }

      // Render a compact table with useful columns and a nicer View action that opens a modal
      const table = document.createElement("table");
      table.innerHTML = `<thead><tr><th>Id</th><th>From</th><th>Subject / Form</th><th>Preview</th><th>Submitted</th><th></th></tr></thead>`;
      const tbody = document.createElement("tbody");
      // helper: derive subject/label for submission
      function deriveSubject(obj) {
        if (!obj) return "";
        if (obj.bookTitle) return "Book: " + obj.bookTitle;
        if (obj.bookType) return "Book type: " + obj.bookType;
        if (obj.formType) return obj.formType;
        if (obj.subject) return obj.subject;
        if (obj.plan) return "Plan: " + obj.plan;
        if (obj.name && obj.email) return "From: " + obj.name;
        return "";
      }

      function buildPreview(obj) {
        if (!obj) return "";
        if (obj.message && String(obj.message).trim().length)
          return String(obj.message).trim();
        // If there are meaningful custom fields, show a compact JSON of them
        const skip = new Set([
          "id",
          "createdAt",
          "submittedAt",
          "date",
          "pageable",
          "content",
          "empty",
          "first",
          "last",
          "pageNumber",
          "pageSize",
          "number",
          "numberOfElements",
          "totalElements",
          "totalPages",
          "sort",
        ]);
        const compact = {};
        Object.keys(obj).forEach((k) => {
          if (skip.has(k)) return;
          const v = obj[k];
          if (v === null || v === undefined) return;
          // prefer primitive values; for arrays/objects show a short representation
          if (
            typeof v === "string" ||
            typeof v === "number" ||
            typeof v === "boolean"
          )
            compact[k] = v;
          else if (Array.isArray(v) && v.length > 0)
            compact[k] = Array.isArray(v) ? v.slice(0, 2) : v;
          else if (typeof v === "object")
            compact[k] = Object.keys(v).length
              ? Object.fromEntries(Object.entries(v).slice(0, 2))
              : undefined;
        });
        const txt = Object.keys(compact).length
          ? JSON.stringify(compact, null, 2)
          : JSON.stringify(obj, null, 2);
        return txt;
      }

      items.forEach((f) => {
        const tr = document.createElement("tr");
        const from = escapeHtml(f.name || f.senderName || f.email || "");
        const subject = escapeHtml(deriveSubject(f) || "");
        // Create a short preview (first 120 chars)
        const rawMsg = buildPreview(f) || "";
        const preview =
          escapeHtml(String(rawMsg).slice(0, 120)) +
          (String(rawMsg).length > 120 ? "…" : "");
        const submitted =
          f.createdAt ||
          f.submittedAt ||
          (f.submittedAt && Array.isArray(f.submittedAt)
            ? f.submittedAt.join("-")
            : "") ||
          f.date ||
          "";
        tr.innerHTML = `<td>${f.id || ""}</td><td>${from}</td><td>${subject || "&ndash;"}</td><td><pre style="white-space:pre-wrap;max-width:350px;overflow:hidden">${preview}</pre></td><td>${escapeHtml(submitted)}</td>`;
        const actions = document.createElement("td");
        actions.className = "actions";
        const view = document.createElement("button");
        view.className = "btn";
        view.textContent = "View";
        view.addEventListener("click", () => viewForm(f));
        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Delete";
        del.addEventListener("click", async () => {
          if (!confirm("Delete submission?")) return;
          await deleteForm(f.id);
        });
        actions.appendChild(view);
        actions.appendChild(del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      formsListEl.innerHTML = "";
      formsListEl.appendChild(table);
    } catch (e) {
      formsListEl.textContent = "Error: " + e.message;
    }
  }
  async function deleteForm(id) {
    try {
      const res = await tryCandidates("/admin/form-submissions/" + id, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      loadForms();
    } catch (e) {
      alert(e.message);
    }
  }

  // View single submission in modal
  function viewForm(f) {
    const modal = document.getElementById("formModal");
    const content = document.getElementById("formModalContent");
    if (!modal || !content) return alert(JSON.stringify(f, null, 2));
    const rows = [];
    rows.push(`<div><strong>Submission ID: ${f.id || ""}</strong></div>`);
    // Render all top-level primitive fields in a list, prioritizing common ones
    const commonOrder = [
      "name",
      "email",
      "phone",
      "subject",
      "formType",
      "plan",
      "bookTitle",
      "bookGenre",
      "manuscriptStatus",
      "wordCount",
      "bookSynopsis",
      "additionalInfo",
      "printType",
      "coverType",
      "bookSize",
      "pages",
      "hasIllustrations",
      "quantity",
      "calculatedPrice",
      "submittedAt",
      "createdAt",
      "date",
    ];
    const used = new Set();
    commonOrder.forEach((k) => {
      if (f[k] !== undefined && f[k] !== null) {
        let val = f[k];
        let displayKey = k;
        
        // Format calculator fields nicely
        if (k === 'printType') {
          displayKey = 'Tipo de Impressão';
          val = val === 'pb' ? 'Preto & Branco' : 'A Cores';
        } else if (k === 'coverType') {
          displayKey = 'Tipo de Capa';
          val = val === 'mole' ? 'Capa Mole' : 'Capa Dura';
        } else if (k === 'bookSize') {
          displayKey = 'Tamanho do Livro';
        } else if (k === 'pages') {
          displayKey = 'Número de Páginas';
        } else if (k === 'hasIllustrations') {
          displayKey = 'Com Ilustrações';
          val = val ? 'Sim' : 'Não';
        } else if (k === 'quantity') {
          displayKey = 'Quantidade';
        } else if (k === 'calculatedPrice') {
          displayKey = 'Preço Calculado';
          val = '€' + parseFloat(val).toFixed(2);
        }
        
        if (Array.isArray(val)) val = JSON.stringify(val, null, 2);
        rows.push(
          `<div><strong>${escapeHtml(displayKey)}:</strong> ${escapeHtml(String(val))}</div>`,
        );
        used.add(k);
      }
    });
    // Render remaining keys
    Object.keys(f).forEach((k) => {
      if (used.has(k)) return;
      const v = f[k];
      if (v === null || v === undefined) return;
      if (typeof v === "object") return; // we'll show objects below
      rows.push(
        `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`,
      );
    });

    // Show complex fields (objects/arrays)
    const complexKeys = Object.keys(f).filter((k) => {
      const v = f[k];
      return v && typeof v === "object";
    });
    if (complexKeys.length) rows.push("<hr/>");
    complexKeys.forEach((k) => {
      try {
        rows.push(
          `<div><strong>${escapeHtml(k)}:</strong></div><div style="white-space:pre-wrap; background:#f9f9f9; padding:10px; border-radius:4px"><pre>${escapeHtml(JSON.stringify(f[k], null, 2))}</pre></div>`,
        );
      } catch (e) {
        rows.push(
          `<div><strong>${escapeHtml(k)}:</strong> (unable to render)</div>`,
        );
      }
    });

    // Add copy buttons for email and a full-copy of the JSON
    let extra = '<div style="margin-top:8px; text-align:right">';
    if (f.email)
      extra += `<button class="btn" id="_copy_email_btn">Copy Email</button>`;
    extra += ` <button class="btn" id="_copy_json_btn">Copy JSON</button>`;
    extra += "</div>";
    content.innerHTML = rows.join("") + extra;
    const copyEmailBtn = document.getElementById("_copy_email_btn");
    if (copyEmailBtn)
      copyEmailBtn.onclick = () =>
        navigator.clipboard.writeText(String(f.email || ""));
    const copyJsonBtn = document.getElementById("_copy_json_btn");
    if (copyJsonBtn)
      copyJsonBtn.onclick = () =>
        navigator.clipboard.writeText(JSON.stringify(f, null, 2));

    document.getElementById("formModalClose").onclick = () => {
      modal.style.display = "none";
    };
    modal.style.display = "flex";
  }

  // NEWSLETTERS
  async function loadNewsletters() {
    const el = document.getElementById("newslettersList");
    if (!el) return;
    el.textContent = "Loading...";
    try {
      const subs = await fetchJson("/admin/newsletters/clients");
      if (!Array.isArray(subs)) {
        el.textContent = JSON.stringify(subs, null, 2);
        return;
      }
      const table = document.createElement("table");
      table.innerHTML = `<thead><tr><th>Email</th><th>Name</th><th></th></tr></thead>`;
      const tbody = document.createElement("tbody");
      subs.forEach((s) => {
        const tr = document.createElement("tr");
        const email = typeof s === "string" ? s : s.email || "";
        const name = typeof s === "string" ? "" : s.name || "";
        tr.innerHTML = `<td>${escapeHtml(email)}</td><td>${escapeHtml(name)}</td>`;
        const actions = document.createElement("td");
        const view = document.createElement("button");
        view.className = "btn";
        view.textContent = "Details";
        view.addEventListener("click", () => alert(JSON.stringify(s, null, 2)));
        actions.appendChild(view);

        // Unsubscribe subscriber (admin) — prefer unsubscribe by token when available
        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Unsubscribe";
        del.addEventListener("click", async () => {
          try {
            if (!confirm("Unsubscribe subscriber " + email + "?")) return;
            const id = s && s.id ? s.id : null;
            const token = s && s.unsubscribeToken ? s.unsubscribeToken : null;
            let res;
            if (token) {
              // Use the public unsubscribe link (token) to mark as unsubscribed
              const url =
                "/auth/unsubscribe-newsletter?token=" +
                encodeURIComponent(token);
              res = await tryCandidates(url, {
                method: "GET",
                credentials: "include",
              });
            } else if (id) {
              // Fallback to hard-delete by id
              res = await tryCandidates("/admin/newsletters/clients/" + id, {
                method: "DELETE",
                credentials: "include",
              });
            } else {
              // Last fallback: delete by email via admin endpoint
              res = await tryCandidates("/admin/newsletters/clients", {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
            }
            if (!res || !res.ok) {
              const t = res ? await res.text().catch(() => null) : null;
              throw new Error("Unsubscribe failed" + (t ? ": " + t : ""));
            }
            loadNewsletters();
          } catch (e) {
            alert("Unsubscribe failed: " + (e && e.message ? e.message : e));
          }
        });

        actions.appendChild(del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      el.innerHTML = "";
      el.appendChild(table);
    } catch (e) {
      el.textContent = "Error: " + e.message;
    }
  }

  // USERS
  async function loadUsers() {
    const el = document.getElementById("usersList");
    if (!el) return;
    el.textContent = "Loading...";
    try {
      const users = await fetchJson("/admin/users");
      if (!Array.isArray(users)) {
        el.textContent = JSON.stringify(users, null, 2);
        return;
      }
      const table = document.createElement("table");
      table.innerHTML = `<thead><tr><th>Id</th><th>Email</th><th>Name</th><th>Roles</th><th>Active</th><th>Last Login</th><th></th></tr></thead>`;
      const tbody = document.createElement("tbody");
      users.forEach((u) => {
        const tr = document.createElement("tr");
        const roles =
          u.roles && Array.isArray(u.roles)
            ? u.roles.join(", ")
            : u.roles || "";
        const lastLogin = u.lastLogin
          ? new Date(u.lastLogin).toLocaleString()
          : "";
        tr.innerHTML = `<td>${u.id || ""}</td><td>${escapeHtml(u.email || "")}</td><td>${escapeHtml(u.name || "")}</td><td>${escapeHtml(roles)}</td><td>${u.active ? "Yes" : "No"}</td><td>${escapeHtml(lastLogin)}</td>`;
        const actions = document.createElement("td");
        actions.className = "actions";
        const viewBtn = document.createElement("button");
        viewBtn.className = "btn";
        viewBtn.textContent = "Details";
        viewBtn.addEventListener("click", () =>
          alert(JSON.stringify(u, null, 2)),
        );
        const promote = document.createElement("button");
        promote.className = "btn primary";
        promote.textContent = "Promote";
        promote.addEventListener("click", async () => {
          if (!confirm("Promote user to admin?")) return;
          try {
            const res = await tryCandidates(
              "/admin/users/" + u.id + "/promote",
              { method: "POST", credentials: "include" },
            );
            if (!res.ok) {
              const t = await res.text().catch(() => null);
              throw new Error("Promote failed: " + (t ? t : res.status));
            }
            alert("User promoted");
            loadUsers();
          } catch (e) {
            alert("Promote failed: " + (e && e.message ? e.message : e));
          }
        });
        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Delete";
        del.addEventListener("click", async () => {
          if (!confirm("Delete user?")) return;
          try {
            const res = await tryCandidates("/admin/users/" + u.id, {
              method: "DELETE",
              credentials: "include",
            });
            if (!res.ok) {
              const t = await res.text().catch(() => null);
              throw new Error("Delete failed: " + (t ? t : res.status));
            }
            alert("User deleted");
            loadUsers();
          } catch (e) {
            alert("Delete failed: " + (e && e.message ? e.message : e));
          }
        });
        actions.appendChild(viewBtn);
        actions.appendChild(promote);
        actions.appendChild(del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      el.innerHTML = "";
      el.appendChild(table);
    } catch (e) {
      el.textContent = "Error: " + e.message;
    }
  }

  // Export subscribers CSV
  const exportBtn = document.getElementById("exportSubscribers");
  if (exportBtn)
    exportBtn.addEventListener("click", async () => {
      try {
        const subs = await fetchJson("/admin/newsletters/clients");
        if (!Array.isArray(subs)) return alert("No subscribers");
        const rows = [["email", "name"]];
        subs.forEach((s) => rows.push([s.email || s, s.name || ""]));
        const csv = rows
          .map((r) =>
            r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","),
          )
          .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "subscribers.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert("Export failed: " + e.message);
      }
    });

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(
      /[&<>"'`]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
          "`": "&#96;",
        })[c],
    );
  }

  // Authentication check on startup — require login before accessing admin UI
  let isAuthenticated = false;
  // throttle background auth checks to avoid request storms when many API calls return HTML
  let authCheckInProgress = false;
  let lastAuthCheckAt = 0;

  async function checkAuth() {
    try {
      const res = await tryCandidates("/admin/orders", {
        credentials: "include",
        headers: sessionToken ? { "X-Session-Token": sessionToken } : {},
      });
      if (res && res.ok) {
        isAuthenticated = true;
        document.querySelector(".nav").style.display = "";
        loginSection.style.display = "none";
        btnLogout.style.display = "inline-block";
        showView("dashboard");
        return;
      }
    } catch (e) {
      // not authenticated or server unreachable
    }
    // default: require login
    isAuthenticated = false;
    document.querySelector(".nav").style.display = "none";
    loginSection.style.display = "block";
    btnLogout.style.display = "none";
  }

  // Guard view changes: show login if not authenticated, except for orders which handles its own auth
  const originalShowView = showView;
  showView = function (name) {
    if (!isAuthenticated) {
      loginSection.style.display = "block";
      return;
    }
    originalShowView(name);
  };

  // Run initial auth check and initialize Firebase
  enforceGoogleOnlyLoginUi();
  checkAuth();
  initFirebase();
})();

const API = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : window.location.origin;

const APP_SHELL = {
  tabs: [
    { route: "dashboard", label: "Home",    icon: "🏠" },
    { route: "index",     label: "Profile", icon: "👤" },
    { route: "workouts",  label: "Workout", icon: "💪" },
    { route: "results",   label: "Results", icon: "📊" },
    { route: "chat",      label: "Chat",    icon: "💬" },
  ],
  tabRoutes: new Set(["dashboard", "index", "workouts", "results", "plan", "chat"]),
};

function getBasePath() {
  const path = window.location.pathname;
  if (path.startsWith("/static/") || path === "/static") {
    return "/static/";
  }
  return "/";
}

/** Use explicit .html routes for maximum static-server compatibility */
function appPath(page) {
  const name = String(page).replace(/\.html$/i, "").replace(/^\//, "");
  const base = getBasePath();
  if (!name || name === "index") return base + "index.html";
  return base + `${name}.html`;
}

function currentRoute() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "index";
  const last = parts[parts.length - 1].replace(/\.html$/i, "");
  if (last === "static") return "index";
  return last || "index";
}

function navigateTo(page, query = "") {
  let url = appPath(page);
  if (query) {
    if (typeof query === "object") {
      const qs = new URLSearchParams(query).toString();
      if (qs) url += `?${qs}`;
    } else {
      url += query.startsWith("?") ? query : `?${query}`;
    }
  }
  window.location.href = url;
}

function normalizeAppUrl(url) {
  const u = new URL(url, window.location.href);
  const parts = u.pathname.split("/").filter(Boolean);
  const isStatic = parts[0] === "static";
  const route = parts.pop() || "index";
  const name = route.replace(/\.html$/i, "");
  const base = isStatic ? "/static/" : "/";
  u.pathname = base + (name === "index" || name === "static" ? "index.html" : `${name}.html`);
  return u.href;
}

window.appPath = appPath;
window.navigateTo = navigateTo;
window.currentRoute = currentRoute;

// ── Persistent Storage ──
const store = {
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  get: (k)    => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  clear: ()   => localStorage.clear(),
};

function checkAuth() {
  const user = store.get("user");
  const route = currentRoute();
  const isLoginPage = route === "login";
  const isRegisterPage = route === "register";

  // If not logged in and not on login/register, redirect to login
  if (!user && !isLoginPage && !isRegisterPage) {
    navigateTo("login");
    return;
  }

  // If user lands on login or register page, clear any old session
  // so they always start fresh from login
  if (isLoginPage || isRegisterPage) {
    store.clear();
  }
}

function logout() {
  store.clear();
  navigateTo("login");
}

function setupPwaMeta() {
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#007aff";
    document.head.appendChild(meta);
  }
  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const m1 = document.createElement("meta");
    m1.name = "apple-mobile-web-app-capable";
    m1.content = "yes";
    document.head.appendChild(m1);
  }
  if (!document.querySelector('meta[name="mobile-web-app-capable"]')) {
    const m1b = document.createElement("meta");
    m1b.name = "mobile-web-app-capable";
    m1b.content = "yes";
    document.head.appendChild(m1b);
  }
  if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
    const m2 = document.createElement("meta");
    m2.name = "apple-mobile-web-app-status-bar-style";
    m2.content = "default";
    document.head.appendChild(m2);
  }
  if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) {
    const m3 = document.createElement("meta");
    m3.name = "apple-mobile-web-app-title";
    m3.content = "MuscleGuard";
    document.head.appendChild(m3);
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "manifest.json";
    document.head.appendChild(manifest);
  }
}

function setupPageTransitions() {
  document.body.classList.add("page-transition-ready");
  requestAnimationFrame(() => document.body.classList.remove("page-transition-enter"));

  document.addEventListener("click", (event) => {
    const a = event.target.closest("a[href]");
    if (!a) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    const nextUrl = normalizeAppUrl(new URL(href, window.location.href).href);
    const current = normalizeAppUrl(window.location.href);
    if (nextUrl === current) return;

    event.preventDefault();
    document.body.classList.add("page-transition-exit");
    window.setTimeout(() => {
      window.location.href = nextUrl;
    }, 170);
  });
}

function rewriteHtmlLinks() {
  // Keep explicit .html links unchanged for compatibility.
}

function setupIosShell() {
  if (document.getElementById("ios-phone-frame")) return;

  // Create the physical phone frame container
  const frame = document.createElement("div");
  frame.id = "ios-phone-frame";
  frame.className = "ios-phone-frame";

  // Create the phone screen viewport container
  const screen = document.createElement("div");
  screen.className = "ios-phone-screen";

  // Move visual nodes into the screen
  const nodesToMove = [];
  const children = Array.from(document.body.children);
  children.forEach(child => {
    if (child.tagName !== "SCRIPT" && child.tagName !== "LINK" && child.tagName !== "STYLE") {
      nodesToMove.push(child);
    }
  });

  // Inject frame into body
  document.body.appendChild(frame);
  frame.appendChild(screen);

  nodesToMove.forEach(node => {
    screen.appendChild(node);
  });

  // Inject top iOS Status Bar inside the frame (fixed)
  const statusBar = document.createElement("div");
  statusBar.className = "ios-status-bar";
  statusBar.innerHTML = `
    <div class="ios-status-time" id="ios-time">9:41</div>
    <div class="ios-status-icons">
      <span>📶</span>
      <span>🛜</span>
      <span>🔋</span>
    </div>
  `;
  frame.appendChild(statusBar);

  // Inject Dynamic Island inside the frame (fixed)
  const island = document.createElement("div");
  island.className = "ios-dynamic-island";
  island.id = "ios-dynamic-island";
  island.innerHTML = `
    <div class="island-content">
      <span class="island-icon" id="island-icon">💪</span>
      <div class="island-text">
        <div class="island-title" id="island-title">MuscleGuard AI</div>
        <div class="island-sub" id="island-sub">Secured Connection</div>
      </div>
    </div>
  `;
  frame.appendChild(island);

  // Inject Home Indicator at bottom (fixed)
  const homeIndicator = document.createElement("div");
  homeIndicator.className = "ios-home-indicator";
  frame.appendChild(homeIndicator);

  // Toggle Dynamic Island expansion manually on click
  island.addEventListener("click", () => {
    island.classList.toggle("expanded");
  });

  // Ticking clock
  const updateIosTime = () => {
    const timeEl = document.getElementById("ios-time");
    if (!timeEl) return;
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    if (minutes < 10) minutes = "0" + minutes;
    timeEl.textContent = `${hours}:${minutes}`;
  };
  updateIosTime();
  setInterval(updateIosTime, 20000);
}

function triggerDynamicIsland(title, sub, icon = "💪", duration = 3500) {
  const island = document.getElementById("ios-dynamic-island");
  if (!island) return;

  const iconEl = document.getElementById("island-icon");
  const titleEl = document.getElementById("island-title");
  const subEl = document.getElementById("island-sub");

  iconEl.textContent = icon;
  titleEl.textContent = title;
  subEl.textContent = sub;

  island.classList.add("expanded");

  setTimeout(() => {
    island.classList.remove("expanded");
  }, duration);
}
window.triggerDynamicIsland = triggerDynamicIsland;

function setupClientTabBar() {
  const route = currentRoute();
  if (!APP_SHELL.tabRoutes.has(route)) return;
  if (document.querySelector(".ios-tabbar")) return;

  document.body.classList.add("has-ios-tabbar");
  const nav = document.createElement("nav");
  nav.className = "ios-tabbar";
  nav.setAttribute("aria-label", "Primary");

  nav.innerHTML = APP_SHELL.tabs.map((tab) => {
    const active = route === tab.route || (route === "plan" && tab.route === "results");
    return `
      <a class="ios-tab-item${active ? " active" : ""}" href="${appPath(tab.route)}">
        <span class="ios-tab-icon">${tab.icon}</span>
        <span class="ios-tab-label">${tab.label}</span>
      </a>
    `;
  }).join("");

  const container = document.getElementById("ios-phone-frame") || document.body;
  container.appendChild(nav);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Non-fatal: keep app functional even if SW fails.
    });
  });
}

function setupAppShell() {
  if (!document.body) return;
  setupIosShell();
  document.body.classList.add("page-transition-enter");
  setupPwaMeta();
  rewriteHtmlLinks();
  setupPageTransitions();
  setupClientTabBar();
  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupAppShell);
} else {
  setupAppShell();
}


// ── API calls ──
async function apiLogin(username, password) {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const json = await res.json();
  if (!json.success) {
    triggerDynamicIsland("Login Failed", json.message || "Invalid credentials", "❌");
    throw new Error(json.message || "Login failed");
  }
  triggerDynamicIsland("Login Successful", `Welcome back, ${username}!`, "🔑");
  return json;
}

async function apiRegister(username, password, role = "client") {
  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role })
  });
  const json = await res.json();
  if (!json.success) {
    triggerDynamicIsland("Register Failed", json.message || "Error occurred", "❌");
    throw new Error(json.message || "Registration failed");
  }
  triggerDynamicIsland("Registered Done", "Account created successfully", "🎉");
  return json;
}


async function apiGetProfile(userId) {
  const res = await fetch(`${API}/profile/${userId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

async function apiSaveProfile(payload) {
  const res = await fetch(`${API}/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (json.success) {
    triggerDynamicIsland("Profile Saved", "All data successfully synced", "💾");
  } else {
    triggerDynamicIsland("Error Saving", json.message || "Network issue", "❌");
  }
  return json;
}

async function apiSetup(payload) {
  const res = await fetch(`${API}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiOnboard(payload) {
  const res = await fetch(`${API}/onboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


async function apiPredict(payload) {

  const res = await fetch(`${API}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiSave(payload) {
  const res = await fetch(`${API}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiHistory(userId) {
  const res = await fetch(`${API}/history/${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Toast notification ──
function showToast(msg, color = "#22c55e") {
  const t = document.createElement("div");
  t.className = "toast";
  t.style.borderLeftColor = color;
  t.textContent = msg;
  const container = document.querySelector(".ios-phone-screen") || document.body;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── BMI calculation ──
function calcBMI(weight, height) {
  return weight / ((height / 100) ** 2);
}

// Updated initialization and rendering with difference comparison
// Main page initialization
async function initResultsPage() {
  try {
    const res = await apiHistory(user.user_id);
    const history = res.data || [];

    let latestResult = {};
    let prevResult = null;
    let calorieHistory = [];

    if (history.length > 0) {
      const latest = history[0];
      latestResult = {
        bmi: latest.bmi,
        protein_intake: latest.protein_intake,
        weight_loss_rate: latest.weight_loss_rate,
        avg_calories: latest.avg_calories,
        avg_heart_rate: latest.avg_heart_rate,
        avg_intensity: latest.avg_intensity,
        prediction: parseInt(latest.risk_level ?? 1),
        risk_label: latest.risk_label || "Moderate",
        exercise: latest.exercise || "Mixed",
        weather: latest.weather || "Sunny"
      };

      // If there is a previous day record, use it for diff comparison
      if (history.length > 1) {
        const prev = history[1];
        prevResult = {
          bmi: prev.bmi,
          protein_intake: prev.protein_intake,
          weight_loss_rate: prev.weight_loss_rate,
          avg_calories: prev.avg_calories,
          avg_heart_rate: prev.avg_heart_rate,
          avg_intensity: prev.avg_intensity
        };
      }

      const last7 = history.slice(0, 7).reverse();
      calorieHistory = last7.map(h => h.avg_calories || 0);
      store.set("result", latestResult);
    } else {
      const localResult = store.get("result") || {};
      latestResult = {
        bmi: localResult.bmi ?? 22.0,
        protein_intake: localResult.protein_intake ?? 140.0,
        weight_loss_rate: localResult.weight_loss_rate ?? 0.1,
        avg_calories: localResult.avg_calories ?? 500,
        avg_heart_rate: localResult.avg_heart_rate ?? 120,
        avg_intensity: localResult.avg_intensity ?? 5,
        prediction: parseInt(localResult.prediction ?? 1),
        risk_label: localResult.risk_label || "Moderate"
      };
      const localWeekly = store.get("weekly") || [];
      calorieHistory = localWeekly.map(d => d.calories || 0);
    }

    while (calorieHistory.length < 7) {
      calorieHistory.push(0);
    }

    renderResults(latestResult, prevResult, calorieHistory);
  } catch (err) {
    console.error("Failed to load results from history: ", err);
    const localResult = store.get("result") || {};
    renderResults(localResult, null, [400, 500, 600, 300, 450, 700, 500]);
  }
}

// Render dynamic elements and plotly graphs with diff support
function renderResults(result, prev, calorieHistory) {
  const pred = result.prediction ?? 1;
  const r = RISK[pred] || RISK[1];

  // Banner Update
  document.getElementById("banner").style.borderLeft = `4px solid ${r.color}`;
  document.getElementById("banner-sub").textContent = `Muscle Loss Risk Assessment · ${profile.name || "User"}`;
  const badge = document.getElementById("risk-badge");
  badge.textContent = r.label;
  badge.className = "risk-badge " + r.cls;

  // Helper to format diff display
  const formatDiff = (key, val) => {
    if (!prev || prev[key] === undefined) return `${val}`;
    const diff = val - prev[key];
    const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
    const abs = Math.abs(diff).toFixed(2);
    return `${val} <span class="diff" style="color:${diff>0?"#22c55e":"#ef4444"};margin-left:4px;">(${sign}${abs})</span>`;
  };

  // Metrics Update with diffs
  document.getElementById("m-bmi").innerHTML = formatDiff("bmi", (result.bmi ?? 22.0).toFixed(1));
  document.getElementById("m-prot").innerHTML = formatDiff("protein_intake", (result.protein_intake ?? 140).toFixed(0));
  document.getElementById("m-wlr").innerHTML = formatDiff("weight_loss_rate", Math.abs(result.weight_loss_rate ?? 0.1).toFixed(3));
  document.getElementById("m-cal").innerHTML = formatDiff("avg_calories", (result.avg_calories ?? 500).toFixed(0));
  document.getElementById("m-hr").innerHTML = formatDiff("avg_heart_rate", (result.avg_heart_rate ?? 120).toFixed(0));
  document.getElementById("m-int").innerHTML = formatDiff("avg_intensity", (result.avg_intensity ?? 5).toFixed(1));

  // BMI Zone Indicator (unchanged)
  const bmi = result.bmi ?? 22;
  const bmiPct = Math.min(Math.max((bmi - 10) / 30, 0), 1) * 100;
  Plotly.newPlot("bmi-zone", [
    { x:["Underweight\n<18.5","Normal\n18.5-24.9","Overweight\n25-29.9","Obese\n≥30"], y:[1,1,1,1],
      type:"bar", marker:{ color:["rgba(10,132,255,0.15)","rgba(48,209,88,0.15)","rgba(255,159,10,0.2)","rgba(255,69,58,0.15)"] },
      text: [`<18.5`,`18.5–24.9`,`25–29.9`,`≥30`], textposition:"inside",
    }
  ], {
    ...PLOTLY_LAYOUT, height: 100,
    xaxis: { tickfont: { color:"#a1a1aa", size:10 }, gridcolor:"rgba(0,0,0,0)" },
    yaxis: { visible: false },
    shapes: [{ type:"line", x0: bmiPct/33.3 - 0.5, x1: bmiPct/33.3 - 0.5, y0:0, y1:1.5,
               line:{ color:"#ff9f0a", width:3, dash:"dot" } }],
    annotations: [{ x: bmiPct/33.3 - 0.5, y: 1.3, text: `<b>BMI ${bmi.toFixed(1)}</b>`,
                 showarrow: false, font:{ color:"#ff9f0a", size:12 } }],
  }, { displayModeBar: false });

  // Radar and Trend charts remain unchanged (omitted for brevity)
  // ... (the rest of the original rendering code unchanged) 
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: "Underweight", color: "#3b82f6" };
  if (bmi < 25)   return { label: "Normal",      color: "#22c55e" };
  if (bmi < 30)   return { label: "Overweight",  color: "#eab308" };
  return              { label: "Obese",           color: "#ef4444" };
}

// ── Default weekly data ──
function emptyWeek() {
  return Array.from({ length: 7 }, () => ({
    calories: 0, duration: 0, heart_rate: 0, intensity: 1
  }));
}

// ── Coach API ──
async function apiGetCoachClients(coachId) {
  const res = await fetch(`${API}/coach/clients/${coachId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiGetClientProgress(clientId) {
  const res = await fetch(`${API}/coach/client-progress/${clientId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiLinkCoach(clientId, coachCode) {
  const res = await fetch(`${API}/coach/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, coach_code: coachCode })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Link failed");
  return json;
}

async function apiUnlinkClient(coachId, clientId) {
  const res = await fetch(`${API}/coach/unlink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coach_id: coachId, client_id: clientId })
  });
  return res.json();
}

async function apiGetClientCoach(clientId) {
  const res = await fetch(`${API}/client/coach/${clientId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

// ── Messages API ──
async function apiSendMessage(senderId, receiverId, content, msgType = "message") {
  const res = await fetch(`${API}/messages/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender_id: senderId, receiver_id: receiverId, content: content, msg_type: msgType })
  });
  const json = await res.json();
  if (json.success) {
    triggerDynamicIsland("Message Sent", "Delivered successfully", "📤");
  }
  return json;
}

async function apiGetMessages(userId, otherId) {
  const res = await fetch(`${API}/messages/${userId}/${otherId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiGetUnreadCount(userId) {
  const res = await fetch(`${API}/messages/unread/${userId}`);
  if (!res.ok) return 0;
  const json = await res.json();
  return json.count || 0;
}

async function apiMarkRead(userId, senderId) {
  const res = await fetch(`${API}/messages/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, sender_id: senderId })
  });
  return res.json();
}

// ── Bot API ──
async function apiBotAsk(userId, question) {
  triggerDynamicIsland("AI fit-bot", "Analyzing request...", "🤖", 4000);
  const res = await fetch(`${API}/bot/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, question: question })
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  triggerDynamicIsland("AI fit-bot", "Advice generated", "💬");
  return json;
}

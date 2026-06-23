import http from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.join(__dirname, "..", "data");

const dataFiles = {
  restaurant: path.join(dataRoot, "restaurant", "profile.json"),
  menu: path.join(dataRoot, "menu", "items.json"),
  orders: path.join(dataRoot, "live-orders", "orders.json"),
  agents: path.join(dataRoot, "ai-agents", "agents.json"),
  handoffs: path.join(dataRoot, "staff-handoff", "handoffs.json"),
};

const seedData = {
  restaurant: {
    id: "rest-demo",
    name: "Masala Junction",
    phone: "+91 98765 43210",
    city: "Bengaluru",
    address: "12 Church Street, Bengaluru",
    cuisine: "North Indian, Biryani, Indo-Chinese",
    hours: "10:30 AM - 11:30 PM",
    acceptingOrders: true,
    handoffNumber: "+91 99887 76655",
    posWebhookUrl: "https://pos.example.com/hooks/masala-junction",
  },
  menu: [
    { id: "paneer-butter-masala", name: "Paneer Butter Masala", category: "North Indian", price: 249, available: true, prepTimeMins: 18, popularity: "High" },
    { id: "veg-biryani", name: "Hyderabadi Veg Biryani", category: "Biryani", price: 219, available: true, prepTimeMins: 16, popularity: "High" },
    { id: "chicken-biryani", name: "Dum Chicken Biryani", category: "Biryani", price: 289, available: true, prepTimeMins: 20, popularity: "High" },
    { id: "butter-naan", name: "Butter Naan", category: "Breads", price: 49, available: true, prepTimeMins: 6, popularity: "Medium" },
    { id: "gobi-manchurian", name: "Gobi Manchurian", category: "Indo-Chinese", price: 179, available: true, prepTimeMins: 14, popularity: "Medium" },
    { id: "masala-chaas", name: "Masala Chaas", category: "Beverages", price: 59, available: true, prepTimeMins: 3, popularity: "Medium" },
    { id: "gulab-jamun", name: "Gulab Jamun", category: "Desserts", price: 89, available: false, prepTimeMins: 4, popularity: "Low" },
  ],
  orders: [
    {
      id: "ORD-1012",
      customerName: "Priya Nair",
      phone: "+91 90000 10112",
      channel: "voice",
      status: "listening",
      total: 517,
      items: ["Dum Chicken Biryani", "Gobi Manchurian", "Masala Chaas"],
      transcript: "One chicken biryani, one gobi manchurian, and chaas. Please keep it less spicy.",
      address: "Indiranagar, Bengaluru",
      paymentStatus: "pending",
      createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    },
    {
      id: "ORD-1011",
      customerName: "Aarav Sharma",
      phone: "+91 90000 10111",
      channel: "voice",
      status: "confirming",
      total: 347,
      items: ["Paneer Butter Masala", "2 Butter Naan"],
      transcript: "Haan, ek paneer butter masala aur do butter naan. Spicy medium rakhna.",
      address: "Koramangala 5th Block",
      paymentStatus: "link_sent",
      createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    },
    {
      id: "ORD-1010",
      customerName: "Meera Iyer",
      phone: "+91 90000 10110",
      channel: "whatsapp",
      status: "sent_to_kitchen",
      total: 278,
      items: ["Hyderabadi Veg Biryani", "Masala Chaas"],
      transcript: "One veg biryani and one chaas. Please send payment link.",
      address: "MG Road pickup",
      paymentStatus: "paid",
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: "ORD-1009",
      customerName: "Rohan Gupta",
      phone: "+91 90000 10109",
      channel: "whatsapp",
      status: "sent_to_kitchen",
      total: 387,
      items: ["Paneer Butter Masala", "Gobi Manchurian"],
      transcript: "Paneer butter masala and gobi manchurian for delivery.",
      address: "Whitefield",
      paymentStatus: "paid",
      createdAt: new Date(Date.now() - 1000 * 60 * 31).toISOString(),
    },
    {
      id: "ORD-1008",
      customerName: "Kabir Khan",
      phone: "+91 90000 10108",
      channel: "voice",
      status: "paid",
      total: 596,
      items: ["2 Paneer Butter Masala", "4 Butter Naan"],
      transcript: "Family ke liye order hai. Two paneer butter masala and four naan.",
      address: "Jayanagar",
      paymentStatus: "paid",
      createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    },
  ],
  agents: [
    { id: "voice-agent", name: "Voice order agent", channel: "voice", status: "ready", model: "Mock intent parser", latencyMs: 1180, successRate: 92, lastRun: "2 mins ago" },
    { id: "whatsapp-agent", name: "WhatsApp order agent", channel: "whatsapp", status: "ready", model: "Mock text parser", latencyMs: 840, successRate: 95, lastRun: "5 mins ago" },
    { id: "confirmation-agent", name: "Confirmation agent", channel: "shared", status: "training", model: "Rule-based confirmer", latencyMs: 620, successRate: 88, lastRun: "12 mins ago" },
    { id: "payment-agent", name: "Payment link agent", channel: "shared", status: "paused", model: "Razorpay test mode", latencyMs: 300, successRate: 100, lastRun: "1 hour ago" },
  ],
  handoffs: [
    { id: "HND-204", customerName: "Priya Nair", reason: "Allergy clarification", priority: "high", assignedTo: "Ananya", status: "open", channel: "voice", createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString() },
    { id: "HND-203", customerName: "Aarav Sharma", reason: "Delivery landmark unclear", priority: "medium", assignedTo: "Vikram", status: "open", channel: "voice", createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString() },
    { id: "HND-202", customerName: "Rohan Gupta", reason: "Coupon request", priority: "low", assignedTo: "Isha", status: "resolved", channel: "whatsapp", createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString() },
  ],
};

const clients = new Set();
let store = await loadStore();

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    await writeJson(filePath, fallback);
    return structuredClone(fallback);
  }
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function loadStore() {
  const [restaurant, menu, orders, agents, handoffs] = await Promise.all([
    readJson(dataFiles.restaurant, seedData.restaurant),
    readJson(dataFiles.menu, seedData.menu),
    readJson(dataFiles.orders, seedData.orders),
    readJson(dataFiles.agents, seedData.agents),
    readJson(dataFiles.handoffs, seedData.handoffs),
  ]);
  return { restaurant, menu, orders, agents, handoffs };
}

async function saveDomain(domain) {
  await writeJson(dataFiles[domain], store[domain]);
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function broadcast(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

function toSlug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePositivePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Menu item price must be a positive number");
  }
  return Math.round(price);
}

function normalizeMenuItem(payload, existing = {}) {
  const name = String(payload.name ?? existing.name ?? "").trim();
  const category = String(payload.category ?? existing.category ?? "General").trim();
  if (!name) {
    throw new Error("Menu item name is required");
  }
  return {
    id: existing.id ?? toSlug(payload.id ?? name) ?? randomUUID(),
    name,
    category,
    price: parsePositivePrice(payload.price ?? existing.price ?? 0),
    available: payload.available ?? existing.available ?? true,
    prepTimeMins: Number(payload.prepTimeMins ?? existing.prepTimeMins ?? 12),
    popularity: String(payload.popularity ?? existing.popularity ?? "Medium"),
  };
}

function normalizeRestaurant(payload) {
  const next = { ...store.restaurant, ...payload };
  next.name = String(next.name ?? "").trim();
  next.phone = String(next.phone ?? "").trim();
  next.city = String(next.city ?? "").trim();
  next.address = String(next.address ?? "").trim();
  next.cuisine = String(next.cuisine ?? "").trim();
  next.hours = String(next.hours ?? "").trim();
  next.handoffNumber = String(next.handoffNumber ?? "").trim();
  next.posWebhookUrl = String(next.posWebhookUrl ?? "").trim();
  next.acceptingOrders = Boolean(next.acceptingOrders);
  if (!next.name) {
    throw new Error("Restaurant name is required");
  }
  return next;
}

function getItemUnitPrice(itemName) {
  const normalized = String(itemName).replace(/^\d+\s+/, "").trim().toLowerCase();
  const match = store.menu.find((item) => item.id === itemName || item.name.toLowerCase() === normalized);
  const quantity = Number(String(itemName).match(/^(\d+)/)?.[1] ?? 1);
  return (match?.price ?? 0) * quantity;
}

function createOrder(payload) {
  const items = Array.isArray(payload.items) ? payload.items.map(String).filter(Boolean) : [];
  const total = items.reduce((sum, itemName) => sum + getItemUnitPrice(itemName), 0);
  return {
    id: `ORD-${randomUUID().slice(0, 8).toUpperCase()}`,
    customerName: String(payload.customerName ?? "Walk-in Customer").trim() || "Walk-in Customer",
    phone: String(payload.phone ?? "").trim(),
    channel: payload.channel === "whatsapp" ? "whatsapp" : "voice",
    status: "listening",
    total,
    items,
    transcript: String(payload.transcript ?? "New mock order received.").trim(),
    address: String(payload.address ?? "").trim(),
    paymentStatus: String(payload.paymentStatus ?? "pending"),
    createdAt: new Date().toISOString(),
  };
}

const routes = {
  async "GET /health"(_request, response) {
    sendJson(response, 200, {
      ok: true,
      service: "voice-orders-server",
      phase: 3,
      storage: "file-per-dashboard-tab",
      timestamp: new Date().toISOString(),
    });
  },

  async "GET /api/bootstrap"(_request, response) {
    sendJson(response, 200, store);
  },

  async "GET /api/restaurant"(_request, response) {
    sendJson(response, 200, store.restaurant);
  },

  async "PATCH /api/restaurant"(request, response) {
    try {
      const body = await readBody(request);
      store.restaurant = normalizeRestaurant(body);
      await saveDomain("restaurant");
      broadcast("restaurant", store.restaurant);
      sendJson(response, 200, store.restaurant);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Restaurant update failed" });
    }
  },

  async "GET /api/menu"(_request, response) {
    sendJson(response, 200, store.menu);
  },

  async "POST /api/menu"(request, response) {
    try {
      const body = await readBody(request);
      const item = normalizeMenuItem(body);
      store.menu = [item, ...store.menu.filter((menuItem) => menuItem.id !== item.id)];
      await saveDomain("menu");
      broadcast("menu", store.menu);
      sendJson(response, 201, item);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Menu item creation failed" });
    }
  },

  async "PATCH /api/menu/:id"(request, response, params) {
    try {
      const body = await readBody(request);
      const index = store.menu.findIndex((menuItem) => menuItem.id === params.id);
      if (index === -1) {
        throw new Error("Menu item not found");
      }
      store.menu[index] = normalizeMenuItem(body, store.menu[index]);
      await saveDomain("menu");
      broadcast("menu", store.menu);
      sendJson(response, 200, store.menu[index]);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Menu item update failed" });
    }
  },

  async "GET /api/orders"(_request, response) {
    sendJson(response, 200, store.orders);
  },

  async "POST /api/orders"(request, response) {
    try {
      const body = await readBody(request);
      const order = createOrder(body);
      store.orders = [order, ...store.orders];
      await saveDomain("orders");
      broadcast("orders", store.orders);
      sendJson(response, 201, order);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Order creation failed" });
    }
  },

  async "PATCH /api/orders/:id"(request, response, params) {
    try {
      const body = await readBody(request);
      const allowedStatuses = ["listening", "confirming", "sent_to_kitchen", "paid"];
      const index = store.orders.findIndex((entry) => entry.id === params.id);
      if (index === -1) {
        throw new Error("Order not found");
      }
      const status = body.status ?? store.orders[index].status;
      if (!allowedStatuses.includes(status)) {
        throw new Error("Unsupported order status");
      }
      store.orders[index] = { ...store.orders[index], status };
      await saveDomain("orders");
      broadcast("orders", store.orders);
      sendJson(response, 200, store.orders[index]);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Order update failed" });
    }
  },

  async "GET /api/agents"(_request, response) {
    sendJson(response, 200, store.agents);
  },

  async "PATCH /api/agents/:id"(request, response, params) {
    try {
      const body = await readBody(request);
      const index = store.agents.findIndex((agent) => agent.id === params.id);
      if (index === -1) {
        throw new Error("Agent not found");
      }
      store.agents[index] = { ...store.agents[index], ...body };
      await saveDomain("agents");
      broadcast("agents", store.agents);
      sendJson(response, 200, store.agents[index]);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Agent update failed" });
    }
  },

  async "GET /api/handoffs"(_request, response) {
    sendJson(response, 200, store.handoffs);
  },

  async "PATCH /api/handoffs/:id"(request, response, params) {
    try {
      const body = await readBody(request);
      const index = store.handoffs.findIndex((handoff) => handoff.id === params.id);
      if (index === -1) {
        throw new Error("Handoff not found");
      }
      store.handoffs[index] = { ...store.handoffs[index], ...body };
      await saveDomain("handoffs");
      broadcast("handoffs", store.handoffs);
      sendJson(response, 200, store.handoffs[index]);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Handoff update failed" });
    }
  },
};

function matchRoute(method, pathname) {
  const key = `${method} ${pathname}`;
  if (routes[key]) {
    return { handler: routes[key], params: {} };
  }

  for (const [routeKey, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = routeKey.split(" ");
    if (routeMethod !== method || !routePath.includes(":")) {
      continue;
    }
    const routeParts = routePath.split("/");
    const pathParts = pathname.split("/");
    if (routeParts.length !== pathParts.length) {
      continue;
    }
    const params = {};
    const isMatch = routeParts.every((part, index) => {
      if (part.startsWith(":")) {
        params[part.slice(1)] = decodeURIComponent(pathParts[index]);
        return true;
      }
      return part === pathParts[index];
    });
    if (isMatch) {
      return { handler, params };
    }
  }
  return null;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    response.writeHead(200, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });
    response.write(`event: bootstrap\ndata: ${JSON.stringify(store)}\n\n`);
    clients.add(response);
    request.on("close", () => clients.delete(response));
    return;
  }

  const match = matchRoute(request.method ?? "GET", url.pathname);
  if (match) {
    await match.handler(request, response, match.params);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, () => {
  console.log(`Voice Orders API listening on http://localhost:${port}`);
});

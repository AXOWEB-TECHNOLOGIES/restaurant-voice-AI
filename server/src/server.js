import http from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, "..", "data", "store.json");

const seedData = {
  restaurant: {
    id: "rest-demo",
    name: "Masala Junction",
    phone: "+91 98765 43210",
    city: "Bengaluru",
    address: "12 Church Street, Bengaluru",
    cuisine: "North Indian and Biryani",
    acceptingOrders: true,
    handoffNumber: "+91 99887 76655",
    posWebhookUrl: "",
  },
  menu: [
    {
      id: "paneer-butter-masala",
      name: "Paneer Butter Masala",
      category: "North Indian",
      price: 249,
      available: true,
    },
    {
      id: "veg-biryani",
      name: "Hyderabadi Veg Biryani",
      category: "Biryani",
      price: 219,
      available: true,
    },
    {
      id: "butter-naan",
      name: "Butter Naan",
      category: "Breads",
      price: 49,
      available: true,
    },
    {
      id: "masala-chaas",
      name: "Masala Chaas",
      category: "Beverages",
      price: 59,
      available: true,
    },
  ],
  orders: [
    {
      id: "ORD-1007",
      customerName: "Aarav Sharma",
      channel: "voice",
      status: "confirming",
      total: 347,
      items: ["Paneer Butter Masala", "2 Butter Naan"],
      transcript: "Haan, ek paneer butter masala aur do butter naan. Spicy medium rakhna.",
      createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    },
    {
      id: "ORD-1006",
      customerName: "Meera Iyer",
      channel: "whatsapp",
      status: "sent_to_kitchen",
      total: 278,
      items: ["Hyderabadi Veg Biryani", "Masala Chaas"],
      transcript: "One veg biryani and one chaas. Please send payment link.",
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: "ORD-1005",
      customerName: "Kabir Khan",
      channel: "voice",
      status: "paid",
      total: 596,
      items: ["2 Paneer Butter Masala", "4 Butter Naan"],
      transcript: "Family ke liye order hai. Two paneer butter masala and four naan.",
      createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    },
  ],
};

const clients = new Set();

let store = await loadStore();

async function loadStore() {
  try {
    const raw = await readFile(dataFile, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    await saveStore(seedData);
    return structuredClone(seedData);
  }
}

async function saveStore(nextStore = store) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(nextStore, null, 2)}\n`);
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
  };
}

function normalizeRestaurant(payload) {
  const next = {
    ...store.restaurant,
    ...payload,
  };

  next.name = String(next.name ?? "").trim();
  next.phone = String(next.phone ?? "").trim();
  next.city = String(next.city ?? "").trim();
  next.address = String(next.address ?? "").trim();
  next.cuisine = String(next.cuisine ?? "").trim();
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
  const match = store.menu.find((item) => {
    return item.id === itemName || item.name.toLowerCase() === normalized;
  });
  const quantity = Number(String(itemName).match(/^(\d+)/)?.[1] ?? 1);
  return (match?.price ?? 0) * quantity;
}

function createOrder(payload) {
  const items = Array.isArray(payload.items) ? payload.items.map(String).filter(Boolean) : [];
  const total = items.reduce((sum, itemName) => sum + getItemUnitPrice(itemName), 0);

  return {
    id: `ORD-${randomUUID().slice(0, 8).toUpperCase()}`,
    customerName: String(payload.customerName ?? "Walk-in Customer").trim() || "Walk-in Customer",
    channel: payload.channel === "whatsapp" ? "whatsapp" : "voice",
    status: "listening",
    total,
    items,
    transcript: String(payload.transcript ?? "New mock order received.").trim(),
    createdAt: new Date().toISOString(),
  };
}

async function updateStore(mutator) {
  const nextStore = structuredClone(store);
  const result = mutator(nextStore);
  store = nextStore;
  await saveStore();
  return result;
}

const routes = {
  async "GET /health"(_request, response) {
    sendJson(response, 200, {
      ok: true,
      service: "voice-orders-server",
      phase: 2,
      storage: "file",
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
      const restaurant = await updateStore((draft) => {
        draft.restaurant = normalizeRestaurant(body);
        return draft.restaurant;
      });
      broadcast("restaurant", restaurant);
      sendJson(response, 200, restaurant);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Restaurant update failed",
      });
    }
  },

  async "GET /api/menu"(_request, response) {
    sendJson(response, 200, store.menu);
  },

  async "POST /api/menu"(request, response) {
    try {
      const body = await readBody(request);
      const item = normalizeMenuItem(body);
      await updateStore((draft) => {
        draft.menu = [item, ...draft.menu.filter((menuItem) => menuItem.id !== item.id)];
        return item;
      });
      broadcast("menu", store.menu);
      sendJson(response, 201, item);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Menu item creation failed",
      });
    }
  },

  async "PATCH /api/menu/:id"(request, response, params) {
    try {
      const body = await readBody(request);
      let item;
      await updateStore((draft) => {
        const index = draft.menu.findIndex((menuItem) => menuItem.id === params.id);
        if (index === -1) {
          throw new Error("Menu item not found");
        }
        item = normalizeMenuItem(body, draft.menu[index]);
        draft.menu[index] = item;
        return item;
      });
      broadcast("menu", store.menu);
      sendJson(response, 200, item);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Menu item update failed",
      });
    }
  },

  async "GET /api/orders"(_request, response) {
    sendJson(response, 200, store.orders);
  },

  async "POST /api/orders"(request, response) {
    try {
      const body = await readBody(request);
      const order = createOrder(body);
      await updateStore((draft) => {
        draft.orders = [order, ...draft.orders];
        return order;
      });
      broadcast("orders", store.orders);
      sendJson(response, 201, order);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Order creation failed",
      });
    }
  },

  async "PATCH /api/orders/:id"(request, response, params) {
    try {
      const body = await readBody(request);
      const allowedStatuses = ["listening", "confirming", "sent_to_kitchen", "paid"];
      let order;
      await updateStore((draft) => {
        const index = draft.orders.findIndex((entry) => entry.id === params.id);
        if (index === -1) {
          throw new Error("Order not found");
        }
        const status = body.status ?? draft.orders[index].status;
        if (!allowedStatuses.includes(status)) {
          throw new Error("Unsupported order status");
        }
        draft.orders[index] = {
          ...draft.orders[index],
          status,
        };
        order = draft.orders[index];
        return order;
      });
      broadcast("orders", store.orders);
      sendJson(response, 200, order);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Order update failed",
      });
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

    request.on("close", () => {
      clients.delete(response);
    });
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

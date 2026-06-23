import React from "react";
import ReactDOM from "react-dom/client";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChefHat,
  Clock3,
  Headphones,
  IndianRupee,
  MapPin,
  MessageCircle,
  Mic2,
  Phone,
  PhoneCall,
  Plus,
  ShieldCheck,
  Store,
  Utensils,
} from "lucide-react";
import "./styles.css";

type TabId = "orders" | "restaurant" | "menu" | "agents" | "handoff";
type Channel = "voice" | "whatsapp" | "shared";
type OrderStatus = "listening" | "confirming" | "sent_to_kitchen" | "paid";

type Restaurant = {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  cuisine: string;
  hours: string;
  acceptingOrders: boolean;
  handoffNumber: string;
  posWebhookUrl: string;
};

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  prepTimeMins: number;
  popularity: string;
};

type Order = {
  id: string;
  customerName: string;
  phone: string;
  channel: Exclude<Channel, "shared">;
  status: OrderStatus;
  total: number;
  items: string[];
  transcript: string;
  address: string;
  paymentStatus: string;
  createdAt: string;
};

type Agent = {
  id: string;
  name: string;
  channel: Channel;
  status: "ready" | "training" | "paused";
  model: string;
  latencyMs: number;
  successRate: number;
  lastRun: string;
};

type Handoff = {
  id: string;
  customerName: string;
  reason: string;
  priority: "high" | "medium" | "low";
  assignedTo: string;
  status: "open" | "resolved";
  channel: Exclude<Channel, "shared">;
  createdAt: string;
};

type ApiData = {
  restaurant: Restaurant | null;
  menu: MenuItem[];
  orders: Order[];
  agents: Agent[];
  handoffs: Handoff[];
};

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "orders", label: "Live orders", icon: <Activity size={18} /> },
  { id: "restaurant", label: "Restaurant", icon: <Store size={18} /> },
  { id: "menu", label: "Menu", icon: <ChefHat size={18} /> },
  { id: "agents", label: "AI agents", icon: <Bot size={18} /> },
  { id: "handoff", label: "Staff handoff", icon: <Headphones size={18} /> },
];

const statusLabels: Record<OrderStatus, string> = {
  listening: "Listening",
  confirming: "Confirming",
  sent_to_kitchen: "Kitchen",
  paid: "Paid",
};

const statusTone: Record<OrderStatus | Agent["status"] | Handoff["priority"] | Handoff["status"], string> = {
  listening: "tone-blue",
  confirming: "tone-amber",
  sent_to_kitchen: "tone-green",
  paid: "tone-dark",
  ready: "tone-green",
  training: "tone-amber",
  paused: "tone-dark",
  high: "tone-red",
  medium: "tone-amber",
  low: "tone-blue",
  open: "tone-red",
  resolved: "tone-green",
};

const channelIcons: Record<Exclude<Channel, "shared">, React.ReactNode> = {
  voice: <PhoneCall size={16} />,
  whatsapp: <MessageCircle size={16} />,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function App() {
  const [activeTab, setActiveTab] = React.useState<TabId>("orders");
  const [data, setData] = React.useState<ApiData>({
    restaurant: null,
    menu: [],
    orders: [],
    agents: [],
    handoffs: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [apiState, setApiState] = React.useState<"checking" | "online" | "offline">("checking");
  const [selectedOrder, setSelectedOrder] = React.useState<string | null>(null);
  const [menuDraft, setMenuDraft] = React.useState({ name: "", category: "", price: "" });
  const [savingMenu, setSavingMenu] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch(`${apiBase}/api/bootstrap`);
        if (!response.ok) {
          throw new Error("API response failed");
        }
        const bootstrap = (await response.json()) as ApiData;
        if (!ignore) {
          setData(bootstrap);
          setSelectedOrder(bootstrap.orders[0]?.id ?? null);
          setApiState("online");
        }
      } catch {
        if (!ignore) {
          setApiState("offline");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  React.useEffect(() => {
    if (apiState !== "online") {
      return undefined;
    }

    const events = new EventSource(`${apiBase}/api/events`);
    events.addEventListener("bootstrap", (event) => {
      const bootstrap = JSON.parse((event as MessageEvent).data) as ApiData;
      setData(bootstrap);
      setSelectedOrder((current) => current ?? bootstrap.orders[0]?.id ?? null);
    });
    events.addEventListener("orders", (event) => {
      const orders = JSON.parse((event as MessageEvent).data) as Order[];
      setData((current) => ({ ...current, orders }));
      setSelectedOrder((current) => current ?? orders[0]?.id ?? null);
    });
    events.addEventListener("menu", (event) => {
      const menu = JSON.parse((event as MessageEvent).data) as MenuItem[];
      setData((current) => ({ ...current, menu }));
    });
    events.addEventListener("restaurant", (event) => {
      const restaurant = JSON.parse((event as MessageEvent).data) as Restaurant;
      setData((current) => ({ ...current, restaurant }));
    });
    events.addEventListener("agents", (event) => {
      const agents = JSON.parse((event as MessageEvent).data) as Agent[];
      setData((current) => ({ ...current, agents }));
    });
    events.addEventListener("handoffs", (event) => {
      const handoffs = JSON.parse((event as MessageEvent).data) as Handoff[];
      setData((current) => ({ ...current, handoffs }));
    });

    events.onerror = () => events.close();
    return () => events.close();
  }, [apiState]);

  async function addMenuItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMenu(true);
    try {
      const response = await fetch(`${apiBase}/api/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: menuDraft.name,
          category: menuDraft.category || "General",
          price: Number(menuDraft.price),
          available: true,
          prepTimeMins: 12,
          popularity: "New",
        }),
      });
      if (response.ok) {
        setMenuDraft({ name: "", category: "", price: "" });
      }
    } finally {
      setSavingMenu(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    const response = await fetch(`${apiBase}/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      return;
    }
    const order = (await response.json()) as Order;
    setData((current) => ({
      ...current,
      orders: current.orders.map((entry) => (entry.id === order.id ? order : entry)),
    }));
  }

  async function resolveHandoff(handoffId: string) {
    const response = await fetch(`${apiBase}/api/handoffs/${handoffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    if (!response.ok) {
      return;
    }
    const handoff = (await response.json()) as Handoff;
    setData((current) => ({
      ...current,
      handoffs: current.handoffs.map((entry) => (entry.id === handoff.id ? handoff : entry)),
    }));
  }

  const activeOrders = data.orders.filter((order) => order.status !== "paid");
  const kitchenOrders = data.orders.filter((order) => order.status === "sent_to_kitchen");
  const revenue = data.orders.reduce((sum, order) => sum + order.total, 0);
  const selected = data.orders.find((order) => order.id === selectedOrder) ?? data.orders[0];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Utensils size={22} />
          </span>
          <div>
            <strong>Voice Orders</strong>
            <span>Restaurant AI console</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Dashboard tabs">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={`api-pill ${apiState}`}>
          <span />
          API {apiState}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
          </div>
          <div className="topbar-meta">
            <strong>{data.restaurant?.name ?? "Restaurant setup"}</strong>
            <span>{data.restaurant?.city ?? "Local demo"}</span>
          </div>
        </header>

        {loading ? (
          <section className="empty-state">
            <Mic2 size={34} />
            <h2>Connecting to local API</h2>
            <p>Loading dashboard sections.</p>
          </section>
        ) : apiState === "offline" ? (
          <section className="empty-state">
            <ShieldCheck size={34} />
            <h2>Backend is offline</h2>
            <p>Start the server with npm run dev inside /server.</p>
          </section>
        ) : (
          <>
            <section className="metrics" aria-label="Summary metrics">
              <Metric icon={<PhoneCall size={20} />} label="Active orders" value={String(activeOrders.length)} />
              <Metric icon={<ChefHat size={20} />} label="In kitchen" value={String(kitchenOrders.length)} />
              <Metric icon={<IndianRupee size={20} />} label="Today revenue" value={formatCurrency(revenue)} />
              <Metric icon={<Headphones size={20} />} label="Open handoffs" value={String(data.handoffs.filter((h) => h.status === "open").length)} />
            </section>

            {activeTab === "orders" ? (
              <LiveOrdersSection
                orders={data.orders}
                selected={selected}
                selectedOrder={selectedOrder}
                setSelectedOrder={setSelectedOrder}
                updateOrderStatus={updateOrderStatus}
              />
            ) : null}
            {activeTab === "restaurant" ? <RestaurantSection restaurant={data.restaurant} /> : null}
            {activeTab === "menu" ? (
              <MenuSection
                addMenuItem={addMenuItem}
                menu={data.menu}
                menuDraft={menuDraft}
                savingMenu={savingMenu}
                setMenuDraft={setMenuDraft}
              />
            ) : null}
            {activeTab === "agents" ? <AgentsSection agents={data.agents} /> : null}
            {activeTab === "handoff" ? <HandoffSection handoffs={data.handoffs} resolveHandoff={resolveHandoff} /> : null}
          </>
        )}
      </section>
    </main>
  );
}

function LiveOrdersSection({
  orders,
  selected,
  selectedOrder,
  setSelectedOrder,
  updateOrderStatus,
}: {
  orders: Order[];
  selected?: Order;
  selectedOrder: string | null;
  setSelectedOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
}) {
  return (
    <section className="main-grid">
      <div className="panel">
        <PanelTitle eyebrow="Voice + WhatsApp" title="Live order queue" />
        <div className="order-list">
          {orders.map((order) => (
            <button
              className={`order-row ${selectedOrder === order.id ? "selected" : ""}`}
              key={order.id}
              onClick={() => setSelectedOrder(order.id)}
              type="button"
            >
              <span className="channel">{channelIcons[order.channel]}</span>
              <span>
                <strong>{order.customerName}</strong>
                <small>{order.items.join(", ")}</small>
              </span>
              <span className={`status ${statusTone[order.status]}`}>{statusLabels[order.status]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel detail-panel">
        {selected ? (
          <>
            <div className="detail-head">
              <div>
                <p className="eyebrow">Order {selected.id}</p>
                <h2>{selected.customerName}</h2>
              </div>
              <span className={`status ${statusTone[selected.status]}`}>{statusLabels[selected.status]}</span>
            </div>
            <div className="transcript">
              <Mic2 size={18} />
              <p>{selected.transcript}</p>
            </div>
            <div className="detail-list">
              {selected.items.map((item) => (
                <div key={item}>
                  <span>{item}</span>
                  <CheckCircle2 size={17} />
                </div>
              ))}
            </div>
            <div className="info-grid compact">
              <InfoPill icon={<Phone size={17} />} label="Phone" value={selected.phone || "Not captured"} />
              <InfoPill icon={<MapPin size={17} />} label="Address" value={selected.address || "Pickup"} />
              <InfoPill icon={<IndianRupee size={17} />} label="Payment" value={selected.paymentStatus} />
            </div>
            <div className="total-row">
              <span>Total</span>
              <strong>{formatCurrency(selected.total)}</strong>
            </div>
            <div className="actions">
              <button type="button" onClick={() => updateOrderStatus(selected.id, "confirming")}>
                <Headphones size={17} />
                Take over
              </button>
              <button className="primary" type="button" onClick={() => updateOrderStatus(selected.id, "sent_to_kitchen")}>
                <ChefHat size={17} />
                Send to kitchen
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function RestaurantSection({ restaurant }: { restaurant: Restaurant | null }) {
  if (!restaurant) {
    return null;
  }
  return (
    <section className="section-grid">
      <div className="panel wide-panel">
        <PanelTitle eyebrow="Restaurant profile" title={restaurant.name} />
        <div className="info-grid">
          <InfoPill icon={<MapPin size={17} />} label={restaurant.city} value={restaurant.address} />
          <InfoPill icon={<Phone size={17} />} label="Customer phone" value={restaurant.phone} />
          <InfoPill icon={<Clock3 size={17} />} label="Hours" value={restaurant.hours} />
          <InfoPill icon={<Utensils size={17} />} label="Cuisine" value={restaurant.cuisine} />
        </div>
      </div>
      <div className="panel">
        <PanelTitle eyebrow="Operations" title="Routing setup" />
        <div className="detail-list">
          <div>
            <span>Accepting orders</span>
            <span className={`status ${restaurant.acceptingOrders ? "tone-green" : "tone-red"}`}>
              {restaurant.acceptingOrders ? "Open" : "Closed"}
            </span>
          </div>
          <div>
            <span>Staff handoff</span>
            <strong>{restaurant.handoffNumber}</strong>
          </div>
          <div>
            <span>POS webhook</span>
            <small>{restaurant.posWebhookUrl}</small>
          </div>
        </div>
      </div>
    </section>
  );
}

function MenuSection({
  addMenuItem,
  menu,
  menuDraft,
  savingMenu,
  setMenuDraft,
}: {
  addMenuItem: (event: React.FormEvent<HTMLFormElement>) => void;
  menu: MenuItem[];
  menuDraft: { name: string; category: string; price: string };
  savingMenu: boolean;
  setMenuDraft: React.Dispatch<React.SetStateAction<{ name: string; category: string; price: string }>>;
}) {
  return (
    <section className="section-grid">
      <div className="panel wide-panel">
        <PanelTitle eyebrow="Menu management" title="Items and availability" />
        <form className="menu-form" onSubmit={addMenuItem}>
          <input aria-label="Item name" placeholder="Item name" required value={menuDraft.name} onChange={(event) => setMenuDraft((draft) => ({ ...draft, name: event.target.value }))} />
          <input aria-label="Category" placeholder="Category" value={menuDraft.category} onChange={(event) => setMenuDraft((draft) => ({ ...draft, category: event.target.value }))} />
          <input aria-label="Price" min="0" placeholder="Price" required type="number" value={menuDraft.price} onChange={(event) => setMenuDraft((draft) => ({ ...draft, price: event.target.value }))} />
          <button className="icon-button" type="submit" aria-label="Add menu item" disabled={savingMenu}>
            <Plus size={18} />
          </button>
        </form>
        <div className="menu-list">
          {menu.map((item) => (
            <div className="menu-row" key={item.id}>
              <span>
                <strong>{item.name}</strong>
                <small>{item.category} - {item.prepTimeMins} min - {item.popularity}</small>
              </span>
              <span>{formatCurrency(item.price)}</span>
              <span className={`status ${item.available ? "tone-green" : "tone-red"}`}>
                {item.available ? "Available" : "Paused"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentsSection({ agents }: { agents: Agent[] }) {
  return (
    <section className="section-grid">
      <div className="panel wide-panel">
        <PanelTitle eyebrow="AI operations" title="Agent lanes" />
        <div className="agent-grid">
          {agents.map((agent) => (
            <article className="agent-card" key={agent.id}>
              <div className="agent-card-head">
                <span className="channel">{agent.channel === "voice" ? <PhoneCall size={16} /> : agent.channel === "whatsapp" ? <MessageCircle size={16} /> : <Bot size={16} />}</span>
                <span className={`status ${statusTone[agent.status]}`}>{agent.status}</span>
              </div>
              <h2>{agent.name}</h2>
              <p>{agent.model}</p>
              <div className="agent-stats">
                <span>{agent.latencyMs}ms</span>
                <span>{agent.successRate}% success</span>
                <span>{agent.lastRun}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="panel">
        <PanelTitle eyebrow="Next integrations" title="Provider checklist" />
        <div className="detail-list">
          <div><span>Voice streaming</span><strong>Twilio Media Streams</strong></div>
          <div><span>STT</span><strong>Deepgram</strong></div>
          <div><span>TTS</span><strong>ElevenLabs</strong></div>
          <div><span>Payments</span><strong>Razorpay test mode</strong></div>
        </div>
      </div>
    </section>
  );
}

function HandoffSection({ handoffs, resolveHandoff }: { handoffs: Handoff[]; resolveHandoff: (handoffId: string) => void }) {
  return (
    <section className="section-grid">
      <div className="panel wide-panel">
        <PanelTitle eyebrow="Staff queue" title="Manual handoffs" />
        <div className="handoff-list">
          {handoffs.map((handoff) => (
            <article className="handoff-row" key={handoff.id}>
              <span className="channel">{channelIcons[handoff.channel]}</span>
              <div>
                <strong>{handoff.customerName}</strong>
                <small>{handoff.reason} - {formatTime(handoff.createdAt)}</small>
              </div>
              <span className={`status ${statusTone[handoff.priority]}`}>{handoff.priority}</span>
              <span className={`status ${statusTone[handoff.status]}`}>{handoff.status}</span>
              <strong>{handoff.assignedTo}</strong>
              <button type="button" onClick={() => resolveHandoff(handoff.id)} disabled={handoff.status === "resolved"}>
                Resolve
              </button>
            </article>
          ))}
        </div>
      </div>
      <div className="panel">
        <PanelTitle eyebrow="Escalation" title="Staff routing" />
        <div className="detail-list">
          <div><span>High priority</span><strong>Immediate call back</strong></div>
          <div><span>Medium priority</span><strong>Ops console review</strong></div>
          <div><span>Low priority</span><strong>WhatsApp reply</strong></div>
        </div>
      </div>
    </section>
  );
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="info-pill">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

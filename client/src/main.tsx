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
  Send,
  ShieldCheck,
  Store,
  Utensils,
} from "lucide-react";
import "./styles.css";

type Channel = "voice" | "whatsapp";
type OrderStatus = "listening" | "confirming" | "sent_to_kitchen" | "paid";

type Restaurant = {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  cuisine: string;
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
};

type Order = {
  id: string;
  customerName: string;
  channel: Channel;
  status: OrderStatus;
  total: number;
  items: string[];
  transcript: string;
  createdAt: string;
};

type ApiData = {
  restaurant: Restaurant | null;
  menu: MenuItem[];
  orders: Order[];
};

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

const statusLabels: Record<OrderStatus, string> = {
  listening: "Listening",
  confirming: "Confirming",
  sent_to_kitchen: "Kitchen",
  paid: "Paid",
};

const statusTone: Record<OrderStatus, string> = {
  listening: "tone-blue",
  confirming: "tone-amber",
  sent_to_kitchen: "tone-green",
  paid: "tone-dark",
};

const channelIcons: Record<Channel, React.ReactNode> = {
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

function App() {
  const [data, setData] = React.useState<ApiData>({
    restaurant: null,
    menu: [],
    orders: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [apiState, setApiState] = React.useState<"checking" | "online" | "offline">("checking");
  const [selectedOrder, setSelectedOrder] = React.useState<string | null>(null);
  const [menuDraft, setMenuDraft] = React.useState({
    name: "",
    category: "",
    price: "",
  });
  const [savingMenu, setSavingMenu] = React.useState(false);

  const reload = React.useCallback(async () => {
    const response = await fetch(`${apiBase}/api/bootstrap`);
    if (!response.ok) {
      throw new Error("API response failed");
    }
    return response.json() as Promise<ApiData>;
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const bootstrap = await reload();
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
  }, [reload]);

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

    events.onerror = () => {
      events.close();
    };

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
        }),
      });

      if (!response.ok) {
        throw new Error("Menu save failed");
      }

      setMenuDraft({ name: "", category: "", price: "" });
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

  const selected = data.orders.find((order) => order.id === selectedOrder) ?? data.orders[0];
  const activeOrders = data.orders.filter((order) => order.status !== "paid");
  const kitchenOrders = data.orders.filter((order) => order.status === "sent_to_kitchen");
  const revenue = data.orders.reduce((sum, order) => sum + order.total, 0);

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

        <nav className="nav-list" aria-label="Main navigation">
          <a className="active" href="#orders">
            <Activity size={18} />
            Live orders
          </a>
          <a href="#restaurant">
            <Store size={18} />
            Restaurant
          </a>
          <a href="#menu">
            <ChefHat size={18} />
            Menu
          </a>
          <a href="#agents">
            <Bot size={18} />
            AI agents
          </a>
        </nav>

        <div className={`api-pill ${apiState}`}>
          <span />
          API {apiState}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phase 2 persistence</p>
            <h1>{data.restaurant?.name ?? "Live restaurant ordering console"}</h1>
          </div>
          <button className="icon-button" aria-label="Send test order">
            <Send size={18} />
          </button>
        </header>

        {loading ? (
          <section className="empty-state">
            <Mic2 size={34} />
            <h2>Connecting to local API</h2>
            <p>Loading restaurant setup and order stream.</p>
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
              <Metric icon={<Clock3 size={20} />} label="Avg response" value="1.2s" />
            </section>

            <section className="profile-strip" id="restaurant">
              <InfoPill icon={<MapPin size={17} />} label={data.restaurant?.city ?? "City"} value={data.restaurant?.address ?? "Address pending"} />
              <InfoPill icon={<Phone size={17} />} label="Handoff" value={data.restaurant?.handoffNumber ?? "Not set"} />
              <InfoPill icon={<Store size={17} />} label="Cuisine" value={data.restaurant?.cuisine ?? "Cuisine pending"} />
            </section>

            <section className="main-grid">
              <div className="panel" id="orders">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Voice + WhatsApp</p>
                    <h2>Orders</h2>
                  </div>
                </div>

                <div className="order-list">
                  {data.orders.map((order) => (
                    <button
                      className={`order-row ${selected?.id === order.id ? "selected" : ""}`}
                      key={order.id}
                      onClick={() => setSelectedOrder(order.id)}
                    >
                      <span className="channel">{channelIcons[order.channel]}</span>
                      <span>
                        <strong>{order.customerName}</strong>
                        <small>{order.items.join(", ")}</small>
                      </span>
                      <span className={`status ${statusTone[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
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
                      <span className={`status ${statusTone[selected.status]}`}>
                        {statusLabels[selected.status]}
                      </span>
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

                    <div className="total-row">
                      <span>Total</span>
                      <strong>{formatCurrency(selected.total)}</strong>
                    </div>

                    <div className="actions">
                      <button type="button" onClick={() => updateOrderStatus(selected.id, "confirming")}>
                        <Headphones size={17} />
                        Take over
                      </button>
                      <button
                        className="primary"
                        type="button"
                        onClick={() => updateOrderStatus(selected.id, "sent_to_kitchen")}
                      >
                        <ChefHat size={17} />
                        Send to kitchen
                      </button>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="panel" id="menu">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Persistent setup</p>
                    <h2>Menu availability</h2>
                  </div>
                </div>
                <form className="menu-form" onSubmit={addMenuItem}>
                  <input
                    aria-label="Item name"
                    placeholder="Item name"
                    required
                    value={menuDraft.name}
                    onChange={(event) => setMenuDraft((draft) => ({ ...draft, name: event.target.value }))}
                  />
                  <input
                    aria-label="Category"
                    placeholder="Category"
                    value={menuDraft.category}
                    onChange={(event) => setMenuDraft((draft) => ({ ...draft, category: event.target.value }))}
                  />
                  <input
                    aria-label="Price"
                    min="0"
                    placeholder="Price"
                    required
                    type="number"
                    value={menuDraft.price}
                    onChange={(event) => setMenuDraft((draft) => ({ ...draft, price: event.target.value }))}
                  />
                  <button className="icon-button" type="submit" aria-label="Add menu item" disabled={savingMenu}>
                    <Plus size={18} />
                  </button>
                </form>
                <div className="menu-list">
                  {data.menu.map((item) => (
                    <div className="menu-row" key={item.id}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.category}</small>
                      </span>
                      <span>{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel" id="agents">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">AI readiness</p>
                    <h2>Agent lanes</h2>
                  </div>
                </div>
                <div className="lane-list">
                  <AgentLane icon={<PhoneCall size={18} />} title="Voice agent" value="Phase 3 Twilio prototype" />
                  <AgentLane icon={<MessageCircle size={18} />} title="WhatsApp agent" value="Phase 4 provider intake" />
                  <AgentLane icon={<Bot size={18} />} title="Order brain" value="Persisted order context" />
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
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

function AgentLane({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="agent-lane">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{value}</small>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

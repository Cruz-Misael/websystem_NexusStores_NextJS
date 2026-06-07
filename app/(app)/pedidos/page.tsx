'use client';
import { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  ShoppingBag, Search, X, ChevronDown, ChevronUp, Package,
  Truck, CheckCircle2, Clock, Ban, MapPin, Phone, Mail,
  Copy, RefreshCw, Tag,
} from 'lucide-react';

interface OrderItem {
  sku: number;
  name: string;
  unit_price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  items: OrderItem[];
  total_amount: number;
  discount_amount: number | null;
  shipping_cost: number | null;
  payment_status: 'pending' | 'paid' | 'cancelled';
  shipping_status: 'pending' | 'preparing' | 'shipped' | 'delivered' | null;
  tracking_code: string | null;
  shipping_method: string | null;
  shipping_carrier: string | null;
  recipient_cep: string | null;
  recipient_street: string | null;
  recipient_number: string | null;
  recipient_complement: string | null;
  recipient_city: string | null;
  recipient_state: string | null;
  coupon_code: string | null;
  created_at: string;
  mp_payment_id: string | null;
}

type FilterTab = 'all' | 'preparing' | 'shipped' | 'delivered' | 'pending_payment';

const SHIPPING_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  preparing: 'Em Preparo',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

const SHIPPING_COLORS: Record<string, string> = {
  pending: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  preparing: 'bg-amber-100 text-amber-700 border-amber-200',
  shipped: 'bg-blue-100 text-blue-700 border-blue-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pedidos');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (activeFilter === 'all') list = orders.filter(o => o.payment_status === 'paid');
    else if (activeFilter === 'pending_payment') list = orders.filter(o => o.payment_status === 'pending');
    else if (activeFilter === 'preparing') list = orders.filter(o => o.payment_status === 'paid' && o.shipping_status === 'preparing');
    else if (activeFilter === 'shipped') list = orders.filter(o => o.shipping_status === 'shipped');
    else if (activeFilter === 'delivered') list = orders.filter(o => o.shipping_status === 'delivered');

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.customer_name.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q)
      );
    }
    return list;
  }, [orders, activeFilter, search]);

  const counts = useMemo(() => ({
    all: orders.filter(o => o.payment_status === 'paid').length,
    preparing: orders.filter(o => o.payment_status === 'paid' && o.shipping_status === 'preparing').length,
    shipped: orders.filter(o => o.shipping_status === 'shipped').length,
    delivered: orders.filter(o => o.shipping_status === 'delivered').length,
    pending_payment: orders.filter(o => o.payment_status === 'pending').length,
  }), [orders]);

  const updateOrder = async (id: string, update: Record<string, any>) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...update } : o));
      toast.success('Pedido atualizado!');
    } catch {
      toast.error('Erro ao atualizar pedido');
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado!')).catch(() => {});
  };

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'Pagos', count: counts.all },
    { id: 'preparing', label: 'Em Preparo', count: counts.preparing },
    { id: 'shipped', label: 'Enviados', count: counts.shipped },
    { id: 'delivered', label: 'Entregues', count: counts.delivered },
    { id: 'pending_payment', label: 'Aguardando Pgto', count: counts.pending_payment },
  ];

  return (
    <div className="flex flex-col h-full max-h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden border border-zinc-300 rounded-lg shadow-2xl">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingBag size={22} className="text-indigo-600" strokeWidth={2.5} />
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">Pedidos Online</h1>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Gerencie envios e entregas</p>
          </div>
        </div>
        <button onClick={loadOrders} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Pedidos Pagos', value: counts.all, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Em Preparo', value: counts.preparing, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Enviados', value: counts.shipped, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Aguardando Pgto', value: counts.pending_payment, color: 'text-zinc-500', bg: 'bg-zinc-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border border-zinc-200 rounded-2xl p-4`}>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters + search */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex items-center gap-4 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {filterTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                    activeFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-300 text-zinc-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="ml-auto relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente, ID..."
                className="pl-8 pr-8 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-52"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Orders list */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center">
                <RefreshCw size={28} className="animate-spin mx-auto text-zinc-300 mb-3" />
                <p className="text-zinc-400 text-sm">Carregando pedidos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <ShoppingBag size={40} className="mx-auto mb-3 text-zinc-300" />
                <p className="text-zinc-500 text-sm">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase border-b border-zinc-100">
                    <tr>
                      <th className="px-5 py-3.5 tracking-widest">Pedido</th>
                      <th className="px-5 py-3.5 tracking-widest">Cliente</th>
                      <th className="px-5 py-3.5 tracking-widest">Itens</th>
                      <th className="px-5 py-3.5 tracking-widest">Total</th>
                      <th className="px-5 py-3.5 tracking-widest">Pagamento</th>
                      <th className="px-5 py-3.5 tracking-widest">Envio</th>
                      <th className="px-5 py-3.5 tracking-widest text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 text-xs">
                    {filtered.map(order => {
                      const isExpanded = expandedId === order.id;
                      const isUpdating = updatingId === order.id;
                      const shippingStatus = order.shipping_status ?? 'pending';
                      const trackingVal = trackingInputs[order.id] ?? order.tracking_code ?? '';

                      return (
                        <>
                          <tr
                            key={order.id}
                            className={`hover:bg-indigo-50/20 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronUp size={13} className="text-indigo-500 shrink-0" /> : <ChevronDown size={13} className="text-zinc-400 shrink-0" />}
                                <span className="font-mono font-bold text-zinc-700">#{order.id.slice(0, 8).toUpperCase()}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-zinc-800 leading-none">{order.customer_name}</p>
                              {order.customer_email && <p className="text-[10px] text-zinc-400 mt-0.5">{order.customer_email}</p>}
                            </td>
                            <td className="px-5 py-4 text-zinc-500">
                              {order.items?.length ?? 0} {(order.items?.length ?? 0) === 1 ? 'item' : 'itens'}
                            </td>
                            <td className="px-5 py-4 font-bold text-zinc-800">
                              {Number(order.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${PAYMENT_COLORS[order.payment_status]}`}>
                                {PAYMENT_LABELS[order.payment_status]}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${SHIPPING_COLORS[shippingStatus]}`}>
                                {SHIPPING_LABELS[shippingStatus]}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right text-zinc-400">
                              {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${order.id}-detail`} className="bg-indigo-50/20">
                              <td colSpan={7} className="px-5 pb-5 pt-0">
                                <div className="grid grid-cols-3 gap-4 mt-3">

                                  {/* Items */}
                                  <div className="col-span-1 bg-white rounded-xl border border-zinc-100 p-4 space-y-2">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Package size={11} /> Itens do Pedido</p>
                                    {order.items?.map(item => (
                                      <div key={item.sku} className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-700 font-medium truncate mr-2">{item.name} <span className="text-zinc-400">×{item.quantity}</span></span>
                                        <span className="font-bold text-zinc-800 shrink-0">
                                          {(item.unit_price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="border-t border-zinc-100 pt-2 space-y-1">
                                      {order.discount_amount != null && order.discount_amount > 0 && (
                                        <div className="flex justify-between text-xs text-emerald-600">
                                          <span>Desconto</span>
                                          <span>-{Number(order.discount_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                      )}
                                      {order.shipping_cost != null && order.shipping_cost > 0 && (
                                        <div className="flex justify-between text-xs text-zinc-500">
                                          <span>Frete ({order.shipping_method || 'Padrão'})</span>
                                          <span>{Number(order.shipping_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between font-bold text-zinc-800 text-xs pt-1">
                                        <span>Total</span>
                                        <span>{Number(order.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                      </div>
                                    </div>
                                    {order.coupon_code && (
                                      <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                        <Tag size={10} /> Cupom: <span className="font-bold">{order.coupon_code}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Customer + Address */}
                                  <div className="col-span-1 bg-white rounded-xl border border-zinc-100 p-4 space-y-2">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={11} /> Cliente e Endereço</p>
                                    <div className="space-y-1.5 text-xs">
                                      <p className="font-bold text-zinc-800">{order.customer_name}</p>
                                      {order.customer_email && (
                                        <p className="flex items-center gap-1.5 text-zinc-500"><Mail size={11} /> {order.customer_email}</p>
                                      )}
                                      {order.customer_phone && (
                                        <p className="flex items-center gap-1.5 text-zinc-500"><Phone size={11} /> {order.customer_phone}</p>
                                      )}
                                    </div>
                                    {order.recipient_cep && (
                                      <div className="text-xs text-zinc-600 mt-2 border-t border-zinc-100 pt-2 space-y-0.5">
                                        <p className="font-semibold text-zinc-700">
                                          {order.recipient_street}{order.recipient_number ? `, ${order.recipient_number}` : ''}
                                          {order.recipient_complement ? ` ${order.recipient_complement}` : ''}
                                        </p>
                                        <p className="text-zinc-500">
                                          {order.recipient_city}{order.recipient_state ? ` - ${order.recipient_state}` : ''} · CEP {order.recipient_cep}
                                        </p>
                                        <button
                                          onClick={e => { e.stopPropagation(); copyToClipboard(`${order.recipient_street}, ${order.recipient_number} - ${order.recipient_city}/${order.recipient_state} - CEP ${order.recipient_cep}`); }}
                                          className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 mt-1"
                                        >
                                          <Copy size={10} /> Copiar endereço
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Shipping management */}
                                  <div className="col-span-1 bg-white rounded-xl border border-zinc-100 p-4 space-y-3">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Truck size={11} /> Gerenciar Envio</p>

                                    {order.payment_status !== 'paid' ? (
                                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                                        <Clock size={13} className="inline mr-1" />
                                        Aguardando confirmação do pagamento
                                      </div>
                                    ) : (
                                      <>
                                        {/* Status selector */}
                                        <div>
                                          <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Status de Envio</label>
                                          <div className="grid grid-cols-2 gap-1.5">
                                            {(['preparing', 'shipped', 'delivered'] as const).map(s => (
                                              <button
                                                key={s}
                                                disabled={isUpdating}
                                                onClick={e => { e.stopPropagation(); updateOrder(order.id, { shipping_status: s }); }}
                                                className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-50 ${
                                                  shippingStatus === s
                                                    ? SHIPPING_COLORS[s]
                                                    : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                                                }`}
                                              >
                                                {s === 'preparing' && <Package size={10} className="inline mr-1" />}
                                                {s === 'shipped' && <Truck size={10} className="inline mr-1" />}
                                                {s === 'delivered' && <CheckCircle2 size={10} className="inline mr-1" />}
                                                {SHIPPING_LABELS[s]}
                                              </button>
                                            ))}
                                            <button
                                              disabled={isUpdating}
                                              onClick={e => { e.stopPropagation(); updateOrder(order.id, { shipping_status: 'pending' }); }}
                                              className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-50 ${
                                                shippingStatus === 'pending'
                                                  ? SHIPPING_COLORS.pending
                                                  : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                                              }`}
                                            >
                                              <Ban size={10} className="inline mr-1" />
                                              Aguardando
                                            </button>
                                          </div>
                                        </div>

                                        {/* Tracking code */}
                                        <div>
                                          <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Código de Rastreio</label>
                                          <div className="flex gap-1.5">
                                            <input
                                              value={trackingVal}
                                              onChange={e => { e.stopPropagation(); setTrackingInputs(p => ({ ...p, [order.id]: e.target.value })); }}
                                              onClick={e => e.stopPropagation()}
                                              placeholder="Ex: BR123456789BR"
                                              className="flex-1 px-2.5 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                            />
                                            <button
                                              disabled={isUpdating || !trackingVal.trim()}
                                              onClick={e => {
                                                e.stopPropagation();
                                                updateOrder(order.id, {
                                                  tracking_code: trackingVal.trim(),
                                                  ...(shippingStatus === 'preparing' ? { shipping_status: 'shipped' } : {}),
                                                });
                                              }}
                                              className="px-2.5 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black hover:bg-indigo-700 disabled:opacity-50 transition-all"
                                            >
                                              Salvar
                                            </button>
                                          </div>
                                          {order.tracking_code && (
                                            <button
                                              onClick={e => { e.stopPropagation(); copyToClipboard(order.tracking_code!); }}
                                              className="mt-1 flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700"
                                            >
                                              <Copy size={9} /> {order.tracking_code}
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

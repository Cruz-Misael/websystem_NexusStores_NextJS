"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PANEL_W = 360;
const PANEL_H = 520;

function calcPanelPos(btnX: number, btnY: number) {
  const margin = 12;
  const btnR = 28; // metade do botão (56/2)

  // Horizontal: alinhar borda direita do painel com o botão
  let left = btnX - PANEL_W + btnR;
  left = Math.max(margin, Math.min(window.innerWidth - PANEL_W - margin, left));

  // Vertical: abrir acima se tiver espaço, senão abaixo
  let top =
    btnY - btnR - PANEL_H - 12 > margin
      ? btnY - btnR - PANEL_H - 12
      : btnY + btnR + 12;

  top = Math.max(margin, Math.min(window.innerHeight - PANEL_H - margin, top));

  return { left, top };
}

export default function NexusIA() {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ola! Sou a Nexus IA. Pode me perguntar qualquer coisa sobre o sistema, verificar o estoque ou consultar vendas pendentes.",
    },
  ]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);

  const isDragging = useRef(false);
  const didMove = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const posRef = useRef(pos);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializa posição do localStorage ou canto inferior direito
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexusia-pos");
      if (saved) {
        setPos(JSON.parse(saved));
        return;
      }
    } catch {}
    setPos({ x: window.innerWidth - 44, y: window.innerHeight - 44 });
  }, []);

  // Mantém posRef sincronizado para usar nos handlers globais
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // Handlers globais de mouse
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      didMove.current = true;
      const newX = Math.max(28, Math.min(window.innerWidth - 28, e.clientX - offset.current.x));
      const newY = Math.max(28, Math.min(window.innerHeight - 28, e.clientY - offset.current.y));
      setPos({ x: newX, y: newY });
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (posRef.current) {
        localStorage.setItem("nexusia-pos", JSON.stringify(posRef.current));
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Handlers globais de touch
  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      didMove.current = true;
      const t = e.touches[0];
      const newX = Math.max(28, Math.min(window.innerWidth - 28, t.clientX - offset.current.x));
      const newY = Math.max(28, Math.min(window.innerHeight - 28, t.clientY - offset.current.y));
      setPos({ x: newX, y: newY });
    };
    const onEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (posRef.current) {
        localStorage.setItem("nexusia-pos", JSON.stringify(posRef.current));
      }
    };
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 100);
  }, [aberto]);

  const startDrag = (clientX: number, clientY: number) => {
    if (!pos) return;
    isDragging.current = true;
    didMove.current = false;
    offset.current = { x: clientX - pos.x, y: clientY - pos.y };
  };

  const handleClick = () => {
    if (!didMove.current) setAberto((v) => !v);
  };

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || carregando) return;

    const novaMensagem: Message = { role: "user", content: texto };
    const historico = [...mensagens, novaMensagem];

    setMensagens(historico);
    setInput("");
    setCarregando(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historico.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");

      setMensagens((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMensagens((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, nao consegui processar sua mensagem. Tente novamente." },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  // Enquanto posição não inicializa (SSR), não renderiza
  if (!pos) return null;

  const panel = aberto ? calcPanelPos(pos.x, pos.y) : null;

  return (
    <>
      {/* Painel de chat */}
      {aberto && panel && (
        <div
          className="fixed z-[300] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ left: panel.left, top: panel.top, width: PANEL_W, maxHeight: PANEL_H }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">Nexus IA</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Assistente da plataforma</p>
              </div>
            </div>
            <button
              onClick={() => setAberto(false)}
              className="text-zinc-400 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-zinc-50 min-h-0">
            {mensagens.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                    <Bot size={12} className="text-indigo-600" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {carregando && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                  <Bot size={12} className="text-indigo-600" />
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <Loader2 size={14} className="text-indigo-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-zinc-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
                placeholder="Pergunte sobre o sistema..."
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all placeholder:text-zinc-400"
                disabled={carregando}
              />
              <button
                onClick={enviar}
                disabled={!input.trim() || carregando}
                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 text-white disabled:text-zinc-400 rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
            <p className="text-[9px] text-zinc-300 text-center mt-2">
              Nexus IA pode cometer erros. Verifique informacoes importantes.
            </p>
          </div>
        </div>
      )}

      {/* Botão flutuante arrastável */}
      <button
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onClick={handleClick}
        title="Nexus IA — arraste para mover"
        className={`fixed z-[300] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors select-none touch-none ${
          isDragging.current ? "cursor-grabbing" : "cursor-grab"
        } ${
          aberto
            ? "bg-zinc-800 hover:bg-zinc-700"
            : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-300"
        }`}
        style={{ left: pos.x - 28, top: pos.y - 28 }}
      >
        {aberto ? (
          <X size={22} className="text-white" />
        ) : (
          <Sparkles size={22} className="text-white" />
        )}
      </button>
    </>
  );
}

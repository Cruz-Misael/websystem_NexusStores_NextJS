"use client";

import { useEffect } from "react";
import { X, Check, Zap, Sparkles, Shield } from "lucide-react";

interface Props {
  planoAtual?: "starter" | "pro" | "enterprise";
  onClose: () => void;
}

export default function PlansModal({ planoAtual = "starter", onClose }: Props) {
  
  const selecionarPlano = (planoId: string) => {
    console.log("Upgrade para:", planoId);
    // Lógica de Checkout/Stripe aqui
  };

  // Hook para fechar com ESC e bloquear scroll do body
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden"; // Trava o scroll da página

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto"; // Destrava ao desmontar
    };
  }, [onClose]);

  const planos = [
    {
      id: "starter",
      nome: "Starter",
      icon: Zap,
      preco: "49,90",
      periodo: "/mês",
      descricao: "Ideal para validar seu negócio.",
      destaque: false,
      beneficios: [
        "1 usuário",
        "Até 100 produtos",
        "Controle de estoque básico",
        "Dashboard simples",
        "Suporte por email",
      ],
    },
    {
      id: "pro",
      nome: "Pro",
      icon: Sparkles,
      preco: "99,90",
      periodo: "/mês",
      descricao: "Para operações em crescimento.",
      destaque: true,
      beneficios: [
        "Até 5 usuários",
        "Produtos ilimitados",
        "Relatórios avançados (BI)",
        "Exportação Excel / CSV",
        "Suporte prioritário WhatsApp",
      ],
    },
    {
      id: "enterprise",
      nome: "Enterprise",
      icon: Shield,
      preco: "Consultar",
      periodo: "",
      descricao: "Infraestrutura dedicada.",
      destaque: false,
      beneficios: [
        "Usuários ilimitados",
        "API de Integração",
        "Permissões granulares",
        "Gestão Multi-lojas",
        "SLA de atendimento 24/7",
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-start bg-zinc-50/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Planos e Assinatura</h2>
            <p className="text-sm text-zinc-500 mt-1">Escolha o plano ideal para escalar sua operação.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-8 overflow-y-auto bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planos.map((plano) => {
              const isCurrent = plano.id === planoAtual;
              const isPopular = plano.destaque;

              return (
                <div
                  key={plano.id}
                  className={`relative flex flex-col p-6 rounded-xl border transition-all duration-200 
                    ${isPopular 
                      ? "border-indigo-600 shadow-lg shadow-indigo-50 ring-1 ring-indigo-600 bg-white" 
                      : "border-zinc-200 hover:border-zinc-300 hover:shadow-md bg-white"
                    }
                    ${isCurrent ? "bg-zinc-50/50 border-zinc-200 opacity-80" : ""}
                  `}
                >
                  {/* Badge de Popular */}
                  {isPopular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm transform hover:scale-105 transition-transform">
                      Mais Popular
                    </div>
                  )}

                  {/* Nome e Ícone */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${isPopular ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-100 text-zinc-600'}`}>
                        <plano.icon size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">{plano.nome}</h3>
                    </div>
                    <p className="text-xs text-zinc-500 min-h-[2.5em]">{plano.descricao}</p>
                  </div>

                  {/* Preço Formatado */}
                  <div className="mb-6 flex items-baseline gap-1">
                    {plano.preco !== "Consultar" && <span className="text-zinc-400 text-sm font-medium">R$</span>}
                    <span className="text-3xl font-bold text-zinc-900 tracking-tight">{plano.preco}</span>
                    <span className="text-zinc-500 text-sm font-medium">{plano.periodo}</span>
                  </div>

                  {/* Lista de Benefícios */}
                  <ul className="flex-1 space-y-3 mb-8">
                    {plano.beneficios.map((beneficio, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-600">
                        <Check className={`shrink-0 w-4 h-4 mt-0.5 ${isPopular ? "text-indigo-600" : "text-zinc-400"}`} strokeWidth={3} />
                        <span className="leading-tight">{beneficio}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Botão de Ação */}
                  <button
                    disabled={isCurrent}
                    onClick={() => selecionarPlano(plano.id)}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all shadow-sm
                      ${isCurrent
                        ? "bg-zinc-100 text-zinc-400 cursor-default border border-zinc-200"
                        : isPopular
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
                          : "bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400"
                      }
                    `}
                  >
                    {isCurrent ? "Seu plano atual" : plano.id === 'enterprise' ? "Falar com vendas" : "Começar agora"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Seguro */}
        <div className="bg-zinc-50 px-8 py-4 border-t border-zinc-100 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-zinc-400 shrink-0">
           <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500"/> Pagamento 100% Seguro</span>
           <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500"/> Cancele quando quiser</span>
           <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500"/> Nota Fiscal automática</span>
        </div>
      </div>
    </div>
  );
}
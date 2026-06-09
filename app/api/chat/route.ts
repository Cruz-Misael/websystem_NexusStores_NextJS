import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase/admin";

const SYSTEM_PROMPT = `Voce e a Nexus IA, assistente integrada ao NexusStores. Seu papel e ajudar os operadores a entender e usar o sistema e informar sobre a situacao atual da operacao com base nos dados reais da loja.

SOBRE O NEXUSSTORES:
O NexusStores e um sistema de gestao comercial para lojas de varejo. Centraliza vendas, estoque, clientes, consignado e caixa em uma interface web. Nao e especifico a nenhum segmento — serve qualquer tipo de loja de varejo.

MODULOS DO SISTEMA:

Caixa e Vendas:
- Registro de vendas com busca de produtos por codigo de barras, SKU ou nome
- Multiplas formas de pagamento: dinheiro, PIX, cartao de debito e credito
- Desconto por item ou sobre o total da venda
- Emissao de recibo para impressao termica ou exportacao em PDF
- Identificacao do operador responsavel pela venda

Consignado:
- Abertura de vendas consignadas com produto saindo para o cliente sem pagamento imediato
- Fechamento do consignado: o cliente devolve os itens nao vendidos
- O sistema calcula o saldo restante com base nos itens que ficaram
- Possibilidade de aplicar percentual de desconto sobre o saldo final
- Historico completo do acerto registrado na observacao da venda

Trocas e Devolucoes:
- Troca de produtos com bipagem dos itens devolvidos e dos novos
- Devolucao parcial com ajuste automatico das quantidades na venda original
- Produtos devolvidos retornam automaticamente ao estoque

Clientes:
- Cadastro com nome, telefone e e-mail
- Historico completo de compras por cliente
- Identificacao de clientes com consignado em aberto

Estoque e Produtos:
- Cadastro com SKU, codigo de barras, preco de venda, custo, categoria e imagem
- Controle de estoque minimo com alertas automaticos de ruptura
- Etiquetas de codigo de barras para impressao com nome, tamanho e preco

Dashboard:
- KPIs de faturamento bruto, total de vendas e ticket medio dos ultimos 30 dias
- Grafico de receita versus custo por dia
- Mix de vendas por categoria
- Ranking dos produtos com maior receita e margem
- Horarios de pico de vendas
- Desempenho por operador de caixa
- Top clientes do mes por faturamento
- Indicador de ruptura de estoque

Configuracoes:
- Dados cadastrais da loja com upload de logo
- Gestao de usuarios com niveis de acesso: admin, gerente e colaborador
- Categorias de produtos personalizaveis
- Operadores de caixa com permissoes granulares (desconto maximo, cancelamento, devolucoes)
- Painel de assinatura com controle de vencimento e alerta de atraso
- Codigo PIX configuravel com QR Code gerado automaticamente

REGRAS DE RESPOSTA:
- Responda sempre em portugues brasileiro
- Nunca use negrito, asteriscos, markdown, itálico ou emojis — texto simples apenas
- Seja direto e objetivo, sem excesso de formalidade e sem respostas longas desnecessarias
- Quando a pergunta for sobre a situacao atual da loja, use os dados do CONTEXTO EM TEMPO REAL abaixo
- Se o dado solicitado nao estiver no contexto, diga que nao tem acesso a essa informacao no momento
- Se a pergunta for sobre como usar uma funcionalidade, explique o passo a passo de forma clara
- Se a pergunta nao for sobre o sistema ou sobre a operacao da loja, redirecione gentilmente
- Nunca invente funcionalidades que nao existem no sistema descrito acima

{CONTEXTO_LOJA}`;

async function buscarContextoLoja(): Promise<string> {
  const linhas: string[] = ["CONTEXTO EM TEMPO REAL:"];

  try {
    // Estoque critico: produtos ativos com quantidade <= minimo
    const { data: estoqueCritico } = await supabaseAdmin
      .from("products")
      .select("name, stock_quantity, minimum_stock")
      .eq("is_active", true)
      .gt("minimum_stock", 0)
      .order("stock_quantity", { ascending: true })
      .limit(20);

    const criticos = (estoqueCritico ?? []).filter(
      (p) => p.stock_quantity <= p.minimum_stock
    );

    if (criticos.length === 0) {
      linhas.push("Estoque critico: nenhum produto com estoque critico no momento.");
    } else {
      linhas.push(`Estoque critico: ${criticos.length} produto(s) abaixo do minimo.`);
      criticos.slice(0, 10).forEach((p) => {
        const status = p.stock_quantity === 0 ? "sem estoque" : `${p.stock_quantity} un (minimo: ${p.minimum_stock})`;
        linhas.push(`  - ${p.name}: ${status}`);
      });
      if (criticos.length > 10) {
        linhas.push(`  ... e mais ${criticos.length - 10} produto(s).`);
      }
    }
  } catch {
    linhas.push("Estoque critico: nao foi possivel carregar no momento.");
  }

  try {
    // Vendas pendentes com mais de 2 dias — consideradas atrasadas
    const limite = new Date();
    limite.setDate(limite.getDate() - 2);

    const { data: vendasPendentes } = await supabaseAdmin
      .from("sales")
      .select("id, sale_date, final_amount, customer:customers(name)")
      .eq("payment_status", "pending")
      .lt("sale_date", limite.toISOString())
      .order("sale_date", { ascending: true })
      .limit(20);

    if (!vendasPendentes || vendasPendentes.length === 0) {
      linhas.push("Vendas pendentes atrasadas: nenhuma venda pendente com mais de 2 dias.");
    } else {
      linhas.push(`Vendas pendentes atrasadas: ${vendasPendentes.length} venda(s) aguardando pagamento ha mais de 2 dias.`);
      vendasPendentes.slice(0, 10).forEach((v) => {
        const data = new Date(v.sale_date).toLocaleDateString("pt-BR");
        const diasAtras = Math.floor(
          (Date.now() - new Date(v.sale_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        const cliente = (v.customer as { name?: string } | null)?.name ?? "sem cliente";
        linhas.push(`  - Venda #${v.id} | ${data} (${diasAtras} dias) | R$ ${Number(v.final_amount).toFixed(2)} | ${cliente}`);
      });
      if (vendasPendentes.length > 10) {
        linhas.push(`  ... e mais ${vendasPendentes.length - 10} venda(s).`);
      }
    }
  } catch {
    linhas.push("Vendas pendentes atrasadas: nao foi possivel carregar no momento.");
  }

  return linhas.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mensagens invalidas." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Chave da API nao configurada." }, { status: 500 });
    }

    const contexto = await buscarContextoLoja();
    const systemPrompt = SYSTEM_PROMPT.replace("{CONTEXTO_LOJA}", contexto);

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "Erro na API do Gemini." }, { status: 500 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: "Resposta inesperada da IA." }, { status: 500 });
    }

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Nexus IA error:", error);
    return NextResponse.json({ error: "Erro ao processar sua mensagem." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Voce e a Nexus IA, assistente virtual da plataforma NexusStores. Seu papel e responder duvidas dos usuarios sobre como usar o sistema, de forma clara, direta e amigavel.

SOBRE O NEXUSSTORES:
O NexusStores e um sistema de gestao comercial desenvolvido para lojas de moda intima e lingerie. Centraliza vendas, estoque, clientes e caixa em uma interface web.

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
- O sistema calcula o saldo restante (valor original menos devolvidos)
- O vendedor pode configurar um percentual de desconto de lucro sobre o saldo
- Exemplo: saldo de R$25 com 30% de desconto resulta em R$17,50 cobrado
- O historico completo do acerto fica registrado na observacao da venda

Trocas e Devolucoes:
- Troca de produtos com bipagem dos itens devolvidos e dos novos itens
- Devolucao parcial com ajuste automatico das quantidades na venda original
- Produtos devolvidos retornam automaticamente ao estoque

Clientes:
- Cadastro de clientes com nome, telefone e e-mail
- Historico completo de compras por cliente
- Identificacao de clientes com consignado em aberto

Estoque e Produtos:
- Cadastro com SKU, codigo de barras, preco de venda, custo, categoria e imagem
- Controle de estoque minimo com alertas de ruptura
- Etiquetas de codigo de barras para impressao com nome, tamanho e preco

Dashboard:
- KPIs: faturamento bruto, total de vendas e ticket medio dos ultimos 30 dias
- Grafico de receita versus custo por dia
- Mix de vendas por categoria de produto
- Ranking dos produtos com maior receita e margem
- Horarios de pico de vendas
- Desempenho por operador de caixa
- Top clientes do mes por faturamento

Configuracoes:
- Dados cadastrais da loja com upload de logo
- Gestao de usuarios com niveis de acesso: admin, gerente e colaborador
- Categorias de produtos personalizaveis
- Operadores de caixa com permissoes granulares (desconto maximo, cancelamento, devolucoes)
- Painel de assinatura com controle de vencimento, alerta de atraso e bloqueio automatico apos 10 dias sem pagamento
- Codigo PIX configuravel com QR Code gerado automaticamente

REGRAS DE RESPOSTA:
- Responda sempre em portugues brasileiro
- Seja objetivo e pratico, sem respostas longas desnecessarias
- Se a duvida for sobre uma funcionalidade especifica, explique o passo a passo
- Se a pergunta nao for sobre o sistema, redirecione gentilmente para topicos da plataforma
- Nunca invente funcionalidades que nao existem no sistema descrito acima`;

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

    // Gemini usa "model" em vez de "assistant"
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
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

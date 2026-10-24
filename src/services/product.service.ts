// product.service.ts - CORRIGIDO
import { supabase } from "@/src/lib/supabase/client";

// Colunas para listagens — exclui a coluna `imagem` (base64 pesado), que só é
// necessária ao editar um produto (carregada sob demanda via buscarProdutoPorSKU).
const LIST_COLUMNS =
  "sku, name, category, supplier, localizacao, price, cost, stock_quantity, minimum_stock, maximum_stock, barcode, created_at, description, color, size, units_type, is_active";

export async function criarProduto(produto: any) {
  // Remover campos undefined
  const produtoParaInserir = { ...produto };
  
  // Se o SKU for undefined, remover para deixar o banco gerar automaticamente
  if (produtoParaInserir.sku === undefined) {
    delete produtoParaInserir.sku;
  }

  console.log("Inserindo produto:", produtoParaInserir);

  const { data, error } = await supabase
    .from("products")
    .insert([produtoParaInserir])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar produto:", error);
    throw new Error(`Erro ao criar produto: ${error.message}`);
  }

  console.log("Produto criado com sucesso:", data);
  return data;
}

export async function atualizarProduto(sku: number, produto: any) {
  console.log("Atualizando produto com SKU:", sku);
  console.log("Dados para atualização:", produto);

  const { data, error } = await supabase
    .from("products")
    .update(produto)
    .eq("sku", sku)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar produto:", error);
    throw new Error(`Erro ao atualizar produto: ${error.message}`);
  }

  console.log("Produto atualizado com sucesso:", data);
  return data;
}

export async function buscarProdutoPorSKU(sku: number) {
  console.log("Buscando produto com SKU:", sku);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("sku", sku)
    .single();

  if (error) {
    console.error("Erro ao buscar produto:", error);
    throw new Error(`Erro ao buscar produto: ${error.message}`);
  }

  console.log("Produto encontrado:", data);
  return data;
}

/**
 * Acha o produto pelo código de barras ou pelo SKU.
 *
 * O cadastro tem códigos de barras repetidos — o mesmo número em duas fichas,
 * normalmente uma ativa e outra desativada que ficou para trás. Pedir uma
 * linha só ao banco fazia a bipagem falhar com "erro na busca" justamente
 * nesses produtos, enquanto todos os outros funcionavam.
 *
 * Com mais de uma ficha, vale a que está ativa. Se houver duas ATIVAS com o
 * mesmo código, aí não dá para escolher no lugar de quem está no balcão: a
 * peça errada entraria na venda em silêncio, então o erro é explícito e diz o
 * que arrumar.
 */
export async function buscarProdutoPorBarcodeOuSKU(codigo: string) {
  const skuNum = parseInt(codigo);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(`barcode.eq.${codigo}${!isNaN(skuNum) ? `,sku.eq.${skuNum}` : ''}`);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  if (data.length === 1) return data[0];

  const ativos = data.filter((p) => p.is_active);
  if (ativos.length === 1) return ativos[0];
  if (ativos.length === 0) return data[0];

  throw new Error(
    `O código ${codigo} está cadastrado em ${ativos.length} produtos ativos ` +
    `(SKU ${ativos.map((p) => p.sku).join(", ")}). Corrija o cadastro para saber qual é a peça.`
  );
}

export async function listarProdutos() {
  console.log("Listando todos os produtos");

  const { data, error } = await supabase
    .from("products")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Erro ao listar produtos:", error);
    throw new Error(`Erro ao listar produtos: ${error.message}`);
  }

  console.log(`Encontrados ${data?.length || 0} produtos`);
  return data || [];
}

export async function listarProdutosPaginado(
  pagina: number = 1,
  itensPorPagina: number = 50,
  busca?: string,
  mostrarInativos?: boolean,
  somenteCriticos?: boolean
) {
  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina - 1;

  let query = supabase
    .from("products")
    .select(LIST_COLUMNS, { count: 'exact' })
    .order("created_at", { ascending: false });

  if (busca && busca.trim()) {
    const buscaTrimmed = busca.trim();
    const semPrefix = buscaTrimmed.replace(/^SKU-/i, "");
    const comoNumero = Number(semPrefix);
    const isNumero = semPrefix !== "" && !isNaN(comoNumero) && Number.isFinite(comoNumero);

    if (isNumero) {
      query = query.or(`name.ilike.%${buscaTrimmed}%,sku.eq.${comoNumero},barcode.eq.${comoNumero}`);
    } else {
      query = query.ilike("name", `%${buscaTrimmed}%`);
    }
  }

  if (!mostrarInativos) {
    query = query.or("is_active.eq.true,is_active.is.null");
  }

  if (somenteCriticos) {
    query = query.or("stock_quantity.lte.0,stock_quantity.is.null");
  }

  const { data, error, count } = await query.range(inicio, fim);

  if (error) {
    console.error("Erro ao listar produtos paginado:", error);
    throw new Error(`Erro: ${error.message}`);
  }

  return {
    produtos: data || [],
    total: count || 0,
    pagina,
    totalPaginas: Math.ceil((count || 0) / itensPorPagina),
    itensPorPagina
  };
}

export async function buscarProdutoPorBarcode(barcode: number) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("barcode", barcode)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar por barcode: ${error.message}`);
  return data;
}

export async function deletarProduto(sku: number) {
  console.log("Deletando produto com SKU:", sku);

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("sku", sku);

  if (error) {
    console.error("Erro ao deletar produto:", error);
    throw new Error(`Erro ao deletar produto: ${error.message}`);
  }

  console.log("Produto deletado com sucesso");
  return { success: true };
}
export type Produto = {
  id: number;
  nome: string;
  sku: string;
  categoria: string;
  estoque: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  preco: number;
  custo: number;
  fornecedor: string;
  localizacao: string;
  ultimaMovimentacao: string;
  codigoBarras?: string;
  imagem?: string;
};

export const produtosMock: Produto[] = [
  // Produtos existentes
  { 
    id: 1, 
    nome: "Camiseta Básica Algodão", 
    sku: "CM-001-PT", 
    categoria: "Roupas", 
    estoque: 12, 
    estoqueMinimo: 15, 
    estoqueMaximo: 100, 
    preco: 59.90, 
    custo: 25.00, 
    fornecedor: "Textil SP", 
    localizacao: "A-01-02", 
    ultimaMovimentacao: "Hoje, 10:00" 
  },
  { 
    id: 2, 
    nome: "Tênis Runner Pro", 
    sku: "TN-002-AZ", 
    categoria: "Calçados", 
    estoque: 45, 
    estoqueMinimo: 10, 
    estoqueMaximo: 80, 
    preco: 299.90, 
    custo: 120.00, 
    fornecedor: "Nike Dist.", 
    localizacao: "B-03-01", 
    ultimaMovimentacao: "Ontem" 
  },
  { 
    id: 3, 
    nome: "Garrafa Térmica 500ml", 
    sku: "AC-003-PR", 
    categoria: "Acessórios", 
    estoque: 5, 
    estoqueMinimo: 20, 
    estoqueMaximo: 100, 
    preco: 89.90, 
    custo: 30.00, 
    fornecedor: "Imports SA", 
    localizacao: "C-01-05", 
    ultimaMovimentacao: "23/01" 
  },
  { 
    id: 4, 
    nome: "Meia Esportiva (Kit 3)", 
    sku: "AC-004-BR", 
    categoria: "Acessórios", 
    estoque: 120, 
    estoqueMinimo: 30, 
    estoqueMaximo: 200, 
    preco: 29.90, 
    custo: 8.00, 
    fornecedor: "Textil SP", 
    localizacao: "A-02-01", 
    ultimaMovimentacao: "15/01" 
  },
  { 
    id: 5, 
    nome: "Boné Aba Curva", 
    sku: "AC-005-NV", 
    categoria: "Acessórios", 
    estoque: 28, 
    estoqueMinimo: 10, 
    estoqueMaximo: 50, 
    preco: 49.90, 
    custo: 15.00, 
    fornecedor: "Headwear Co.", 
    localizacao: "C-02-02", 
    ultimaMovimentacao: "20/01" 
  },

  // Novos produtos - Roupas
  { 
    id: 6, 
    nome: "Calça Jeans Slim Fit", 
    sku: "CP-006-AZ", 
    categoria: "Roupas", 
    estoque: 24, 
    estoqueMinimo: 20, 
    estoqueMaximo: 80, 
    preco: 189.90, 
    custo: 75.00, 
    fornecedor: "Denim BR", 
    localizacao: "A-01-03", 
    ultimaMovimentacao: "Hoje, 14:30" 
  },
  { 
    id: 7, 
    nome: "Moletom Capuz", 
    sku: "MP-007-CN", 
    categoria: "Roupas", 
    estoque: 15, 
    estoqueMinimo: 10, 
    estoqueMaximo: 60, 
    preco: 149.90, 
    custo: 55.00, 
    fornecedor: "Winter Wear", 
    localizacao: "A-02-04", 
    ultimaMovimentacao: "Ontem" 
  },
  { 
    id: 8, 
    nome: "Bermuda Tactel", 
    sku: "BM-008-VR", 
    categoria: "Roupas", 
    estoque: 38, 
    estoqueMinimo: 25, 
    estoqueMaximo: 100, 
    preco: 89.90, 
    custo: 35.00, 
    fornecedor: "Summer Style", 
    localizacao: "A-03-02", 
    ultimaMovimentacao: "24/01" 
  },

  // Novos produtos - Calçados
  { 
    id: 9, 
    nome: "Sapato Social Couro", 
    sku: "SP-009-PR", 
    categoria: "Calçados", 
    estoque: 8, 
    estoqueMinimo: 5, 
    estoqueMaximo: 40, 
    preco: 399.90, 
    custo: 180.00, 
    fornecedor: "Leather Art", 
    localizacao: "B-01-01", 
    ultimaMovimentacao: "22/01" 
  },
  { 
    id: 10, 
    nome: "Chinelo Slide", 
    sku: "CH-010-BR", 
    categoria: "Calçados", 
    estoque: 65, 
    estoqueMinimo: 30, 
    estoqueMaximo: 150, 
    preco: 49.90, 
    custo: 18.00, 
    fornecedor: "Flip Flop Inc", 
    localizacao: "B-02-03", 
    ultimaMovimentacao: "Hoje, 09:15" 
  },
  { 
    id: 11, 
    nome: "Bota de Couro", 
    sku: "BT-011-MR", 
    categoria: "Calçados", 
    estoque: 6, 
    estoqueMinimo: 8, 
    estoqueMaximo: 30, 
    preco: 459.90, 
    custo: 200.00, 
    fornecedor: "Leather Art", 
    localizacao: "B-01-02", 
    ultimaMovimentacao: "18/01" 
  },

  // Novos produtos - Acessórios
  { 
    id: 12, 
    nome: "Mochila Notebook 15.6", 
    sku: "AC-012-GF", 
    categoria: "Acessórios", 
    estoque: 22, 
    estoqueMinimo: 15, 
    estoqueMaximo: 70, 
    preco: 159.90, 
    custo: 65.00, 
    fornecedor: "Office Gear", 
    localizacao: "C-03-01", 
    ultimaMovimentacao: "Ontem" 
  },
  { 
    id: 13, 
    nome: "Óculos de Sol Polarizado", 
    sku: "AC-013-PR", 
    categoria: "Acessórios", 
    estoque: 14, 
    estoqueMinimo: 12, 
    estoqueMaximo: 50, 
    preco: 129.90, 
    custo: 45.00, 
    fornecedor: "Sun Optics", 
    localizacao: "C-02-03", 
    ultimaMovimentacao: "21/01" 
  },
  { 
    id: 14, 
    nome: "Cinto de Couro Legítimo", 
    sku: "AC-014-MR", 
    categoria: "Acessórios", 
    estoque: 32, 
    estoqueMinimo: 20, 
    estoqueMaximo: 80, 
    preco: 79.90, 
    custo: 28.00, 
    fornecedor: "Leather Art", 
    localizacao: "C-01-03", 
    ultimaMovimentacao: "19/01" 
  },

  // Novos produtos - Eletrônicos
  { 
    id: 15, 
    nome: "Fone Bluetooth TWS", 
    sku: "EL-015-PR", 
    categoria: "Eletrônicos", 
    estoque: 18, 
    estoqueMinimo: 10, 
    estoqueMaximo: 60, 
    preco: 199.90, 
    custo: 85.00, 
    fornecedor: "Tech Import", 
    localizacao: "D-01-01", 
    ultimaMovimentacao: "Hoje, 11:45" 
  },
  { 
    id: 16, 
    nome: "Power Bank 10000mAh", 
    sku: "EL-016-BK", 
    categoria: "Eletrônicos", 
    estoque: 42, 
    estoqueMinimo: 25, 
    estoqueMaximo: 120, 
    preco: 89.90, 
    custo: 35.00, 
    fornecedor: "Power Tech", 
    localizacao: "D-01-02", 
    ultimaMovimentacao: "23/01" 
  },
  { 
    id: 17, 
    nome: "Smartwatch GPS", 
    sku: "EL-017-PR", 
    categoria: "Eletrônicos", 
    estoque: 9, 
    estoqueMinimo: 8, 
    estoqueMaximo: 40, 
    preco: 549.90, 
    custo: 250.00, 
    fornecedor: "Wearable Tech", 
    localizacao: "D-02-01", 
    ultimaMovimentacao: "20/01" 
  },

  // Novos produtos - Esportes
  { 
    id: 18, 
    nome: "Bola de Futebol Oficial", 
    sku: "ES-018-BR", 
    categoria: "Esportes", 
    estoque: 27, 
    estoqueMinimo: 15, 
    estoqueMaximo: 80, 
    preco: 129.90, 
    custo: 50.00, 
    fornecedor: "Sports Line", 
    localizacao: "E-01-01", 
    ultimaMovimentacao: "22/01" 
  },
  { 
    id: 19, 
    nome: "Corda para Pular", 
    sku: "ES-019-AZ", 
    categoria: "Esportes", 
    estoque: 58, 
    estoqueMinimo: 30, 
    estoqueMaximo: 150, 
    preco: 29.90, 
    custo: 10.00, 
    fornecedor: "Fitness Pro", 
    localizacao: "E-01-02", 
    ultimaMovimentacao: "17/01" 
  },
  { 
    id: 20, 
    nome: "Luva de Goalkeeper", 
    sku: "ES-020-VR", 
    categoria: "Esportes", 
    estoque: 12, 
    estoqueMinimo: 8, 
    estoqueMaximo: 40, 
    preco: 89.90, 
    custo: 35.00, 
    fornecedor: "Sports Line", 
    localizacao: "E-01-03", 
    ultimaMovimentacao: "Ontem" 
  },

  // Novos produtos - Beleza e Saúde
  { 
    id: 21, 
    nome: "Kit Higiene Masculina", 
    sku: "BS-021-PR", 
    categoria: "Beleza", 
    estoque: 36, 
    estoqueMinimo: 20, 
    estoqueMaximo: 100, 
    preco: 79.90, 
    custo: 30.00, 
    fornecedor: "Personal Care", 
    localizacao: "F-01-01", 
    ultimaMovimentacao: "Hoje, 08:30" 
  },
  { 
    id: 22, 
    nome: "Protetor Solar FPS 50", 
    sku: "BS-022-BR", 
    categoria: "Beleza", 
    estoque: 47, 
    estoqueMinimo: 30, 
    estoqueMaximo: 120, 
    preco: 49.90, 
    custo: 18.00, 
    fornecedor: "Sun Care", 
    localizacao: "F-01-02", 
    ultimaMovimentacao: "24/01" 
  },

  // Produtos com estoque baixo (para alertas)
  { 
    id: 23, 
    nome: "Camisa Polo Premium", 
    sku: "CM-023-BR", 
    categoria: "Roupas", 
    estoque: 4, 
    estoqueMinimo: 15, 
    estoqueMaximo: 60, 
    preco: 189.90, 
    custo: 80.00, 
    fornecedor: "Premium Wear", 
    localizacao: "A-01-05", 
    ultimaMovimentacao: "20/01" 
  },
  { 
    id: 24, 
    nome: "Mouse Gamer RGB", 
    sku: "EL-024-RB", 
    categoria: "Eletrônicos", 
    estoque: 3, 
    estoqueMinimo: 10, 
    estoqueMaximo: 50, 
    preco: 149.90, 
    custo: 60.00, 
    fornecedor: "Gamer Tech", 
    localizacao: "D-03-01", 
    ultimaMovimentacao: "16/01" 
  },
  { 
    id: 25, 
    nome: "Perfume Importado 100ml", 
    sku: "BS-025-DR", 
    categoria: "Beleza", 
    estoque: 2, 
    estoqueMinimo: 8, 
    estoqueMaximo: 40, 
    preco: 299.90, 
    custo: 120.00, 
    fornecedor: "Fragrance World", 
    localizacao: "F-02-01", 
    ultimaMovimentacao: "15/01" 
  }
];
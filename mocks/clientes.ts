export type Cliente = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  ultimaCompra: string;
  totalGasto: number;
};

export const clientes: Cliente[] = [
  {
    id: 1,
    nome: "Maria Silva",
    email: "maria.silva@gmail.com",
    telefone: "(51) 99911-2233",
    ultimaCompra: "22/01/2026",
    totalGasto: 589.7,
  },
  {
    id: 2,
    nome: "Ana Costa",
    email: "ana.costa@gmail.com",
    telefone: "(51) 98822-3344",
    ultimaCompra: "21/01/2026",
    totalGasto: 329.9,
  },
  {
    id: 3,
    nome: "Juliana Martins",
    email: "juliana.m@gmail.com",
    telefone: "(51) 97733-4455",
    ultimaCompra: "20/01/2026",
    totalGasto: 1249.5,
  },
  {
    id: 4,
    nome: "Patrícia Nunes",
    email: "patricia.n@gmail.com",
    telefone: "(51) 96644-5566",
    ultimaCompra: "18/01/2026",
    totalGasto: 219.9,
  },
];

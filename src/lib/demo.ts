// src/lib/demo.ts
// Modo demonstração: uma conta compartilhada, aberta a qualquer visitante, num
// banco que volta sozinho para dados de exemplo todo dia.
//
// Liga só com NEXT_PUBLIC_DEMO_MODE=true no ambiente. Sem ela, nada deste modo
// aparece nem roda — é o caso do sistema da Íntima Sedução, que compartilha
// este código. Pode ser lido no cliente e no servidor.

/** true quando este deploy é o ambiente de demonstração. */
export const DEMO_ATIVO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Único projeto Supabase onde a demonstração pode rodar. A recarga dos dados de
 * exemplo APAGA vendas, produtos e clientes: se a variável de ambiente fosse
 * ligada por engano num deploy de loja de verdade, esta trava impede o estrago.
 */
export const PROJETO_DEMO = 'yqyzelfeutgzoyluwuec';

/** Conta compartilhada dos visitantes. Domínio .example é reservado: nenhum e-mail sai para ele. */
export const DEMO_EMAIL = 'demo@nexusstore.example';

/** PIN de gerente dos dados de exemplo — mostrado na faixa da demonstração. */
export const DEMO_PIN_GERENTE = '123456';

/** Horário da recarga diária, para o aviso na tela (o cron roda às 06:00 UTC). */
export const DEMO_HORA_RECARGA = '3h';

/** Liga e está no banco certo: a condição para qualquer coisa que escreva dados. */
export function demoPodeRodarAqui(): boolean {
  return DEMO_ATIVO && (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').includes(`${PROJETO_DEMO}.supabase.co`);
}

export const MSG_DESLIGADO_NA_DEMO = {
  email: 'O envio de e-mail fica desligado na demonstração.',
  upload: 'O envio de imagens fica desligado na demonstração.',
  whatsapp: 'Na demonstração o WhatsApp não é aberto. Esta é a mensagem que sairia:',
};

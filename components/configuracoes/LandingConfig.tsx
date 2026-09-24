'use client';

// components/configuracoes/LandingConfig.tsx
//
// Editor do conteúdo da landing page pública. Mora fora de configuracoes/page.tsx
// de propósito: aquele arquivo já passa de duas mil linhas, e este formulário
// não precisa de nada que esteja lá dentro — carrega e salva por conta própria.
//
// Escreve só as colunas da landing (updateLandingContent), então salvar aqui
// nunca desfaz o que a aba Meu Site, Frete ou Descontos gravou.

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDown, ArrowUp, ExternalLink, Eye, HelpCircle, Image as ImageIcon,
  Loader2, MessageCircle, Plus, Save, Sparkles, Store, Trash2, Upload, X,
} from 'lucide-react';

import {
  getWebsiteConfig, updateLandingContent, uploadImagemSite,
  type LandingBenefit, type LandingContent, type LandingFaqItem, type LandingStep,
} from '@/src/services/website.service';
import { ICONES_LANDING, ROTULOS_ICONES, iconeDoBeneficio } from '@/components/landing/icons';

const VAZIO: Required<LandingContent> = {
  logo_site_url: '',
  hero_eyebrow: '', hero_title: '', tagline: '', description: '',
  cta_revendedora_label: '', cta_revendedora_message: '',
  cta_cliente_label: '', cta_cliente_message: '',
  consignado_title: '', consignado_subtitle: '', consignado_steps: [],
  benefits_title: '', benefits_subtitle: '', benefits: [],
  about_title: '', about_text: '', about_image_url: '',
  owner_name: '', owner_role: '', owner_quote: '', owner_photo_url: '',
  faq_title: '', faq: [],
  contact_title: '', contact_text: '', show_address: true,
};

export default function LandingConfig() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [form, setForm] = useState<Required<LandingContent>>(VAZIO);

  useEffect(() => {
    getWebsiteConfig()
      .then(cfg => {
        if (!cfg?.id) return;
        setId(cfg.id);
        setSlug(cfg.slug || '');
        setForm({
          ...VAZIO,
          ...Object.fromEntries(
            Object.entries(cfg).filter(([k, v]) => k in VAZIO && v !== null && v !== undefined),
          ),
        } as Required<LandingContent>);
      })
      .catch(() => toast.error('Não consegui carregar o conteúdo do site'))
      .finally(() => setCarregando(false));
  }, []);

  const set = <K extends keyof LandingContent>(campo: K, valor: Required<LandingContent>[K]) =>
    setForm(p => ({ ...p, [campo]: valor }));

  async function salvar() {
    if (!id) return;
    setSalvando(true);
    try {
      await updateLandingContent(id, form);

      // A página pública é cacheada. Sem este aviso, a mudança demoraria até
      // cinco minutos para aparecer e pareceria que o salvar não funcionou.
      if (slug) {
        await fetch('/api/loja/revalidar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        }).catch(() => { /* o conteúdo já está salvo; o cache cai sozinho depois */ });
      }

      toast.success('Conteúdo do site salvo');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-xs font-medium">Carregando conteúdo do site...</span>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <Store size={26} className="mx-auto text-amber-500 mb-3" />
        <p className="text-sm font-bold text-amber-800">O site ainda não foi criado</p>
        <p className="text-xs text-amber-700 mt-1">
          Abra a aba <span className="font-bold">Meu Site</span>, defina o endereço e o nome da loja e salve.
          Depois volte aqui para escrever o conteúdo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-400 pb-24">

      {/* Barra do topo */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">Conteúdo da Landing</h3>
            <p className="text-[11px] text-zinc-400">Todo o texto da página pública, sem precisar de programador</p>
          </div>
        </div>
        {slug && (
          <a
            href={`/loja/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Eye size={14} /> Ver a página <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Aviso: o rascunho não é a palavra final */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-xs text-amber-800 leading-relaxed">
        <span className="font-bold">Confira antes de divulgar.</span> O texto que está aí foi escrito como
        rascunho para a página não nascer vazia. Prazo da mala, margem, política de troca e região atendida
        precisam bater com o que a loja realmente faz — é uma página pública, e cliente cobra o que leu nela.
      </div>

      {/* ── Herói ───────────────────────────────────────────────── */}
      <Secao titulo="Topo da página" descricao="A primeira coisa que aparece" icone={<Sparkles size={20} />}>
        <UploadImagem
          label="Logo do site"
          dica="Use a marca APARADA, sem faixa em branco em volta. A logo do recibo costuma vir num quadrado com muita margem, e no cabeçalho do site ela encolhe até virar um borrão. Vazio: usa a logo de Dados da Loja."
          prefixo="logo-site"
          url={form.logo_site_url}
          onChange={v => set('logo_site_url', v)}
        />
        <Campo
          label="Chapéu"
          dica="Linha pequena acima do nome. Ex.: Moda íntima · Canoas, RS"
          value={form.hero_eyebrow}
          onChange={v => set('hero_eyebrow', v)}
        />
        <Campo
          label="Título"
          dica="Deixe vazio para usar o nome da loja"
          value={form.hero_title}
          onChange={v => set('hero_title', v)}
        />
        <Campo
          label="Frase de impacto"
          dica="Uma linha que resume a loja"
          value={form.tagline}
          onChange={v => set('tagline', v)}
          largo
        />
        <AreaTexto
          label="Parágrafo de abertura"
          dica="Duas ou três linhas explicando o que a loja faz"
          value={form.description}
          onChange={v => set('description', v)}
          linhas={3}
        />
      </Secao>

      {/* ── Botões de conversa ──────────────────────────────────── */}
      <Secao
        titulo="Botões de WhatsApp"
        descricao="Os dois caminhos: quem quer revender e quem quer comprar"
        icone={<MessageCircle size={20} />}
      >
        <Campo label="Botão principal" value={form.cta_revendedora_label} onChange={v => set('cta_revendedora_label', v)} />
        <Campo label="Botão secundário" value={form.cta_cliente_label} onChange={v => set('cta_cliente_label', v)} />
        <AreaTexto
          label="Mensagem do botão principal"
          dica="Já vem escrita na conversa quando a pessoa clica"
          value={form.cta_revendedora_message}
          onChange={v => set('cta_revendedora_message', v)}
          linhas={2}
        />
        <AreaTexto
          label="Mensagem do botão secundário"
          value={form.cta_cliente_message}
          onChange={v => set('cta_cliente_message', v)}
          linhas={2}
        />
        <p className="col-span-2 text-[11px] text-zinc-400">
          O número usado é o WhatsApp configurado na aba <span className="font-bold">Meu Site</span>.
          Sem número lá, os botões não aparecem na página.
        </p>
      </Secao>

      {/* ── Como funciona ───────────────────────────────────────── */}
      <Secao titulo="Como funciona o consignado" descricao="Os passos, na ordem" icone={<Store size={20} />}>
        <Campo label="Título da seção" value={form.consignado_title} onChange={v => set('consignado_title', v)} />
        <Campo label="Subtítulo" value={form.consignado_subtitle} onChange={v => set('consignado_subtitle', v)} />

        <Repetidor<LandingStep>
          itens={form.consignado_steps}
          onChange={l => set('consignado_steps', l)}
          novo={() => ({ title: '', text: '' })}
          rotuloNovo="Adicionar passo"
          titulo={(item, i) => item.title || `Passo ${i + 1}`}
          vazio="Nenhum passo cadastrado. A seção não aparece na página."
          renderizar={(item, atualizar) => (
            <>
              <Campo label="Título do passo" value={item.title} onChange={v => atualizar({ ...item, title: v })} largo />
              <AreaTexto label="Explicação" value={item.text} onChange={v => atualizar({ ...item, text: v })} linhas={2} />
            </>
          )}
        />
      </Secao>

      {/* ── Vantagens ───────────────────────────────────────────── */}
      <Secao titulo="Vantagens de revender" descricao="Cartões com ícone" icone={<Sparkles size={20} />}>
        <Campo label="Título da seção" value={form.benefits_title} onChange={v => set('benefits_title', v)} />
        <Campo label="Subtítulo" value={form.benefits_subtitle} onChange={v => set('benefits_subtitle', v)} />

        <Repetidor<LandingBenefit>
          itens={form.benefits}
          onChange={l => set('benefits', l)}
          novo={() => ({ icon: 'sparkles', title: '', text: '' })}
          rotuloNovo="Adicionar vantagem"
          titulo={(item, i) => item.title || `Vantagem ${i + 1}`}
          vazio="Nenhuma vantagem cadastrada. A seção não aparece na página."
          renderizar={(item, atualizar) => (
            <>
              <Campo label="Título" value={item.title} onChange={v => atualizar({ ...item, title: v })} largo />
              <AreaTexto label="Explicação" value={item.text} onChange={v => atualizar({ ...item, text: v })} linhas={2} />
              <SeletorIcone valor={item.icon} onChange={v => atualizar({ ...item, icon: v })} />
            </>
          )}
        />
      </Secao>

      {/* ── A loja ──────────────────────────────────────────────── */}
      <Secao titulo="A loja e quem está por trás" descricao="História da loja e apresentação da dona" icone={<Store size={20} />}>
        <Campo label="Título da seção" value={form.about_title} onChange={v => set('about_title', v)} />
        <div />
        <AreaTexto
          label="Texto sobre a loja"
          dica="Linha em branco entre os parágrafos separa em blocos na página"
          value={form.about_text}
          onChange={v => set('about_text', v)}
          linhas={7}
        />
        <UploadImagem
          label="Foto da loja"
          dica="Sem foto, a página mostra a logo num cartão. 4:3 fica melhor."
          prefixo="loja"
          url={form.about_image_url}
          onChange={v => set('about_image_url', v)}
        />

        <Campo label="Nome de quem assina" value={form.owner_name} onChange={v => set('owner_name', v)} />
        <Campo label="Cargo" dica="Ex.: Fundadora da loja" value={form.owner_role} onChange={v => set('owner_role', v)} />
        <AreaTexto
          label="Frase pessoal"
          dica="Aparece entre aspas, como depoimento"
          value={form.owner_quote}
          onChange={v => set('owner_quote', v)}
          linhas={3}
        />
        <UploadImagem
          label="Retrato"
          dica="Aparece redondo, pequeno. Sem foto, vira um círculo com a inicial."
          prefixo="fundadora"
          url={form.owner_photo_url}
          onChange={v => set('owner_photo_url', v)}
          redondo
        />
      </Secao>

      {/* ── Perguntas ───────────────────────────────────────────── */}
      <Secao titulo="Perguntas frequentes" descricao="O que a pessoa pergunta antes de chamar" icone={<HelpCircle size={20} />}>
        <Campo label="Título da seção" value={form.faq_title} onChange={v => set('faq_title', v)} />
        <div />

        <Repetidor<LandingFaqItem>
          itens={form.faq}
          onChange={l => set('faq', l)}
          novo={() => ({ q: '', a: '' })}
          rotuloNovo="Adicionar pergunta"
          titulo={(item, i) => item.q || `Pergunta ${i + 1}`}
          vazio="Nenhuma pergunta cadastrada. A seção não aparece na página."
          renderizar={(item, atualizar) => (
            <>
              <Campo label="Pergunta" value={item.q} onChange={v => atualizar({ ...item, q: v })} largo />
              <AreaTexto label="Resposta" value={item.a} onChange={v => atualizar({ ...item, a: v })} linhas={3} />
            </>
          )}
        />
      </Secao>

      {/* ── Contato ─────────────────────────────────────────────── */}
      <Secao titulo="Fechamento e contato" descricao="A faixa colorida no fim da página" icone={<MessageCircle size={20} />}>
        <Campo label="Chamada final" value={form.contact_title} onChange={v => set('contact_title', v)} />
        <div />
        <AreaTexto label="Texto de apoio" value={form.contact_text} onChange={v => set('contact_text', v)} linhas={2} />
        <div className="col-span-2">
          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <div
              onClick={() => set('show_address', !form.show_address)}
              className={`w-9 h-5 rounded-full transition-colors relative ${form.show_address ? 'bg-indigo-600' : 'bg-zinc-200'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.show_address ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-zinc-700">Mostrar o endereço da loja na página</span>
          </label>
          <p className="text-[11px] text-zinc-400 mt-1.5">
            Vem do endereço cadastrado na aba <span className="font-bold">Dados da Loja</span>.
            Desligue se a loja atende só com hora marcada.
          </p>
        </div>
      </Secao>

      {/* Barra fixa de salvar — o formulário é longo demais para o botão morar no topo */}
      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent">
        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[2px] transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {salvando ? 'Salvando' : 'Salvar conteúdo do site'}
        </button>
      </div>
    </div>
  );
}

/* ─── Peças do formulário ────────────────────────────────────────────────── */

function Secao({
  titulo, descricao, icone, children,
}: {
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">{icone}</div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight">{titulo}</h3>
          <p className="text-[11px] text-zinc-400">{descricao}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

const CLASSE_ROTULO = 'text-[10px] font-bold text-zinc-400 uppercase tracking-tight mb-1 block';
const CLASSE_CAMPO =
  'w-full px-3 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

function Campo({
  label, dica, value, onChange, largo,
}: {
  label: string;
  dica?: string;
  value: string;
  onChange: (v: string) => void;
  largo?: boolean;
}) {
  return (
    <div className={largo ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
      <label className={CLASSE_ROTULO}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className={`h-9 ${CLASSE_CAMPO}`} />
      {dica && <p className="text-[10px] text-zinc-400 mt-1">{dica}</p>}
    </div>
  );
}

function AreaTexto({
  label, dica, value, onChange, linhas = 3,
}: {
  label: string;
  dica?: string;
  value: string;
  onChange: (v: string) => void;
  linhas?: number;
}) {
  return (
    <div className="col-span-2">
      <label className={CLASSE_ROTULO}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={linhas}
        className={`py-2 resize-y ${CLASSE_CAMPO}`}
      />
      {dica && <p className="text-[10px] text-zinc-400 mt-1">{dica}</p>}
    </div>
  );
}

function SeletorIcone({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <div className="col-span-2">
      <label className={CLASSE_ROTULO}>Ícone</label>
      <div className="flex flex-wrap gap-1.5">
        {Object.keys(ICONES_LANDING).map(chave => {
          const Icone = iconeDoBeneficio(chave);
          const ativo = valor === chave;
          return (
            <button
              key={chave}
              type="button"
              onClick={() => onChange(chave)}
              title={ROTULOS_ICONES[chave]}
              aria-label={ROTULOS_ICONES[chave]}
              aria-pressed={ativo}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                ativo
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                  : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:text-zinc-700 hover:border-zinc-300'
              }`}
            >
              <Icone size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UploadImagem({
  label, dica, prefixo, url, onChange, redondo,
}: {
  label: string;
  dica?: string;
  prefixo: string;
  url: string;
  onChange: (v: string) => void;
  redondo?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo depois de remover
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('A imagem precisa ter menos de 5MB'); return; }

    setEnviando(true);
    try {
      onChange(await uploadImagemSite(file, prefixo));
      toast.success('Imagem enviada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar a imagem');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="col-span-2">
      <label className={CLASSE_ROTULO}>{label}</label>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={enviar} />

      {url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className={`object-cover border border-zinc-200 ${redondo ? 'w-16 h-16 rounded-full' : 'w-28 h-20 rounded-xl'}`}
          />
          <button
            onClick={() => input.current?.click()}
            disabled={enviando}
            className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1.5"
          >
            {enviando ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Trocar
          </button>
          <button
            onClick={() => onChange('')}
            className="px-3 py-1.5 bg-white border border-red-100 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-50 flex items-center gap-1.5"
          >
            <X size={12} /> Remover
          </button>
        </div>
      ) : (
        <button
          onClick={() => input.current?.click()}
          disabled={enviando}
          className="w-full h-20 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all disabled:opacity-50"
        >
          {enviando ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
          <span className="text-xs font-medium">{enviando ? 'Enviando...' : 'Clique para enviar uma imagem'}</span>
        </button>
      )}
      {dica && <p className="text-[10px] text-zinc-400 mt-1">{dica}</p>}
    </div>
  );
}

/** Lista editável: adiciona, remove e reordena. A ordem aqui é a ordem na
 *  página, por isso as setas — arrastar com o mouse seria bonito e daria mais
 *  trabalho para quem edita no celular. */
function Repetidor<T>({
  itens, onChange, novo, rotuloNovo, titulo, vazio, renderizar,
}: {
  itens: T[];
  onChange: (l: T[]) => void;
  novo: () => T;
  rotuloNovo: string;
  titulo: (item: T, i: number) => string;
  vazio: string;
  renderizar: (item: T, atualizar: (novoItem: T) => void) => React.ReactNode;
}) {
  function mover(de: number, para: number) {
    if (para < 0 || para >= itens.length) return;
    const lista = [...itens];
    [lista[de], lista[para]] = [lista[para], lista[de]];
    onChange(lista);
  }

  return (
    <div className="col-span-2 space-y-3">
      {itens.length === 0 && (
        <p className="text-[11px] text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl px-4 py-3 text-center">
          {vazio}
        </p>
      )}

      {itens.map((item, i) => (
        <div key={i} className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-tight truncate">
              {i + 1}. {titulo(item, i)}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <BotaoIcone aoClicar={() => mover(i, i - 1)} desabilitado={i === 0} rotulo="Subir"><ArrowUp size={13} /></BotaoIcone>
              <BotaoIcone aoClicar={() => mover(i, i + 1)} desabilitado={i === itens.length - 1} rotulo="Descer"><ArrowDown size={13} /></BotaoIcone>
              <BotaoIcone aoClicar={() => onChange(itens.filter((_, j) => j !== i))} rotulo="Remover" perigo><Trash2 size={13} /></BotaoIcone>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderizar(item, novoItem => onChange(itens.map((x, j) => (j === i ? novoItem : x))))}
          </div>
        </div>
      ))}

      <button
        onClick={() => onChange([...itens, novo()])}
        className="w-full py-2.5 border-2 border-dashed border-zinc-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> {rotuloNovo}
      </button>
    </div>
  );
}

function BotaoIcone({
  aoClicar, desabilitado, rotulo, perigo, children,
}: {
  aoClicar: () => void;
  desabilitado?: boolean;
  rotulo: string;
  perigo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={aoClicar}
      disabled={desabilitado}
      title={rotulo}
      aria-label={rotulo}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
        perigo ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700'
      }`}
    >
      {children}
    </button>
  );
}

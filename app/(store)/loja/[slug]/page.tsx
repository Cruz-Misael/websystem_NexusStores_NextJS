// app/(store)/loja/[slug]/page.tsx
//
// A página pública da loja. Não vende: apresenta a marca, explica a venda
// consignada e leva a conversa para o WhatsApp — como revendedora ou como
// cliente. O catálogo/carrinho/checkout que moravam aqui estão preservados em
// ./_desativado (veja o README de lá).
//
// Server Component de propósito: HTML pronto na primeira resposta, título e
// descrição corretos para Google e para o preview do link no WhatsApp.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowRight, Instagram, MapPin, MessageCircle, Phone, Quote, Sparkles,
} from 'lucide-react';

import { getLandingData, linkWhatsApp } from '@/src/services/landing.service';
import { iconeDoBeneficio } from '@/components/landing/icons';
import LandingNav from '@/components/landing/LandingNav';
import FaqList from '@/components/landing/FaqList';
import Reveal from '@/components/landing/Reveal';

// Conteúdo institucional muda pouco; 5 minutos de cache tiram o banco do
// caminho de quem abre o link sem atrasar uma correção de texto.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dados = await getLandingData(slug);
  if (!dados) return { title: 'Loja não encontrada' };

  const titulo = dados.tagline ? `${dados.store_name} · ${dados.tagline}` : dados.store_name;
  const descricao = dados.description || dados.tagline || `Conheça a ${dados.store_name}.`;
  const imagem = dados.banner_url || dados.about_image_url || dados.logo_url || undefined;

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: 'website',
      locale: 'pt_BR',
      siteName: dados.store_name,
      images: imagem ? [imagem] : undefined,
    },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getLandingData(slug);
  if (!d) notFound();

  const cor = d.primary_color;
  const hrefRevendedora = linkWhatsApp(d.whatsapp_number, d.cta_revendedora_message);
  const hrefCliente = linkWhatsApp(d.whatsapp_number, d.cta_cliente_message);

  const temPassos = d.consignado_steps.length > 0;
  const temBeneficios = d.benefits.length > 0;
  const temSobre = Boolean(d.about_text || d.owner_quote);
  const temFaq = d.faq.length > 0;

  // O menu só oferece o que existe: seção vazia no banco não vira link morto.
  const secoes = [
    temPassos && { id: 'como-funciona', label: 'Como funciona' },
    temBeneficios && { id: 'beneficios', label: 'Vantagens' },
    temSobre && { id: 'a-loja', label: 'A loja' },
    temFaq && { id: 'perguntas', label: 'Perguntas' },
    { id: 'contato', label: 'Contato' },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="min-h-screen bg-zinc-50/80 font-sans scroll-smooth">
      <LandingNav
        storeName={d.store_name}
        logoUrl={d.logo_url}
        color={cor}
        instagramUrl={d.instagram_url}
        ctaHref={hrefRevendedora}
        ctaLabel={d.cta_revendedora_label}
        secoes={secoes}
      />

      {/* ── Herói ──────────────────────────────────────────────────────── */}
      <section id="topo" className="relative overflow-hidden">
        {d.banner_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.banner_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover animate-slow-zoom"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/75" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(150deg, ${cor}22 0%, ${cor}0a 45%, ${cor}1f 100%)` }}
            />
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage: `radial-gradient(circle, ${cor}33 1px, transparent 1px)`,
                backgroundSize: '28px 28px',
                maskImage: 'radial-gradient(ellipse 70% 80% at 50% 45%, black 25%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 45%, black 25%, transparent 100%)',
              }}
            />
            <div
              className="absolute top-0 right-0 w-[26rem] h-[26rem] rounded-full opacity-25 blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora"
              style={{ backgroundColor: cor }}
            />
            <div
              className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20 blur-3xl translate-y-1/3 -translate-x-1/4 animate-aurora-slow"
              style={{ backgroundColor: cor }}
            />
          </>
        )}

        <div className="relative max-w-3xl mx-auto px-5 py-20 md:py-28 flex flex-col items-center text-center gap-5">
          {/* Cartão branco com `object-contain`: serve tanto para um logotipo
              quadrado quanto para um lockup horizontal, e dá fundo claro para
              uma arte em traço preto que sumiria sobre o banner. */}
          {d.logo_url && (
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl blur-2xl opacity-40 scale-110" style={{ backgroundColor: cor }} />
              <div className="relative bg-white/90 backdrop-blur rounded-3xl px-6 py-4 shadow-2xl border border-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.logo_url}
                  alt={d.store_name}
                  className="h-16 md:h-20 w-auto max-w-[260px] md:max-w-[320px] object-contain"
                />
              </div>
            </div>
          )}

          {d.hero_eyebrow && (
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1.5px] px-3.5 py-1.5 rounded-full backdrop-blur-md border ${
                d.banner_url ? 'bg-white/15 border-white/25 text-white' : 'bg-white/70 border-white text-zinc-600'
              }`}
            >
              <Sparkles size={12} />
              {d.hero_eyebrow}
            </span>
          )}

          <h1
            className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]"
            style={d.banner_url ? { color: '#fff' } : { color: '#18181b' }}
          >
            {d.hero_title}
          </h1>

          {d.tagline && (
            <p className={`text-lg md:text-2xl font-semibold max-w-xl ${d.banner_url ? 'text-white/90' : 'text-zinc-600'}`}>
              {d.tagline}
            </p>
          )}

          {d.description && (
            <p className={`text-sm md:text-base leading-relaxed max-w-xl ${d.banner_url ? 'text-white/75' : 'text-zinc-500'}`}>
              {d.description}
            </p>
          )}

          {d.whatsapp_number && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-3 w-full sm:w-auto">
              <a
                href={hrefRevendedora}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 text-sm font-black text-white px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
                style={{ background: `linear-gradient(135deg, ${cor}, ${cor}bb)`, boxShadow: `0 10px 30px ${cor}45` }}
              >
                {d.cta_revendedora_label}
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href={hrefCliente}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 text-sm font-bold px-7 py-3.5 rounded-2xl border backdrop-blur-md transition-all active:scale-95 ${
                  d.banner_url
                    ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <MessageCircle size={16} />
                {d.cta_cliente_label}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Como funciona o consignado ─────────────────────────────────── */}
      {temPassos && (
        <section id="como-funciona" className="max-w-6xl mx-auto px-5 py-16 md:py-24 scroll-mt-20">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <TituloSecao titulo={d.consignado_title || 'Como funciona'} subtitulo={d.consignado_subtitle} cor={cor} />
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {d.consignado_steps.map((passo, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="relative h-full bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base mb-4 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${cor}, ${cor}bb)`, boxShadow: `0 8px 20px ${cor}3a` }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="text-[15px] font-black text-zinc-900 mb-2 leading-snug">{passo.title}</h3>
                  <p className="text-[13px] leading-relaxed text-zinc-500">{passo.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Vantagens de revender ──────────────────────────────────────── */}
      {temBeneficios && (
        <section id="beneficios" className="relative scroll-mt-20">
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${cor}0d, transparent)` }} />
          <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-24">
            <Reveal className="text-center max-w-2xl mx-auto mb-12">
              <TituloSecao titulo={d.benefits_title || 'Vantagens'} subtitulo={d.benefits_subtitle} cor={cor} />
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {d.benefits.map((beneficio, i) => {
                const Icone = iconeDoBeneficio(beneficio.icon);
                return (
                  <Reveal key={i} delay={(i % 3) * 0.08}>
                    <div className="h-full bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${cor}16`, color: cor }}
                      >
                        <Icone size={22} />
                      </div>
                      <h3 className="text-[15px] font-black text-zinc-900 mb-2">{beneficio.title}</h3>
                      <p className="text-[13px] leading-relaxed text-zinc-500">{beneficio.text}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── A loja e quem está por trás ────────────────────────────────── */}
      {temSobre && (
        <section id="a-loja" className="max-w-6xl mx-auto px-5 py-16 md:py-24 scroll-mt-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <RetratoDaLoja
                imagem={d.about_image_url}
                logo={d.logo_url}
                nome={d.store_name}
                cor={cor}
              />
            </Reveal>

            <Reveal delay={0.1} className="space-y-6">
              <TituloSecao titulo={d.about_title || 'A loja'} cor={cor} alinhamento="esquerda" />

              {d.about_text && (
                <div className="space-y-4">
                  {d.about_text.split('\n').filter(p => p.trim()).map((paragrafo, i) => (
                    <p key={i} className="text-[15px] leading-relaxed text-zinc-500">{paragrafo}</p>
                  ))}
                </div>
              )}

              {(d.owner_quote || d.owner_name) && (
                <div
                  className="relative rounded-3xl p-6 border"
                  style={{ backgroundColor: `${cor}0c`, borderColor: `${cor}2a` }}
                >
                  <Quote size={26} className="absolute top-5 right-5 opacity-15" style={{ color: cor }} />
                  {d.owner_quote && (
                    <p className="text-[15px] italic leading-relaxed text-zinc-700 mb-5">“{d.owner_quote}”</p>
                  )}
                  <div className="flex items-center gap-3">
                    {d.owner_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.owner_photo_url}
                        alt={d.owner_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black shadow-md"
                        style={{ background: `linear-gradient(135deg, ${cor}, ${cor}bb)` }}
                      >
                        {(d.owner_name || d.store_name).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      {d.owner_name && <p className="text-sm font-black text-zinc-900">{d.owner_name}</p>}
                      {d.owner_role && <p className="text-xs text-zinc-500">{d.owner_role}</p>}
                    </div>
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Perguntas frequentes ───────────────────────────────────────── */}
      {temFaq && (
        <section id="perguntas" className="max-w-3xl mx-auto px-5 py-16 md:py-24 scroll-mt-20">
          <Reveal className="text-center mb-10">
            <TituloSecao titulo={d.faq_title || 'Perguntas frequentes'} cor={cor} />
          </Reveal>
          <Reveal delay={0.08}>
            <FaqList itens={d.faq} color={cor} />
          </Reveal>
        </section>
      )}

      {/* ── Contato ────────────────────────────────────────────────────── */}
      <section id="contato" className="px-5 pb-16 md:pb-24 scroll-mt-20">
        <Reveal className="max-w-5xl mx-auto">
          <div
            className="relative overflow-hidden rounded-[2rem] px-6 py-14 md:px-14 text-center"
            style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />
            <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex flex-col items-center gap-4">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {d.contact_title || 'Vamos conversar?'}
              </h2>
              {d.contact_text && (
                <p className="text-white/85 text-sm md:text-base max-w-lg leading-relaxed">{d.contact_text}</p>
              )}

              {d.whatsapp_number && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-3 w-full sm:w-auto">
                  <a
                    href={hrefRevendedora}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 text-sm font-black px-7 py-3.5 rounded-2xl bg-white shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
                    style={{ color: cor }}
                  >
                    <MessageCircle size={16} />
                    {d.cta_revendedora_label}
                  </a>
                  <a
                    href={hrefCliente}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 text-sm font-bold px-7 py-3.5 rounded-2xl border border-white/40 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all"
                  >
                    {d.cta_cliente_label}
                  </a>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-x-7 gap-y-2 mt-6 text-[13px] text-white/80">
                {d.show_address && d.endereco && (
                  <span className="inline-flex items-center gap-1.5 text-center">
                    <MapPin size={14} className="shrink-0" /> {d.endereco}
                  </span>
                )}
                {d.telefone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={14} className="shrink-0" /> {d.telefone}
                  </span>
                )}
                {d.instagram_url && (
                  <a
                    href={d.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Instagram size={14} className="shrink-0" /> Instagram
                  </a>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Rodapé ─────────────────────────────────────────────────────── */}
      <footer className="relative bg-white/60 backdrop-blur-sm">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${cor}45, transparent)` }}
        />
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black"
              style={{ background: `linear-gradient(135deg, ${cor}, ${cor}bb)` }}
            >
              {d.store_name.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-zinc-700 text-sm">{d.store_name}</span>
          </div>
          <p className="text-xs text-zinc-400 text-center">
            © {new Date().getFullYear()} {d.store_name} · <span className="text-zinc-300">Powered by NexusStores</span>
          </p>
          <div className="flex items-center gap-3">
            {d.instagram_url && (
              <a
                href={d.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-zinc-400 hover:text-pink-500 transition-colors"
              >
                <Instagram size={16} />
              </a>
            )}
            {d.whatsapp_number && (
              <a
                href={hrefCliente}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="text-zinc-400 hover:text-green-500 transition-colors"
              >
                <MessageCircle size={16} />
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* ── WhatsApp flutuante ─────────────────────────────────────────── */}
      {d.whatsapp_number && (
        <a
          href={hrefCliente}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white
                     bg-gradient-to-br from-green-400 to-green-600 shadow-xl shadow-green-500/30
                     hover:scale-110 active:scale-95 transition-transform animate-pulse-ring"
        >
          <MessageCircle size={24} />
        </a>
      )}
    </div>
  );
}

/* ─── Peças da página ────────────────────────────────────────────────────── */

function TituloSecao({
  titulo, subtitulo, cor, alinhamento = 'centro',
}: {
  titulo: string;
  subtitulo?: string;
  cor: string;
  alinhamento?: 'centro' | 'esquerda';
}) {
  const centralizado = alinhamento === 'centro';
  return (
    <div className={centralizado ? 'flex flex-col items-center' : ''}>
      <div className="w-12 h-1 rounded-full mb-5" style={{ background: `linear-gradient(90deg, ${cor}, ${cor}55)` }} />
      <h2 className={`text-3xl md:text-4xl font-black text-zinc-900 tracking-tight ${centralizado ? 'text-center' : ''}`}>
        {titulo}
      </h2>
      {subtitulo && (
        <p className={`mt-3 text-[15px] leading-relaxed text-zinc-500 ${centralizado ? 'text-center' : ''}`}>
          {subtitulo}
        </p>
      )}
    </div>
  );
}

/** Imagem da seção "A loja". Sem foto enviada, monta um cartão com a logo —
 *  melhor do que um buraco no layout enquanto a loja não manda uma imagem. */
function RetratoDaLoja({
  imagem, logo, nome, cor,
}: {
  imagem: string;
  logo: string | null;
  nome: string;
  cor: string;
}) {
  if (imagem) {
    return (
      <div className="relative">
        <div className="absolute -inset-3 rounded-[2rem] opacity-20 blur-2xl" style={{ backgroundColor: cor }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagem}
          alt={nome}
          className="relative w-full aspect-[4/3] object-cover rounded-[2rem] shadow-xl border border-white"
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden flex items-center justify-center border border-white shadow-xl"
      style={{ background: `linear-gradient(150deg, ${cor}26, ${cor}0a 55%, ${cor}1f)` }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle, ${cor}40 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="absolute -top-10 -left-6 w-56 h-56 rounded-full opacity-25 blur-3xl animate-aurora"
        style={{ backgroundColor: cor }}
      />
      {logo ? (
        <div className="relative bg-white/90 backdrop-blur rounded-3xl px-7 py-5 shadow-2xl border border-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={nome} className="h-16 w-auto max-w-[240px] object-contain" />
        </div>
      ) : (
        <span className="relative text-5xl font-black" style={{ color: cor }}>{nome.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import {
  Blend,
  GalleryHorizontal,
  Layers3,
  Orbit,
  PanelsTopLeft,
  Sparkles,
  SplinePointer,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Aurora from "@/components/animations/Aurora";
import BlurText from "@/components/animations/BlurText";
import BorderGlow from "@/components/animations/BorderGlow";
import CardNav from "@/components/animations/CardNav";
import CardSwap from "@/components/animations/CardSwap";
import Carousel from "@/components/animations/Carousel";
import CircularText from "@/components/animations/CircularText";
import CurvedLoop from "@/components/animations/CurvedLoop";
import LogoLoop from "@/components/animations/LogoLoop";
import ScrollReveal from "@/components/animations/ScrollReveal";
import ScrollVelocity from "@/components/animations/ScrollVelocity";
import Stepper, { type Step } from "@/components/animations/Stepper";
import VariableProximity from "@/components/animations/VariableProximity";

interface ReactBitsShowcaseProps {
  mode?: "landing" | "admin";
}

function ShowcaseCard({
  title,
  label,
  description,
  icon,
  className,
  children,
}: {
  title: string;
  label: string;
  description: string;
  icon: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,18,24,0.95),rgba(9,9,13,0.95))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)]",
        className,
      )}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-crimson/40 to-transparent" />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-crimson/75">{label}</div>
          <h3 className="mt-2 font-bebas text-3xl text-bone">{title}</h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-bone/45">{description}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-crimson/80">{icon}</div>
      </div>
      {children}
    </article>
  );
}

const swapItems = [
  {
    id: "logs",
    eyebrow: "Logs",
    title: "Canais Vigiados",
    description: "Troque prioridades entre auditoria, moderação e histórico com uma pilha viva de cards.",
    accent: "#C41230",
  },
  {
    id: "welcome",
    eyebrow: "Welcome",
    title: "Entrada Dramática",
    description: "Mensagens de boas-vindas com banner, texto customizado e timing de exibição mais teatral.",
    accent: "#E87A3F",
  },
  {
    id: "roles",
    eyebrow: "Roles",
    title: "Cargos Automáticos",
    description: "Mostra visualmente qual camada do setup está ativa sem perder o foco do operador.",
    accent: "#34D399",
  },
];

const carouselSlides = [
  {
    id: "bot",
    title: "Painel do Bot",
    description: "KPIs, ping e atividade recente em um fluxo contínuo e mais editorial.",
    accent: "#C41230",
  },
  {
    id: "guild",
    title: "Painel do Servidor",
    description: "Alterna highlights de canais, funções e eventos programados sem poluir a tela.",
    accent: "#60A5FA",
  },
  {
    id: "ops",
    title: "Painel de Operação",
    description: "Carrossel com blocos de ação para times que vivem alternando entre áreas do dashboard.",
    accent: "#F59E0B",
  },
];

const logoItems = ["Discord.js", "Next.js 16", "Socket.io", "SQLite", "Vercel", "Discloud", "OAuth", "JJK UI"];

const stepperSteps: Step[] = [
  {
    id: "guild",
    label: "Servidor",
    description: "Escolha onde a maldição vai atuar.",
    content: (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-bone/55">Painel principal</div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-bone/55">Servidor secundário</div>
      </div>
    ),
  },
  {
    id: "logs",
    label: "Logs",
    description: "Defina para onde os rastros devem ir.",
    content: (
      <div className="space-y-3">
        <div className="rounded-xl border border-crimson/20 bg-crimson/10 p-4 text-sm text-bone/70">Canal #sangue-rastreado</div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-bone/55">Canal #auditoria</div>
      </div>
    ),
  },
  {
    id: "deploy",
    label: "Deploy",
    description: "Finalize o fluxo antes de publicar.",
    content: (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-200">
        Slash commands prontos para sincronizar.
      </div>
    ),
  },
];

const cardNavItems = [
  {
    id: "lp",
    label: "LP",
    title: "Landing Experience",
    description: "Cards de navegação maiores para destacar blocos da landing com ritmo e hierarquia mais cinematográfica.",
  },
  {
    id: "admin",
    label: "Admin",
    title: "Painel Operacional",
    description: "Uma navegação por cards reduz o atrito quando você alterna entre logs, verificações e embeds.",
  },
  {
    id: "labs",
    label: "Labs",
    title: "Componentes Experimentais",
    description: "Perfeito para um espaço de demos vivas onde você quer mostrar personalidade sem quebrar o fluxo do produto.",
  },
];

export function ReactBitsShowcase({ mode = "landing" }: ReactBitsShowcaseProps) {
  const isAdmin = mode === "admin";

  return (
    <section
      id={isAdmin ? undefined : "reactbits"}
      className={cn(isAdmin ? "space-y-6" : "relative section-padding gradient-section")}
    >
      <div className={cn(isAdmin ? "space-y-6" : "section-container space-y-8")}>
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-crimson/20 bg-crimson/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-crimson/75">
            React Bits Inspired Lab
          </div>
          <h2 className="mt-4 font-bebas text-5xl leading-none text-bone sm:text-6xl">
            Containers Vivos para a LP e para o Admin
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bone/50 sm:text-base">
            Montei uma vitrine reutilizável com os componentes citados para você experimentar tanto na landing page quanto na área de administração.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ShowcaseCard
            title="Border Glow"
            label="Component"
            description="Um bloco interativo que responde ao cursor com brilho amaldiçoado."
            icon={<Sparkles className="h-5 w-5" />}
          >
            <BorderGlow glowColor="rgba(196, 18, 48, 0.52)" wrapperClassName="rounded-2xl">
              <div className="rounded-2xl border border-white/10 bg-[#0c0c11]/90 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-bone/35">Glow Status</p>
                    <p className="mt-2 font-bebas text-3xl text-bone">Painel Monitorado</p>
                  </div>
                  <div className="h-3 w-3 rounded-full bg-crimson animate-pulse" />
                </div>
                <p className="mt-3 max-w-md text-sm text-bone/50">
                  Passe o mouse para sentir o brilho percorrendo a borda do container.
                </p>
              </div>
            </BorderGlow>
          </ShowcaseCard>

          <ShowcaseCard
            title="Blur Text"
            label="Text Animation"
            description="Headline de entrada com palavras reveladas em sequência."
            icon={<Blend className="h-5 w-5" />}
          >
            <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-6">
              <BlurText text="Itadori entra primeiro. Depois o caos." delay={40} className="font-bebas text-5xl leading-none text-bone" />
            </div>
          </ShowcaseCard>

          <ShowcaseCard
            title="Aurora"
            label="Background"
            description="Background atmosférico para dar profundidade sem cair no genérico."
            icon={<Orbit className="h-5 w-5" />}
          >
            <div className="relative h-56 overflow-hidden rounded-2xl border border-white/10 bg-[#09090d]">
              <Aurora colorStops={["#17070b", "#7e0e20", "#08080a"]} amplitude={0.7} />
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/60" />
              <div className="relative z-10 flex h-full items-end p-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-bone/40">Background Layer</p>
                  <p className="mt-2 font-bebas text-4xl text-bone">Neblina Amaldiçoada</p>
                </div>
              </div>
            </div>
          </ShowcaseCard>

          <ShowcaseCard
            title="Card Swap"
            label="Component"
            description="Uma pilha de cards com alternância automática para destacar diferentes estados do bot."
            icon={<Layers3 className="h-5 w-5" />}
          >
            <CardSwap items={swapItems} />
          </ShowcaseCard>

          <ShowcaseCard
            title="Carousel"
            label="Component"
            description="Slides editoriais para apresentar áreas do produto com mais espaço visual."
            icon={<GalleryHorizontal className="h-5 w-5" />}
          >
            <Carousel slides={carouselSlides} />
          </ShowcaseCard>

          <ShowcaseCard
            title="Logo Loop"
            label="Animation"
            description="Marquee técnico que reforça stack, integrações e identidade do projeto."
            icon={<Orbit className="h-5 w-5" />}
          >
            <LogoLoop items={logoItems} />
          </ShowcaseCard>

          <ShowcaseCard
            title="Variable Proximity"
            label="Text Animation"
            description="Texto que reage à proximidade do cursor para guiar o olhar sem usar modal nem tooltip."
            icon={<SplinePointer className="h-5 w-5" />}
          >
            <VariableProximity text="A energia muda quando voce se aproxima do ponto certo." className="font-bebas text-4xl leading-none" />
          </ShowcaseCard>

          <ShowcaseCard
            title="Stepper"
            label="Component"
            description="Fluxo em etapas para setup guiado de canais, roles e deploy."
            icon={<Workflow className="h-5 w-5" />}
          >
            <Stepper steps={stepperSteps} completeText="Sincronizar" className="max-w-none" />
          </ShowcaseCard>

          <ShowcaseCard
            title="Scroll Velocity"
            label="Text Animation"
            description="Faixa em movimento para dar ritmo a áreas de destaque e dashboards."
            icon={<GalleryHorizontal className="h-5 w-5" />}
          >
            <div className="rounded-2xl border border-white/10 bg-[#0d0d12] py-5">
              <ScrollVelocity text="ITADORI BOT - LANDING PAGE - ADMIN PANEL -" velocity={2.4} className="font-bebas text-5xl tracking-[0.2em] text-crimson/35" />
            </div>
          </ShowcaseCard>

          <ShowcaseCard
            title="Card Nav"
            label="Component"
            description="Navegação por cards com destaque forte para áreas principais do dashboard."
            icon={<PanelsTopLeft className="h-5 w-5" />}
          >
            <CardNav items={cardNavItems} />
          </ShowcaseCard>

          <ShowcaseCard
            title="Curved Loop"
            label="Text Animation"
            description="Um loop curvo para legendas, slogans e ornamentos de seção."
            icon={<Blend className="h-5 w-5" />}
          >
            <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-3">
              <CurvedLoop text="ENERGIA AMALDICOADA EM LOOP" className="h-44" />
            </div>
          </ShowcaseCard>

          <ShowcaseCard
            title="Circular Text"
            label="Text Animation"
            description="Anel tipográfico para selos, discos de status e detalhes de hero."
            icon={<Orbit className="h-5 w-5" />}
          >
            <div className="flex min-h-52 items-center justify-center rounded-2xl border border-white/10 bg-[#0d0d12]">
              <CircularText text="ITADORI • REACT BITS • DASHBOARD • " size={180} duration={18} />
            </div>
          </ShowcaseCard>

          <ShowcaseCard
            title="Scroll Reveal"
            label="Text Animation"
            description="Entradas progressivas para listas, métricas e storytelling de produto."
            icon={<Sparkles className="h-5 w-5" />}
            className="xl:col-span-2"
          >
            <div className="grid gap-4 md:grid-cols-3">
              {[
                "Metrica viva",
                "Logs que respiram",
                "Containers com personalidade",
              ].map((item, index) => (
                <ScrollReveal key={item} delay={index * 140} direction="up">
                  <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-5">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-crimson/70">Reveal {index + 1}</p>
                    <p className="mt-3 font-bebas text-3xl text-bone">{item}</p>
                    <p className="mt-2 text-sm leading-relaxed text-bone/50">
                      Cada bloco entra com peso e contexto, sem parecer template copiado.
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </ShowcaseCard>
        </div>
      </div>
    </section>
  );
}

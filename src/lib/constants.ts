// ============================================
// ITADORI BOT — CONSTANTS
// ============================================

export const SITE = {
  name: "Itadori Bot",
  title: "Itadori Bot | O Bot que Destrói",
  description:
    "Bot de Discord personificado em Itadori Yuji de Jujutsu Kaisen. Administre seu servidor com poder amaldiçoado.",
  discordServer: "https://discord.gg/azSBYfjUHY",
} as const;

export const NAV_LINKS = [
  { label: "Início", href: "#inicio" },
  { label: "Updates", href: "#updates" },
  { label: "Sobre", href: "#sobre" },
  { label: "Poderes", href: "#poderes" },
  { label: "Comandos", href: "#comandos" },
  { label: "Feiticeiros", href: "#feiticeiros" },
  { label: "Suporte", href: "#suporte" },
] as const;

export const STATS = [
  { value: 21931, suffix: "", label: "Desmantelares Utilizados", sublabel: "quantidade de comandos usados" },
  { value: 9192, suffix: "", label: "Feiticeiros Ajudados", sublabel: "membros no geral" },
  { value: 910, suffix: "h", label: "Ativo nas Sombras", sublabel: "horas ativo no mundo JJK" },
] as const;

export const COMMANDS = [
  {
    category: "Administrador",
    icon: "🛡️",
    color: "crimson",
    commands: [
      { name: "setwelcome", description: "Configura a mensagem de boas-vindas com embed personalizado", usage: "/setwelcome #canal" },
      { name: "setlogs", description: "Define o canal de logs para registrar atividades do servidor", usage: "/setlogs #canal" },
      { name: "setnovidades", description: "Configura o canal das notas automaticas de update", usage: "/setnovidades #canal" },
      { name: "setverificar", description: "Configura o sistema de verificação de membros", usage: "/setverificar #canal" },
      { name: "ban", description: "Bane um usuário permanentemente do servidor", usage: "/ban @user [motivo]" },
      { name: "kick", description: "Expulsa um usuário do servidor", usage: "/kick @user [motivo]" },
      { name: "clear", description: "Apaga mensagens em massa de um canal", usage: "/clear [quantidade]" },
      { name: "update", description: "Atualiza configurações e informações do bot", usage: "/update" },
    ],
  },
  {
    category: "Utilidade",
    icon: "⚡",
    color: "bone",
    commands: [
      { name: "ping", description: "Verifica a latência do bot e da API do Discord", usage: "/ping" },
      { name: "botinfo", description: "Exibe informações detalhadas sobre o bot", usage: "/botinfo" },
      { name: "serverinfo", description: "Mostra informações completas do servidor", usage: "/serverinfo" },
      { name: "userinfo", description: "Exibe o perfil detalhado de um usuário", usage: "/userinfo [@user]" },
      { name: "avatar", description: "Mostra o avatar em alta resolução de um usuário", usage: "/avatar [@user]" },
      { name: "help", description: "Lista todos os comandos disponíveis com descrições", usage: "/help" },
      { name: "telemetria", description: "Estatísticas de uso e desempenho do bot", usage: "/telemetria" },
    ],
  },
  {
    category: "Diversão",
    icon: "🎲",
    color: "void",
    commands: [
      { name: "8ball", description: "Faça uma pergunta e receba uma resposta do oráculo", usage: "/8ball [pergunta]" },
      { name: "coinflip", description: "Joga uma moeda — cara ou coroa", usage: "/coinflip" },
      { name: "dice", description: "Lança um dado com N lados (padrão: 6)", usage: "/dice [lados]" },
      { name: "say", description: "Faz o bot repetir sua mensagem no canal", usage: "/say [mensagem]" },
      { name: "meme", description: "Busca um meme aleatório do Reddit", usage: "/meme" },
    ],
  },
] as const;

export const FEATURES = [
  {
    icon: "⚔️",
    title: "Moderação Amaldiçoada",
    description: "Ban, kick, clear e logs completos. Mantenha seu servidor seguro com o poder de um feiticeiro grau especial.",
  },
  {
    icon: "🎯",
    title: "Welcome Personalizado",
    description: "Configure embeds de boas-vindas únicos com imagem, texto e muito mais para novos membros.",
  },
  {
    icon: "📋",
    title: "Logs em Tempo Real",
    description: "Registre todas as atividades do servidor: entradas, saídas, banimentos e edições de mensagens.",
  },
  {
    icon: "🔮",
    title: "Comandos de Diversão",
    description: "Mantenha seus membros entretidos com comandos interativos, memes e o oráculo da 8-ball.",
  },
  {
    icon: "🌐",
    title: "Dashboard Web",
    description: "Painel completo para administrar tudo do seu servidor direto pelo navegador, sem digitar comandos.",
  },
  {
    icon: "⚡",
    title: "Sempre Online",
    description: "Com +910h ativo e 21.931 desmantelares executados, o bot nunca dorme. Assim como Sukuna.",
  },
] as const;

export const TICKER_ITEMS = [
  "DESMANTELAR ATIVADO",
  "ENERGIA AMALDIÇOADA LIBERADA",
  "NOVO FEITICEIRO RECRUTADO",
  "JUJUTSU KAISEN",
  "PROTEGENDO O SERVIDOR",
  "SUKUNA DORME",
  "YUJI VIVE",
  "GRAU ESPECIAL ONLINE",
  "INVERSÃO MALDITA EXECUTADA",
  "DOMÍNIO EXPANDIDO",
] as const;

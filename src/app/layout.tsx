import type { Metadata } from "next";
import { Poppins, Bebas_Neue } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Itadori Bot | O Bot que Destrói",
  description:
    "Bot de Discord personificado em Itadori Yuji de Jujutsu Kaisen. Administre seu servidor com poder amaldiçoado — moderação, logs, welcome e muito mais.",
  keywords: ["discord bot", "itadori", "jujutsu kaisen", "moderação", "bot discord"],
  authors: [{ name: "Itadori Bot" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Itadori Bot | O Bot que Destrói",
    description: "Administre seu servidor com poder amaldiçoado.",
    siteName: "Itadori Bot",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#08080A" />
      </head>
      <body
        className={`${poppins.variable} ${bebas.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

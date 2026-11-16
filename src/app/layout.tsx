import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { headers } from "next/headers";
import { ToastProvider } from "@/components/providers/toast";
import { CookieConsent } from "@/components/providers/cookie-consent";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap", weight: ["500", "600", "700"] });

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "Óculos Meta Store — Óculos inteligentes", template: "%s | Óculos Meta Store" },
  description: "Óculos inteligentes Ray-Ban Meta e outros modelos com compra segura, PIX, cartão em até 12x e entrega rastreada.",
  applicationName: "Óculos Meta Store",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Óculos Meta Store", url: appUrl },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1437",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Acessar os cabeçalhos força renderização dinâmica — necessária para que o
  // Next.js aplique a todos os scripts o nonce da CSP gerado por requisição (src/proxy.ts).
  await headers();
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <ToastProvider>
          {children}
          <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  );
}

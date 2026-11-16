import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { getNavigation } from "@/server/services/navigation";
import { getStoreSettings } from "@/server/services/settings";
import { AnnouncementBar, type Announcement } from "./announcement-bar";
import { HeaderClient } from "./header-client";

export async function Header() {
  const [user, navigation, settings] = await Promise.all([getCurrentUser(), getNavigation(), getStoreSettings()]);

  // Só fatos garantidos pela própria loja (configurações e lei) — nada de promoção inventada.
  const announcements: Announcement[] = [
    { text: "Entrega com rastreio para todo o Brasil", href: "/faq" },
    { text: `Parcele em até ${settings.maxInstallments}x no cartão` },
    { text: "PIX com aprovação imediata" },
    { text: "7 dias para desistir após receber", href: "/trocas-e-devolucoes" },
  ];

  return (
    <>
      <AnnouncementBar items={announcements} />
      <HeaderClient
        storeName={settings.storeName}
        user={user ? { firstName: user.name.split(" ")[0] ?? user.name, isStaff: isStaff(user.role) } : null}
        navigation={navigation}
      />
    </>
  );
}

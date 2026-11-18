import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { getNavigation } from "@/server/services/navigation";
import { getStoreSettings } from "@/server/services/settings";
import { HeaderClient } from "./header-client";

export async function Header() {
  const [user, navigation, settings] = await Promise.all([getCurrentUser(), getNavigation(), getStoreSettings()]);
  return (
    <HeaderClient
      storeName={settings.storeName}
      user={user ? { firstName: user.name.split(" ")[0] ?? user.name, isStaff: isStaff(user.role) } : null}
      navigation={navigation}
    />
  );
}

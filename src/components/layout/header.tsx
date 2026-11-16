import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { getActiveCategories } from "@/server/services/catalog";
import { getStoreSettings } from "@/server/services/settings";
import { HeaderClient } from "./header-client";

export async function Header() {
  const [user, categories, settings] = await Promise.all([getCurrentUser(), getActiveCategories(), getStoreSettings()]);
  return (
    <HeaderClient
      storeName={settings.storeName}
      user={user ? { firstName: user.name.split(" ")[0] ?? user.name, isStaff: isStaff(user.role) } : null}
      categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
    />
  );
}

import { createClient } from "@supabase/supabase-js";
import { projectUrl } from "./supabase-url";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();
let configurationError = "";
function configuredClient() {
  if (!url || !key) return null;
  try {
    const project = projectUrl(url);
    let privateKey = key.startsWith("sb_secret_");
    try {
      privateKey ||=
        JSON.parse(
          atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
        ).role === "service_role";
    } catch {
      /* Publishable keys need not be JWTs. */
    }
    if (privateKey) {
      configurationError =
        "В настройках сборки указан приватный ключ. Удалите его, перевыпустите в Supabase и используйте только Publishable/anon key.";
      return null;
    }
    return createClient(project, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    });
  } catch {
    configurationError =
      "Адрес синхронизации неверен: нужен Project URL из Supabase → Settings → API (например, https://идентификатор.supabase.co), а не адрес этого сайта.";
    return null;
  }
}
export const supabase = configuredClient();
export const syncConfigured = Boolean(supabase);
export { configurationError };

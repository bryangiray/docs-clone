import "server-only";
import { query } from "@/lib/db/client";

/** Raw key/value access to global_settings; meaning lives in the services. */
export async function getSetting(key: string): Promise<string | undefined> {
  const [row] = await query(
    "SELECT setting_value FROM global_settings WHERE setting_key = $1",
    [key],
  );
  return row && String(row.setting_value);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO global_settings (setting_key, setting_value)
     VALUES ($1, $2)
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value,
                   updated_at = CURRENT_TIMESTAMP`,
    [key, value],
  );
}

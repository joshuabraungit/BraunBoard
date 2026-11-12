// The job tools aren't live yet. Until JOB_TOOLS_PUBLIC=1 is set in Vercel, only admins
// (ADMIN_EMAILS, Josh by default) see them, and the server actions refuse everyone else.
import "server-only";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "../admin";

// Vercel preview builds (not braunboard.com) show them too, so Josh can try them without
// signing in there. Preview links sit behind Vercel's own login by default.
export const toolsPublic = () => process.env.JOB_TOOLS_PUBLIC === "1" || process.env.VERCEL_ENV === "preview";
export const canUseTools = (user: Pick<User, "email"> | null) => toolsPublic() || isAdmin(user);

// The job tools aren't live yet. Until JOB_TOOLS_PUBLIC=1 is set in Vercel, only admins
// (ADMIN_EMAILS, Josh by default) see them, and the server actions refuse everyone else.
import "server-only";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "../admin";

export const toolsPublic = () => process.env.JOB_TOOLS_PUBLIC === "1";
export const canUseTools = (user: Pick<User, "email"> | null) => toolsPublic() || isAdmin(user);

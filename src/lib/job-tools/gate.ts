// Before You Apply is live for everyone (Nov 11, 2026). To hide it again without a code
// change, set JOB_TOOLS_PUBLIC=0 in Vercel and redeploy: then only admins (ADMIN_EMAILS,
// Josh by default) see it, and the server actions refuse everyone else.
import "server-only";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "../admin";

export const toolsPublic = () => process.env.JOB_TOOLS_PUBLIC !== "0";
export const canUseTools = (user: Pick<User, "email"> | null) => toolsPublic() || isAdmin(user);

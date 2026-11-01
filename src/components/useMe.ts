"use client";
import { useEffect, useState } from "react";
import { hasAuthCookie } from "@/lib/supabase/auth-cookie";

export type Me = { email: string | null; admin: boolean } | null;

const cookieNames = () =>
  document.cookie
    .split(";")
    .map((c) => ({ name: c.split("=")[0].trim() }))
    .filter((c) => c.name);

/** Who's signed in. undefined while checking; null when signed out. Most visitors aren't, so they skip the request. */
export function useMe(): Me | undefined {
  const [me, setMe] = useState<Me | undefined>(undefined);
  useEffect(() => {
    if (!hasAuthCookie(cookieNames())) return setMe(null);
    let live = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Me) => live && setMe(m))
      .catch(() => live && setMe(null));
    return () => {
      live = false;
    };
  }, []);
  return me;
}

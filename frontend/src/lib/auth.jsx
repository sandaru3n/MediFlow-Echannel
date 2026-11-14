"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/integrations/supabase/client";

const AuthContext = createContext({ user: null, roles: [], profile: null, loading: true });

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadExtras = useCallback(async (u) => {
    if (!u) {
      setRoles([]);
      setProfile(null);
      return;
    }
    const sb = getSupabase();
    const [r, p] = await Promise.all([
      sb.from("user_roles").select("role").eq("user_id", u.id),
      sb.from("profiles").select("id, full_name, phone, email, language").eq("id", u.id).maybeSingle(),
    ]);
    setRoles((r.data ?? []).map((x) => x.role));
    setProfile(p.data ?? null);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    let active = true;
    sb.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      await loadExtras(data.user ?? null);
      if (active) setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => loadExtras(u).finally(() => setLoading(false)), 0);
        qc.invalidateQueries();
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadExtras, qc]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    qc.clear();
    window.location.assign("/");
  }, [qc]);

  const value = useMemo(
    () => ({
      user,
      roles,
      profile,
      loading,
      signOut,
      hasRole: (r) => roles.includes(r),
      refresh: (u = user) => loadExtras(u),
    }),
    [user, roles, profile, loading, signOut, loadExtras],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Where a signed-in user should land based on their highest role. */
export const homeFor = (roles) => (roles.includes("admin") ? "/admin" : roles.includes("doctor") ? "/doctor" : "/dashboard");

import { ReactNode, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Loading } from "../../components/ui/Loading";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      window.location.href = "/login";
    } else {
      setAuthenticated(true);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F2548] flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return authenticated ? <>{children}</> : null;
}

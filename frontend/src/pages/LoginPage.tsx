import { useState, FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Dumbbell } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      window.location.href = "/";
    } catch (err: any) {
      setError("Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 backdrop-blur-xl border border-white/10 rounded-3xl mb-6 shadow-glass">
            <Dumbbell className="w-10 h-10 text-primary-light" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">ClubManager</h1>
          <p className="text-muted">Connectez-vous à votre compte</p>
        </div>

        <div className="bg-surface-2/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-glass">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-danger/20 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm animate-slide-up">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

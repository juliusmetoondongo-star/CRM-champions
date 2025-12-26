// src/App.tsx
import { useState, useEffect } from "react";
import { RequireAuth } from "./features/auth/RequireAuth";
import { IdleGuard } from "./features/auth/IdleGuard";

import { LoginPage } from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";      // ✅ default
import Members from "./pages/Members";          // ✅ default
import Subscriptions from "./pages/Subscriptions";
import Payments from "./pages/Payments";
import { Checkins } from "./pages/Checkins";
import { AuditLogs } from "./pages/AuditLogs";
import { ScanPage } from "./pages/ScanPage";
import Plans from "./pages/Plans";
import { Accounting } from "./pages/Accounting";
import Insurances from "./pages/Insurances";

import NotificationsPage from "./pages/NotificationsPage";
import NotificationsBell from "./components/NotificationsBell";
import SearchGlobal from "./components/SearchGlobal";
import { MemberDetailsModal } from "./features/members/MemberDetailsModal";

import { ToastContainer } from "./components/ui/Toast";
import { useToast } from "./hooks/useToast";
import { supabase } from "./lib/supabaseClient";
import type { MemberSummary } from "./types/member";

import {
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  Clock,
  FileText,
  Scan,
  LogOut,
  Dumbbell,
  Menu,
  Tag,
  Search,
  Shield,
} from "lucide-react";

/** Petit ErrorBoundary pour éviter un écran vide */
function ErrorBoundary(props: { children: React.ReactNode }) {
  const [err, setErr] = useState<Error | null>(null);
  useEffect(() => {
    const handler = (e: ErrorEvent) => setErr(e.error ?? new Error(e.message));
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", (e) =>
      setErr(e.reason instanceof Error ? e.reason : new Error(String(e.reason)))
    );
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", () => {});
    };
  }, []);
  if (err) {
    return (
      <div className="p-6 m-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-100">
        <div className="font-semibold mb-2">Une erreur s’est produite</div>
        <pre className="text-xs whitespace-pre-wrap opacity-90">{String(err.stack || err.message)}</pre>
      </div>
    );
  }
  return <>{props.children}</>;
}

type Page =
  | "dashboard"
  | "members"
  | "subscriptions"
  | "payments"
  | "checkins"
  | "audit"
  | "scan"
  | "plans"
  | "notifications"
  | "accounting"
  | "insurances";

function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, removeToast } = useToast();
  const [openSearch, setOpenSearch] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new CustomEvent('app-refresh'));
  };
  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setIsMemberDialogOpen(true);
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(path: string) {
    if (path !== currentPath) {
      window.history.pushState({}, "", path);
      setCurrentPath(path);
    }
    setSidebarOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/login";
  }

  if (currentPath === "/login") {
    return <LoginPage />;
  }

  /** ✅ Harmonisation: Dashboard est sur /dashboard (pas /) */
  const menuItems: Array<{ page: Page; path: string; label: string; icon: any }> = [
    { page: "dashboard", path: "/dashboard", label: "Accueil", icon: LayoutDashboard },
    { page: "members", path: "/members", label: "Membres", icon: Users },
    { page: "subscriptions", path: "/subscriptions", label: "Abonnements", icon: CreditCard },
    { page: "payments", path: "/payments", label: "Paiements", icon: Wallet },
    { page: "insurances", path: "/insurances", label: "Assurances", icon: Shield },
    { page: "plans", path: "/plans", label: "Plans & Tarifs", icon: Tag },
    { page: "checkins", path: "/checkins", label: "Check-ins", icon: Clock },
    { page: "audit", path: "/audit", label: "Journaux d'audit", icon: FileText },
    { page: "scan", path: "/scan", label: "Scan", icon: Scan },
    { page: "accounting", path: "/accounting", label: "Compta", icon: Wallet },
  ];

  // ✅ Traiter "/" comme "/dashboard" sans redirection
  const currentPage: Page =
    currentPath === "/"
      ? "dashboard"
      : ((menuItems.find((item) => item.path === currentPath)?.page as Page) || "dashboard");

  return (
    <RequireAuth>
      <IdleGuard>
        <ErrorBoundary>
          <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0F2548] to-[#1a3a5c] flex">
            {/* Sidebar - Always as overlay with burger menu */}
            <aside
              className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-[#1a2e4a] to-[#0d1b2e] backdrop-blur-xl border-r border-white/5 shadow-2xl transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              {/* Logo */}
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Dumbbell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">Champion's Academy</h1>
                    <p className="text-xs text-blue-200/60">Gestion Club</p>
                  </div>
                </div>
              </div>

              {/* Menu */}
              <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                          : "text-neutral-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="p-4 border-t border-white/5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Déconnexion</span>
                </button>
              </div>
            </aside>

            {/* Backdrop */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Main */}
            <div className="flex-1 flex flex-col min-h-screen">
              {/* Topbar */}
              <header className="sticky top-0 z-30 bg-[#0d1b2e]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 lg:py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      aria-label="Menu"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-base lg:text-lg font-semibold text-white">
                      {menuItems.find((item) => item.path === currentPath)?.label || "Tableau de bord"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenSearch(true)}
                      className="p-2 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all"
                      aria-label="Rechercher"
                    >
                      <Search className="w-5 h-5" />
                    </button>

                    <NotificationsBell onNavigate={navigate} />

                    <button
                      onClick={handleLogout}
                      className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Déconnexion</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* Router minimal */}
              <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
                <div className="max-w-7xl mx-auto px-4 py-6">
                {currentPage === "dashboard" && <Dashboard refreshKey={refreshKey} />}
                {currentPage === "members" && <Members />}
                {currentPage === "subscriptions" && (
                  <Subscriptions refreshKey={refreshKey} onDataChanged={triggerRefresh} />
                )}
                {currentPage === "payments" && <Payments />}
                {currentPage === "insurances" && <Insurances />}
                {currentPage === "plans" && <Plans />}
                {currentPage === "checkins" && <Checkins refreshKey={refreshKey} />}
                {currentPage === "audit" && <AuditLogs />}
                {currentPage === "scan" && <ScanPage />}
                {currentPath === "/notifications" && <NotificationsPage />}
                {currentPage === "accounting" && <Accounting />}
                </div>
              </main>

              {/* Mobile Bottom Navigation */}
              <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0d1b2e]/95 backdrop-blur-xl border-t border-white/10 safe-area-pb">
                <div className="flex items-center justify-around px-2 py-2">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                      currentPath === "/dashboard" || currentPath === "/"
                        ? "text-blue-400"
                        : "text-white/60 hover:text-white/90"
                    }`}
                  >
                    <LayoutDashboard className={`w-5 h-5 ${
                      currentPath === "/dashboard" || currentPath === "/" ? "scale-110" : ""
                    }`} />
                    <span className="text-xs font-medium">Accueil</span>
                  </button>
                  <button
                    onClick={() => navigate("/members")}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                      currentPath === "/members"
                        ? "text-blue-400"
                        : "text-white/60 hover:text-white/90"
                    }`}
                  >
                    <Users className={`w-5 h-5 ${
                      currentPath === "/members" ? "scale-110" : ""
                    }`} />
                    <span className="text-xs font-medium">Membres</span>
                  </button>
                  <button
                    onClick={() => navigate("/subscriptions")}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                      currentPath === "/subscriptions"
                        ? "text-blue-400"
                        : "text-white/60 hover:text-white/90"
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 ${
                      currentPath === "/subscriptions" ? "scale-110" : ""
                    }`} />
                    <span className="text-xs font-medium">Abonnements</span>
                  </button>
                  <button
                    onClick={() => navigate("/scan")}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                      currentPath === "/scan"
                        ? "text-blue-400"
                        : "text-white/60 hover:text-white/90"
                    }`}
                  >
                    <Scan className={`w-5 h-5 ${
                      currentPath === "/scan" ? "scale-110" : ""
                    }`} />
                    <span className="text-xs font-medium">Scan</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Modales & toasts */}
          <SearchGlobal
            open={openSearch}
            onClose={() => setOpenSearch(false)}
            onSelect={(member) => {
              handleSelectMember(member.id);
              setOpenSearch(false);
            }}
          />
          <MemberDetailsModal
            memberId={selectedMemberId}
            open={isMemberDialogOpen}
            onClose={() => {
              setIsMemberDialogOpen(false);
              setSelectedMemberId(null);
            }}
            onChanged={triggerRefresh}
          />
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </ErrorBoundary>
      </IdleGuard>
    </RequireAuth>
  );
}

export default App;
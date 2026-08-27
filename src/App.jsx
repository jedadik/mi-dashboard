import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  Edit3,
  FileText,
  GraduationCap,
  LockKeyhole,
  LogOut,
  LoaderCircle,
  Mail,
  Plus,
  Save,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";

const filters = [
  { id: "all", label: "Todas" },
  { id: "today", label: "Para hoy" },
  { id: "week", label: "Esta semana" },
  { id: "overdue", label: "Vencidas" },
];

const wompiCheckoutUrl =
  import.meta.env.VITE_WOMPI_CHECKOUT_URL ||
  "https://checkout.wompi.co/l/VPOS_zPdUt1";
const wompiMonthlyUrl = import.meta.env.VITE_WOMPI_URL_MENSUAL;
const wompiAnnualUrl = import.meta.env.VITE_WOMPI_URL_ANUAL;
const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

const todayString = () => new Date().toISOString().slice(0, 10);
const AUTH_SESSION_STARTED_AT = "jedadi-auth-session-started-at";
const AUTH_LAST_EMAIL = "jedadi-last-email";
const AUTH_SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysUntil(dateString, referenceDate = new Date()) {
  const difference =
    new Date(`${dateString}T00:00:00`) -
    new Date(
      `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}-${String(referenceDate.getDate()).padStart(2, "0")}T00:00:00`,
    );
  return Math.ceil(difference / 86400000);
}

function countdownLabel(dateString, referenceDate) {
  const remainingDays = daysUntil(dateString, referenceDate);
  if (remainingDays < 0) return "Vencida";
  if (remainingDays === 0) return "Hoy";
  if (remainingDays === 1) return "Mañana";
  return `${remainingDays} días`;
}

function CompactDateInput({ value, onChange, min, label, hint, id, name }) {
  return (
    <div className="relative min-w-0">
      {hint && (
        <span className="pointer-events-none absolute -top-4 left-1 text-[11px] font-medium text-slate-400">
          {hint}
        </span>
      )}
      <Calendar
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-jedadi-blue"
        size={17}
      />
      <input
        className="h-full min-h-10 w-full min-w-0 appearance-none rounded-lg border border-white/10 bg-jedadi-dark px-3 pl-10 text-sm text-slate-100 outline-none transition focus:border-jedadi-blue focus:ring-1 focus:ring-jedadi-blue/30 [color-scheme:dark]"
        type="date"
        id={id}
        name={name}
        min={min}
        value={value}
        aria-label={label}
        onChange={onChange}
      />
    </div>
  );
}

function LoadingState({ label, compact = false }) {
  return (
    <div
      className={`flex items-center justify-center ${compact ? "py-2" : "min-h-screen bg-slate-950"}`}
      role="status"
      aria-label={label}
    >
      <div className={`flex flex-col items-center ${compact ? "gap-1" : "gap-4"}`}>
        <img
          src="/emblem.png"
          alt="Look always ahead"
          className={`jedadi-emblem-glow animate-pulse object-contain ${compact ? "h-10 w-10" : "h-24 w-24"}`}
        />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

function SubscriptionLockScreen({ onSignOut, isPaymentReturn, isTrialExpired }) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none blur-[6px] opacity-60"
      >
        <div className="flex h-full min-w-[720px] scale-105 bg-slate-900">
          <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 p-6">
            <div className="mb-8 h-20 rounded-lg bg-slate-800" />
            <div className="space-y-3">
              <div className="h-11 rounded-xl bg-jedadi-blue/70" />
              <div className="h-11 rounded-xl bg-slate-800" />
            </div>
          </aside>
          <div className="flex-1 p-10">
            <div className="mb-8 h-12 w-2/3 rounded-lg bg-slate-800" />
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div className="h-32 rounded-2xl bg-slate-950" />
              <div className="h-32 rounded-2xl bg-slate-950" />
            </div>
            <div className="space-y-3 rounded-2xl bg-slate-950 p-6">
              <div className="h-12 rounded-xl bg-slate-800" />
              <div className="h-12 rounded-xl bg-slate-800" />
              <div className="h-12 rounded-xl bg-slate-800" />
              <div className="h-12 rounded-xl bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-slate-950/65" />
      <section className="relative z-10 w-full max-w-4xl rounded-3xl border border-amber-500/30 bg-slate-900/95 p-6 text-center shadow-2xl shadow-amber-950/20 backdrop-blur sm:p-8">
        {isTrialExpired && (
          <img
            src="/emblem.png"
            alt="JEDADI"
            className="jedadi-emblem-glow mx-auto h-20 w-20 object-contain"
          />
        )}
        <AlertTriangle className="mx-auto text-amber-300" size={42} />
        <h1 className="mt-5 text-2xl font-bold text-white">
          {isTrialExpired ? "Tu membresía ha terminado" : "Tu suscripción no está activa"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {isTrialExpired
            ? "Tus 10 días de prueba han terminado. Elige un plan para continuar usando el Dashboard."
            : "Renueva tu suscripción para continuar usando el Dashboard."}
        </p>
        {isPaymentReturn && (
          <div
            role="status"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-jedadi-orange/30 bg-jedadi-orange/10 px-3 py-2 text-sm text-orange-100"
          >
            <LoaderCircle className="animate-spin text-jedadi-orange" size={17} />
            Verificando tu pago...
          </div>
        )}
        <div className="mt-7 grid gap-4 text-left md:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-slate-700 bg-slate-950/80 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-jedadi-blue">
              Plan mensual
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white">
              $20.000 <span className="text-sm font-medium text-slate-400">COP / mes</span>
            </h2>
            <p className="mt-3 text-sm text-slate-400">Acceso total por 30 días.</p>
            <a
              href={wompiMonthlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-jedadi-blue px-5 py-3 text-sm font-bold text-jedadi-dark transition hover:bg-cyan-300"
            >
              Elegir plan mensual
              <ArrowRight size={17} />
            </a>
          </article>
          <article className="relative flex flex-col rounded-2xl border border-emerald-400/50 bg-emerald-500/10 p-5">
            <span className="absolute -top-3 right-5 rounded-full bg-emerald-400 px-3 py-1 text-xs font-extrabold text-slate-950">
              Ahorra más · Recomendado
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              Plan anual
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white">
              $180.000 <span className="text-sm font-medium text-slate-300">COP / año</span>
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Acceso total por 365 días ($15.000/mes).
            </p>
            <p className="mt-2 text-sm font-bold text-red-400">
              25% de descuento frente al plan mensual.
            </p>
            <a
              href={wompiAnnualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
            >
              Elegir plan anual
              <ArrowRight size={17} />
            </a>
          </article>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 block w-full text-sm text-slate-400 hover:text-white"
        >
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

function SubscriptionRenewalNotice({ daysRemaining }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <p className="flex items-center gap-2">
        <Clock3 className="shrink-0 text-amber-300" size={17} />
        <span>
          Tu mensualidad vence en {daysRemaining} {daysRemaining === 1 ? "día" : "días"}.
        </span>
      </p>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
        <a
          href={wompiMonthlyUrl || wompiCheckoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center rounded-lg border border-amber-300/60 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-300/10 sm:w-auto"
        >
          Mensual · $20.000
        </a>
        <a
          href={wompiAnnualUrl || wompiCheckoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200 sm:w-auto"
        >
          <span>Anual · $180.000</span>
          <span className="text-red-600">25% dto.</span>
        </a>
      </div>
    </div>
  );
}

function TrialNotice({ daysRemaining }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-jedadi-purple/35 bg-jedadi-purple/10 px-4 py-3 text-sm text-purple-100">
      <div className="flex min-w-0 items-center gap-2">
        <CheckCircle2 className="shrink-0 text-jedadi-purple" size={17} />
        <p>
          Tu prueba gratuita está activa: te quedan {daysRemaining} {daysRemaining === 1 ? "día" : "días"}.
        </p>
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        <span className="hidden rounded-full bg-jedadi-purple/20 px-3 py-1 text-xs font-bold text-purple-200 lg:inline-flex">
          10 días incluidos
        </span>
        <a
          href={wompiMonthlyUrl || wompiCheckoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center rounded-lg border border-jedadi-blue/50 px-3 py-2 text-xs font-bold text-jedadi-blue transition hover:bg-jedadi-blue/10 sm:flex-none"
        >
          Mensual
        </a>
        <a
          href={wompiAnnualUrl || wompiCheckoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-jedadi-blue px-3 py-2 text-xs font-bold text-jedadi-dark transition hover:bg-cyan-300 sm:flex-none"
        >
          Anual <span className="ml-1 text-red-600">25% dto.</span>
        </a>
      </div>
    </div>
  );
}

function BrandFooter() {
  return (
    <footer className="mt-10 flex items-center justify-center gap-3 border-t border-white/10 pt-5">
      <img
        src="/emblem.png"
        alt="Look always ahead"
        className="jedadi-emblem-glow h-11 w-11 object-contain opacity-85"
      />
      <div className="text-left">
        <p className="font-bold tracking-[0.18em] text-jedadi-blue">JEDADI</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">
          Look always ahead
        </p>
      </div>
    </footer>
  );
}

function AuthScreen({ initialMode = "login" }) {
  const [pendingRegistrationNotice] = useState(() =>
    sessionStorage.getItem("jedadi-registration-success"),
  );
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState(() => localStorage.getItem(AUTH_LAST_EMAIL) || "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(pendingRegistrationNotice || "");
  const [error, setError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(Boolean(pendingRegistrationNotice));

  useEffect(() => {
    if (pendingRegistrationNotice) {
      sessionStorage.removeItem("jedadi-registration-success");
    }
  }, [pendingRegistrationNotice]);

  const isRecovery = mode === "recovery";
  const isReset = mode === "reset";
  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setRegistrationSuccess(false);
    if (!isReset && (!email.trim() || (!isRecovery && !password))) {
      setError("Completa los campos requeridos.");
      return;
    }
    if ((isRegister || isReset) && password !== passwordConfirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (isReset && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    if (!isReset && email.trim()) {
      localStorage.setItem(AUTH_LAST_EMAIL, email.trim());
    }
    const result = isReset
      ? await supabase.auth.updateUser({ password })
      : isRecovery
      ? await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: appUrl,
        })
      : isRegister
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { trial_days: 10 },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (isRecovery) {
      setMessage("Revisa tu correo para recuperar el acceso.");
    } else if (isReset) {
      setPassword("");
      setPasswordConfirmation("");
      sessionStorage.setItem(
        "jedadi-registration-success",
        "Contraseña actualizada correctamente. Cierra la web y vuelve a abrirla para ingresar con tus nuevas credenciales.",
      );
      await supabase.auth.signOut();
      setMode("login");
      setMessage("Contraseña actualizada correctamente. Cierra la web y vuelve a abrirla para ingresar con tus nuevas credenciales.");
    } else if (isRegister) {
      const registrationMessage = "Tu cuenta fue creada. Inicia sesión para comenzar tus 10 días de prueba.";
      sessionStorage.setItem("jedadi-registration-success", registrationMessage);
      if (result.data.session) await supabase.auth.signOut();
      setRegistrationSuccess(true);
      setMessage(registrationMessage);
      setMode("login");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-jedadi-dark px-4 py-8 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-jedadi-blue/20 bg-slate-900/90 p-6 shadow-2xl shadow-jedadi-blue/10 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 h-16 w-44 overflow-hidden rounded-lg border border-jedadi-blue/20 bg-jedadi-dark shadow-[0_0_24px_rgba(19,191,255,0.16)]">
            <img src="/logo.png" alt="JEDADI" className="jedadi-logo-glow h-full w-full object-contain" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-jedadi-blue">Tu espacio de enfoque</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{isReset ? "Crea una nueva contraseña" : isRecovery ? "Recupera tu acceso" : isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h1>
          <p className="mt-2 text-sm text-slate-400">Organiza tus tareas y proyectos en un solo lugar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isReset && <label htmlFor="auth-email" className="block text-sm font-medium text-slate-300">
            Correo electrónico
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input id="auth-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-jedadi-blue" placeholder="tu@email.com" />
            </div>
          </label>}
          {!isRecovery && (
            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-300">
              Contraseña
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input id="auth-password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-jedadi-blue" placeholder="Mínimo 6 caracteres" minLength={6} />
              </div>
            </label>
          )}
          {(isRegister || isReset) && (
            <label htmlFor="auth-password-confirmation" className="block text-sm font-medium text-slate-300">
              Confirmar contraseña
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input
                  type="password"
                  id="auth-password-confirmation"
                  name="passwordConfirmation"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-jedadi-blue"
                  placeholder={isReset ? "Repite tu nueva contraseña" : "Repite tu contraseña"}
                  minLength={6}
                  required
                />
              </div>
            </label>
          )}
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          {message && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-4 text-left text-emerald-100 shadow-lg shadow-emerald-950/20"
            >
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={24} />
              <div>
                {registrationSuccess ? (
                  <>
                    <p className="text-base font-extrabold text-white">
                      ¡Cuenta creada exitosamente!
                    </p>
                    <p className="mt-1 text-sm leading-5 text-emerald-200">
                      Inicia sesión ahora y disfruta tus 10 días de prueba gratis.
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold">{message}</p>
                )}
              </div>
            </div>
          )}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-jedadi-blue py-3 text-sm font-bold text-jedadi-dark transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Procesando..." : isReset ? "Guardar nueva contraseña" : isRecovery ? "Enviar enlace" : isRegister ? "Crear cuenta" : "Entrar"}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm">
          {!isRecovery && !isReset && <button onClick={() => { setMode("recovery"); setError(""); setMessage(""); }} className="block w-full text-slate-400 hover:text-jedadi-blue">¿Olvidaste tu contraseña?</button>}
          {!isReset && <button onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); setMessage(""); }} className="font-semibold text-jedadi-blue hover:text-cyan-300">{isRegister ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}</button>}
          {(isRecovery || isReset) && <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} className="block w-full text-slate-400 hover:text-white">Volver a iniciar sesión</button>}
        </div>
        <BrandFooter />
      </section>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(() =>
    window.location.hash.includes("type=recovery"),
  );
  const [isPaymentReturn, setIsPaymentReturn] = useState(() =>
    new URLSearchParams(window.location.search).get("payment_status") === "check",
  );
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("university");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isCompletedTasksOpen, setIsCompletedTasksOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newTask, setNewTask] = useState({
    title: "",
    due_date: "",
    priority: "media",
    details: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    due_date: "",
    priority: "media",
    details: "",
  });
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [notes, setNotes] = useState(() =>
    JSON.parse(localStorage.getItem("dashboard-notes") || "{}"),
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    let handlingAuthFailure = false;

    function sessionIsExpired() {
      const startedAt = Number(localStorage.getItem(AUTH_SESSION_STARTED_AT));
      return startedAt > 0 && Date.now() - startedAt >= AUTH_SESSION_MAX_AGE;
    }

    function rememberSessionStart() {
      if (!localStorage.getItem(AUTH_SESSION_STARTED_AT)) {
        localStorage.setItem(AUTH_SESSION_STARTED_AT, String(Date.now()));
      }
    }

    async function clearInvalidSession() {
      if (handlingAuthFailure) return;
      handlingAuthFailure = true;

      setSession(null);
      setProfile(null);
      setAuthLoading(false);
      setIsRecoverySession(false);
      localStorage.removeItem(AUTH_SESSION_STARTED_AT);

      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      Object.keys(localStorage)
        .filter((key) => key.startsWith("sb-"))
        .forEach((key) => localStorage.removeItem(key));
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) return clearInvalidSession();
      if (data.session && sessionIsExpired()) {
        clearInvalidSession();
        return;
      }
      if (data.session) rememberSessionStart();
      setSession(data.session);
      setAuthLoading(false);
    }).catch(() => {
      if (mounted) clearInvalidSession();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setSession(nextSession);
        setIsRecoverySession(true);
        setAuthLoading(false);
        return;
      }
      if (event === "TOKEN_REFRESHED" && !nextSession) {
        clearInvalidSession();
        return;
      }
      if (nextSession && sessionIsExpired()) {
        clearInvalidSession();
        return;
      }
      if (nextSession) rememberSessionStart();
      if (!nextSession) localStorage.removeItem(AUTH_SESSION_STARTED_AT);
      setSession(nextSession);
      if (event === "SIGNED_OUT") setProfile(null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    let mounted = true;
    setProfile(null);
    setProfileLoading(true);

    async function fetchProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_end_date")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;
      setProfile(error ? null : data);
      setProfileLoading(false);
    }

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (!isPaymentReturn || !session?.user?.id) return;

    let attempts = 0;
    let timeoutId;
    let cancelled = false;

    async function checkPaymentStatus() {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_end_date")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      setProfile(data || null);
      attempts += 1;
      if (data?.subscription_status === "active" || attempts >= 5) {
        setIsPaymentReturn(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      timeoutId = window.setTimeout(checkPaymentStatus, 3000);
    }

    checkPaymentStatus();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isPaymentReturn, session]);

  const isSubscriptionValid =
    profile?.subscription_status === "active" &&
    profile?.subscription_end_date != null &&
    new Date(profile.subscription_end_date).getTime() > Date.now();
  const trialEndDate = session?.user?.created_at
    ? new Date(new Date(session.user.created_at).getTime() + 10 * 86400000)
    : null;
  const trialDaysRemaining = trialEndDate
    ? Math.ceil((trialEndDate.getTime() - currentTime.getTime()) / 86400000)
    : 0;
  const isTrialActive =
    !isSubscriptionValid && trialEndDate != null && trialDaysRemaining > 0;
  const hasAccess = isSubscriptionValid || isTrialActive;
  const isTrialExpired =
    !isSubscriptionValid && trialEndDate != null && trialDaysRemaining <= 0;
  const subscriptionDaysRemaining = isTrialActive
    ? trialDaysRemaining
    : profile?.subscription_end_date
    ? Math.ceil(
        (new Date(profile.subscription_end_date).getTime() -
          currentTime.getTime()) /
          86400000,
      )
    : null;
  const shouldShowRenewalNotice =
    isSubscriptionValid &&
    subscriptionDaysRemaining != null &&
    subscriptionDaysRemaining >= 1 &&
    subscriptionDaysRemaining <= 5;

  useEffect(() => {
    if (!session?.user?.id || !hasAccess) return;

    async function fetchDashboardData() {
      setDashboardLoading(true);
      try {
        const [{ data: categoryData }, { data: taskData }] = await Promise.all([
          supabase
            .from("categories")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("type", activeTab)
            .order("name"),
          supabase
            .from("tasks")
            .select("*")
            .eq("user_id", session.user.id)
            .order("due_date", { ascending: true }),
        ]);
        const nextCategories = categoryData || [];
        setCategories(nextCategories);
        setTasks(taskData || []);
        setSelectedCategory((current) =>
          nextCategories.some((category) => category.id === current)
            ? current
            : nextCategories[0]?.id || null,
        );
      } finally {
        setDashboardLoading(false);
      }
    }

    fetchDashboardData();
  }, [activeTab, hasAccess, session]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function addCategory(event) {
    event.preventDefault();
    if (!newCatName.trim()) return;
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name: newCatName.trim(), type: activeTab, user_id: session.user.id }])
      .select();
    if (error) return showNotice("No se pudo crear la categoría.");
    setCategories((current) => [...current, data[0]]);
    setSelectedCategory(data[0].id);
    setNewCatName("");
  }

  async function deleteCategory(category) {
    const confirmed = window.confirm(
      `¿Eliminar "${category.name}" y todas sus tareas? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", session.user.id)
      .eq("category_id", category.id);
    if (tasksError) {
      return showNotice(`No se pudo eliminar la asignatura: ${tasksError.message}`);
    }

    const { error: categoryError } = await supabase
      .from("categories")
      .delete()
      .eq("user_id", session.user.id)
      .eq("id", category.id);
    if (categoryError) {
      return showNotice(`No se pudo eliminar la asignatura: ${categoryError.message}`);
    }

    const remainingCategories = categories.filter(
      (item) => item.id !== category.id,
    );
    setCategories(remainingCategories);
    setTasks((current) =>
      current.filter((task) => task.category_id !== category.id),
    );
    if (selectedCategory === category.id) {
      setSelectedCategory(remainingCategories[0]?.id || null);
      setExpandedTaskId(null);
    }
  }

  async function addTask(event) {
    event.preventDefault();
    if (!newTask.title.trim() || !newTask.due_date || !selectedCategory) return;
    if (newTask.due_date < todayString()) {
      return showNotice("La fecha no puede ser anterior a hoy.");
    }
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          ...newTask,
          title: newTask.title.trim(),
          category_id: selectedCategory,
          user_id: session.user.id,
        },
      ])
      .select();
    if (error) {
      console.error("Error al guardar la tarea:", error);
      return showNotice(`No se pudo guardar: ${error.message}`);
    }
    setTasks((current) => [...current, data[0]]);
    setNewTask({ title: "", due_date: "", priority: "media", details: "" });
    setIsTaskFormOpen(false);
  }

  async function toggleTask(task) {
    const nextValue = !task.is_completed;
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: nextValue })
      .eq("user_id", session.user.id)
      .eq("id", task.id);
    if (error) return showNotice("No se pudo actualizar la tarea.");
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, is_completed: nextValue } : item,
      ),
    );
  }

  function beginEdit(task) {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      due_date: task.due_date || "",
      priority: task.priority || "media",
      details: task.details || "",
    });
  }

  async function saveEdit(event, id) {
    event.preventDefault();
    if (!editForm.title.trim() || !editForm.due_date) return;
    if (editForm.due_date < todayString()) {
      return showNotice("La fecha no puede ser anterior a hoy.");
    }
    const { error } = await supabase
      .from("tasks")
      .update({ ...editForm, title: editForm.title.trim() })
      .eq("user_id", session.user.id)
      .eq("id", id);
    if (error) return showNotice("No se pudo editar la tarea.");
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, ...editForm, title: editForm.title.trim() }
          : task,
      ),
    );
    setEditingId(null);
  }

  async function deleteTask(id) {
    if (!window.confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.")) {
      return;
    }
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", session.user.id)
      .eq("id", id);
    if (error) return showNotice("No se pudo eliminar la tarea.");
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function updateNotes(value) {
    const nextNotes = { ...notes, [selectedCategory]: value };
    setNotes(nextNotes);
    localStorage.setItem("dashboard-notes", JSON.stringify(nextNotes));
  }

  const categoryTasks = tasks.filter(
    (task) => task.category_id === selectedCategory,
  );
  const completedCount = categoryTasks.filter(
    (task) => task.is_completed,
  ).length;
  const progress = categoryTasks.length
    ? Math.round((completedCount / categoryTasks.length) * 100)
    : 0;
  const sortTasksByDueDate = (firstTask, secondTask) => {
    if (!firstTask.due_date) return 1;
    if (!secondTask.due_date) return -1;
    return firstTask.due_date.localeCompare(secondTask.due_date);
  };
  const activeTasks = tasks.filter((task) => !task.is_completed);
  const nextDueDate = activeTasks
    .filter((task) => task.due_date)
    .map((task) => task.due_date)
    .sort()[0];
  const nextDueTasks = nextDueDate
    ? activeTasks.filter((task) => task.due_date === nextDueDate)
    : activeTasks.slice(0, 1);
  const visibleTasks = categoryTasks
    .filter((task) => {
      const today = todayString();
      if (task.is_completed) return false;
      if (filter === "overdue")
        return !task.is_completed && task.due_date < today;
      if (filter === "today") return task.due_date === today;
      if (filter === "week") {
        const date = new Date(`${task.due_date}T00:00:00`);
        const weekStart = startOfWeek(new Date());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return date >= weekStart && date < weekEnd;
      }
      return true;
    })
    .sort(sortTasksByDueDate);
  const completedTasks = categoryTasks
    .filter((task) => task.is_completed)
    .sort(sortTasksByDueDate);

  const selectedName = categories.find(
    (category) => category.id === selectedCategory,
  )?.name;
  const categoryDueDates = categories.map((category) => ({
    categoryId: category.id,
    dueDate: tasks
      .filter(
        (task) =>
          task.category_id === category.id &&
          !task.is_completed &&
          task.due_date &&
          task.due_date >= todayString(),
      )
      .map((task) => task.due_date)
      .sort()[0],
  }));
  const nearestCategoryDueDate = categoryDueDates
    .map((item) => item.dueDate)
    .filter(Boolean)
    .sort()[0];
  const urgentCategoryIds = new Set(
    categoryDueDates
      .filter((item) => item.dueDate && item.dueDate === nearestCategoryDueDate)
      .map((item) => item.categoryId),
  );
  const sortedCategories = [...categories].sort((firstCategory, secondCategory) => {
    const firstDueDate = tasks
      .filter(
        (task) =>
          task.category_id === firstCategory.id &&
          !task.is_completed &&
          task.due_date,
      )
      .map((task) => task.due_date)
      .sort()[0];
    const secondDueDate = tasks
      .filter(
        (task) =>
          task.category_id === secondCategory.id &&
          !task.is_completed &&
          task.due_date,
      )
      .map((task) => task.due_date)
      .sort()[0];

    if (!firstDueDate && !secondDueDate) {
      return firstCategory.name.localeCompare(secondCategory.name);
    }
    if (!firstDueDate) return 1;
    if (!secondDueDate) return -1;
    return firstDueDate.localeCompare(secondDueDate);
  });
  const inputClass =
    "w-full rounded-lg border border-white/10 bg-jedadi-dark px-3 py-2 text-sm text-slate-100 outline-none focus:border-jedadi-blue";

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    localStorage.removeItem(AUTH_SESSION_STARTED_AT);
    if (error) showNotice(`No se pudo cerrar la sesión: ${error.message}`);
  }

  if (authLoading) {
    return <LoadingState label="Comprobando sesión..." />;
  }

  if (isRecoverySession && session) {
    return (
      <AuthScreen
        initialMode="reset"
      />
    );
  }
  if (!session) return <AuthScreen />;
  if (profileLoading) {
    return <LoadingState label="Verificando suscripción..." />;
  }
  if (!hasAccess) {
    return (
      <SubscriptionLockScreen
        onSignOut={signOut}
        isPaymentReturn={isPaymentReturn}
        isTrialExpired={isTrialExpired}
      />
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-jedadi-dark text-slate-100 md:flex">
      <nav className="relative flex h-16 items-center justify-center border-b border-jedadi-blue/15 bg-jedadi-dark px-4 md:hidden">
        <img
          src="/logo.png"
          alt="JEDADI"
          className="jedadi-logo-glow h-10 w-auto max-w-[175px] object-contain"
        />
      </nav>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-jedadi-dark px-4 py-2.5 md:hidden">
        <p
          className="min-w-0 truncate text-xs text-slate-400"
          title={session.user.email}
        >
          {session.user.email}
        </p>
        <button
          type="button"
          onClick={signOut}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={15} />
          Salir
        </button>
      </div>
      <aside className="hidden border-b border-jedadi-blue/15 bg-jedadi-dark p-4 md:flex md:min-h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r md:p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="relative flex h-16 w-44 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-jedadi-blue/20 bg-jedadi-dark shadow-[0_0_20px_rgba(19,191,255,0.14)] sm:h-[4.5rem] sm:w-48 md:h-20 md:w-52">
            <img
              src="/logo.png"
              alt="JEDADI"
              className="jedadi-logo-glow h-full w-full object-contain object-center"
            />
          </div>
        </div>
        <nav className="mt-8 grid grid-cols-2 gap-2 md:block md:space-y-2">
          {[
            ["university", GraduationCap, "Universidad"],
            ["personal", User, "Proyectos / Vida"],
          ].map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setFilter("all");
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${activeTab === tab ? (tab === "university" ? "bg-jedadi-blue text-jedadi-dark" : "bg-jedadi-green text-jedadi-dark") : "text-slate-400 hover:bg-white/5"}`}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-6 border-t border-slate-800 pt-5">
          <p className="mb-3 truncate px-2 text-xs text-slate-500" title={session.user.email}>
            {session.user.email}
          </p>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={19} />
            Cerrar sesión
          </button>
        </div>
        <div className="mt-auto flex justify-center border-t border-white/10 pt-6">
          <img
            src="/emblem.png"
            alt="Look always ahead"
            className="jedadi-emblem-glow h-16 w-16 object-contain opacity-80"
          />
        </div>
      </aside>

      <main className="mx-auto min-w-0 w-full max-w-full flex-1 overflow-hidden p-4 sm:p-5 md:p-10">
        {notice && (
          <div className="fixed right-5 top-5 z-10 rounded-lg border border-amber-500/30 bg-slate-800 px-4 py-3 text-sm text-amber-200 shadow-xl">
            {notice}
          </div>
        )}
        <header className="mb-8">
          {isPaymentReturn && (
            <div
              className="mb-5 flex items-center gap-3 rounded-xl border border-jedadi-orange/30 bg-jedadi-orange/10 px-4 py-3 text-sm text-orange-100"
            >
              <LoadingState
                compact
                label="Estamos verificando tu pago. La suscripción se activará al confirmar el webhook."
              />
            </div>
          )}
          {isTrialActive && <TrialNotice daysRemaining={trialDaysRemaining} />}
          {shouldShowRenewalNotice && (
            <SubscriptionRenewalNotice
              daysRemaining={subscriptionDaysRemaining}
            />
          )}
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-jedadi-blue">
            Panel de productividad
          </p>
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            {activeTab === "university"
              ? "Asignaturas académicas"
              : "Proyectos personales"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Convierte tus pendientes en avances visibles.
          </p>
        </header>
        <nav className="sticky top-0 z-10 mb-6 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-jedadi-dark/95 p-1 backdrop-blur md:hidden">
          {[
            ["university", GraduationCap, "Asignaturas académicas"],
            ["personal", User, "Personal"],
          ].map(([tab, Icon, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setFilter("all");
              }}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-semibold transition ${activeTab === tab ? (tab === "university" ? "bg-jedadi-blue text-jedadi-dark" : "bg-jedadi-green text-jedadi-dark") : "text-slate-400 hover:bg-white/5"}`}
            >
              <Icon size={16} />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        <section className="mb-8">
          <div className="dashboard-scroll flex gap-3 overflow-x-auto pb-3">
            {sortedCategories.map((category) => (
              <div
                key={category.id}
                className={`flex shrink-0 items-center rounded-xl border text-sm font-semibold transition ${urgentCategoryIds.has(category.id) ? "border-jedadi-orange bg-jedadi-orange/10 text-jedadi-orange shadow-[0_0_18px_rgba(255,138,0,0.16)]" : selectedCategory === category.id ? "border-jedadi-blue bg-white/5 text-jedadi-blue" : "border-white/10 bg-jedadi-dark text-slate-400"}`}
              >
                <button
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setFilter("all");
                  }}
                  className="flex items-center gap-2 px-4 py-3 hover:text-jedadi-blue"
                >
                  {category.name}
                  {urgentCategoryIds.has(category.id) && (
                    <span className="rounded-full bg-jedadi-orange/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-jedadi-orange">
                      ⚠️ Próxima
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  title={`Eliminar ${category.name}`}
                  aria-label={`Eliminar ${category.name}`}
                  onClick={() => deleteCategory(category)}
                  className="mr-2 rounded-md p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addCategory} className="flex max-w-md gap-2">
            <input
              id="new-category-name"
              name="categoryName"
              className={inputClass}
              placeholder={
                activeTab === "university"
                  ? "Nueva asignatura..."
                  : "Nuevo proyecto..."
              }
              value={newCatName}
              onChange={(event) => setNewCatName(event.target.value)}
            />
            <button className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-4 text-sm font-semibold hover:bg-slate-700">
              <Plus size={16} />
              Crear
            </button>
          </form>
        </section>

        {dashboardLoading ? (
          <LoadingState compact label="Cargando tus actividades..." />
        ) : !selectedCategory ? (
          <p className="text-sm text-slate-500">
            Selecciona o crea una asignatura/proyecto para comenzar.
          </p>
        ) : (
          <>
            <section className="mb-5 grid w-full max-w-full gap-4 overflow-hidden lg:grid-cols-[1fr_1.3fr]">
              <div className="w-full max-w-full overflow-hidden rounded-2xl border border-white/10 bg-jedadi-dark p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">
                    Progreso de {selectedName}
                  </span>
                  <strong className="text-2xl text-jedadi-green">
                    {progress}%
                  </strong>
                </div>
                <div className="h-3 w-full max-w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="progress-fill h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  <span className="text-slate-300">{completedCount}</span>{" "}
                  completadas de {categoryTasks.length} tareas
                </p>
              </div>
              {nextDueTasks.length > 0 ? (
                <div className="w-full max-w-full space-y-2 overflow-hidden rounded-2xl border border-jedadi-orange/30 bg-jedadi-orange/10 p-2 text-sm text-orange-100">
                  <p className="flex items-center gap-2 px-1 text-xs font-semibold text-jedadi-orange">
                    <span aria-hidden="true">⌛</span>
                    {nextDueTasks.length > 1 ? "Próximas entregas" : "Próxima entrega"}
                  </p>
                  {nextDueTasks.slice(0, 2).map((task) => {
                    const subject = categories.find(
                      (category) => category.id === task.category_id,
                    )?.name;
                    return (
                      <div
                        key={task.id}
                        className="flex min-w-0 w-full max-w-full items-center gap-2 rounded-lg border border-jedadi-orange/20 bg-jedadi-dark/60 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate font-bold text-white">
                          {task.title}
                        </span>
                        {subject && (
                          <span className="max-w-[28%] shrink-0 truncate text-orange-200">
                            ({subject})
                          </span>
                        )}
                        <span className="max-w-[34%] shrink-0 truncate text-xs text-orange-200">
                          {nextDueDate
                            ? countdownLabel(nextDueDate, currentTime)
                            : "Sin fecha"}
                        </span>
                      </div>
                    );
                  })}
                  {nextDueTasks.length > 2 && (
                    <span className="ml-1 inline-block rounded-full bg-jedadi-orange/20 px-2 py-0.5 text-xs font-semibold text-orange-200">
                      +{nextDueTasks.length - 2} más
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  <CheckCircle2 />
                  <span>Al día: No tienes entregas pendientes</span>
                </div>
              )}
            </section>

            <div className="grid w-full max-w-full min-w-0 gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-jedadi-dark p-4 sm:p-5 md:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                        <Calendar size={18} className="text-jedadi-blue" />
                    Tareas
                  </h3>
                  <div className="dashboard-scroll flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-900 p-1">
                    {filters.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFilter(item.id)}
                        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${filter === item.id ? "bg-jedadi-blue text-jedadi-dark" : "text-slate-400 hover:text-white"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  aria-expanded={isTaskFormOpen}
                  onClick={() => setIsTaskFormOpen((current) => !current)}
                  className="mb-3 flex w-full items-center justify-between rounded-xl border border-jedadi-blue/20 bg-jedadi-blue/5 px-4 py-3 text-left text-sm font-bold text-jedadi-blue transition hover:border-jedadi-blue/50 hover:bg-jedadi-blue/10"
                >
                  <span className="flex items-center gap-2">
                    <Plus
                      size={17}
                      className={`transition-transform duration-300 ${isTaskFormOpen ? "rotate-45" : ""}`}
                    />
                    Añadir tarea
                  </span>
                  <ChevronDown
                    size={17}
                    className={`transition-transform duration-300 ${isTaskFormOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <form
                  onSubmit={addTask}
                  className={`task-form-accordion grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_150px_120px_auto] ${isTaskFormOpen ? "task-form-accordion-open mb-6" : ""}`}
                >
                  <input
                    id="new-task-title"
                    name="taskTitle"
                    className={inputClass}
                    placeholder="¿Qué tienes que hacer?"
                    value={newTask.title}
                    onChange={(event) =>
                      setNewTask({ ...newTask, title: event.target.value })
                    }
                  />
                  <CompactDateInput
                    id="new-task-due-date"
                    name="dueDate"
                    value={newTask.due_date}
                    onChange={(event) =>
                      setNewTask({ ...newTask, due_date: event.target.value })
                    }
                    min={todayString()}
                    label="Fecha de entrega"
                    hint="Para cuándo es esta actividad"
                  />
                  <select
                    id="new-task-priority"
                    name="priority"
                    className={inputClass}
                    value={newTask.priority}
                    onChange={(event) =>
                      setNewTask({ ...newTask, priority: event.target.value })
                    }
                  >
                    <option value="alta">Prioridad alta</option>
                    <option value="media">Prioridad media</option>
                    <option value="baja">Prioridad baja</option>
                  </select>
                  <textarea
                    id="new-task-details"
                    name="details"
                    className={`${inputClass} min-h-20 resize-y md:col-span-3`}
                    placeholder="Detalles adicionales (herramientas, temas, instrucciones...)"
                    value={newTask.details}
                    onChange={(event) =>
                      setNewTask({ ...newTask, details: event.target.value })
                    }
                  />
                  <button className="flex w-full items-center justify-center gap-1 rounded-lg bg-jedadi-blue px-4 py-2 text-sm font-semibold text-jedadi-dark hover:bg-cyan-300 md:w-auto">
                    <Plus size={16} />
                    Añadir
                  </button>
                </form>
                <div className="space-y-3">
                  {visibleTasks.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No hay tareas para este filtro.
                    </p>
                  ) : (
                    visibleTasks.map((task) =>
                      editingId === task.id ? (
                        <form
                          key={task.id}
                          onSubmit={(event) => saveEdit(event, task.id)}
                          className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-jedadi-blue/50 bg-slate-900 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_150px_120px_auto]"
                        >
                          <input
                            id={`edit-task-title-${task.id}`}
                            name="taskTitle"
                            className={inputClass}
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm({
                                ...editForm,
                                title: event.target.value,
                              })
                            }
                          />
                          <CompactDateInput
                            id={`edit-task-due-date-${task.id}`}
                            name="dueDate"
                            value={editForm.due_date}
                            onChange={(event) =>
                              setEditForm({
                                ...editForm,
                                due_date: event.target.value,
                              })
                            }
                            min={todayString()}
                            label="Fecha de entrega"
                          />
                          <select
                            id={`edit-task-priority-${task.id}`}
                            name="priority"
                            className={inputClass}
                            value={editForm.priority}
                            onChange={(event) =>
                              setEditForm({
                                ...editForm,
                                priority: event.target.value,
                              })
                            }
                          >
                            <option value="alta">Alta</option>
                            <option value="media">Media</option>
                            <option value="baja">Baja</option>
                          </select>
                          <textarea
                            id={`edit-task-details-${task.id}`}
                            name="details"
                            className={`${inputClass} min-h-20 resize-y md:col-span-3`}
                            placeholder="Detalles adicionales..."
                            value={editForm.details}
                            onChange={(event) =>
                              setEditForm({
                                ...editForm,
                                details: event.target.value,
                              })
                            }
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              title="Guardar cambios"
                              className="rounded-lg bg-emerald-600 px-3"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              type="button"
                              title="Cancelar"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg bg-slate-800 px-3"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div
                          key={task.id}
                          className={`relative rounded-xl border p-4 transition ${task.is_completed ? "border-slate-900 bg-slate-900/50 text-slate-500" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}
                        >
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                            <button
                              onClick={() => toggleTask(task)}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              {task.is_completed ? (
                                <CheckCircle2
                                  className="shrink-0 text-emerald-500"
                                  size={20}
                                />
                              ) : (
                                <Circle
                                  className="shrink-0 text-slate-500"
                                  size={20}
                                />
                              )}
                              <span
                                className={`truncate text-sm ${task.is_completed ? "line-through" : "font-medium text-slate-200"}`}
                              >
                                {task.title}
                              </span>
                            </button>
                            <div className="flex shrink-0 items-center gap-1 text-jedadi-gray sm:gap-2">
                            <button
                              title="Editar tarea"
                              onClick={() => beginEdit(task)}
                              className="rounded-md p-1.5 hover:bg-slate-800 hover:text-jedadi-blue"
                            >
                              <Edit3 size={15} />
                            </button>
                              <button
                                title="Eliminar tarea"
                                onClick={() => deleteTask(task.id)}
                                className="rounded-md p-1.5 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            {task.due_date && (
                              <span
                                className={`inline-flex items-center gap-1 bg-transparent font-semibold ${daysUntil(task.due_date, currentTime) < 0 ? "text-red-300" : daysUntil(task.due_date, currentTime) <= 1 ? "text-amber-300" : "text-jedadi-blue"}`}
                                title={`Fecha de entrega: ${task.due_date}`}
                              >
                                <Clock3 size={13} />
                                {countdownLabel(task.due_date, currentTime)}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
                              <span className={`h-2 w-2 rounded-full ${task.priority === "alta" ? "bg-jedadi-orange" : task.priority === "baja" ? "bg-jedadi-green" : "bg-amber-400"}`} />
                              {task.priority || "media"}
                            </span>
                            {task.details && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTaskId((current) =>
                                    current === task.id ? null : task.id,
                                  )
                                }
                                className="flex items-center gap-2 font-semibold text-jedadi-blue hover:text-cyan-300"
                              >
                                <FileText size={14} />
                                {expandedTaskId === task.id ? "Ocultar notas" : "Ver notas"}
                                {expandedTaskId === task.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                          </div>
                          {task.details && (
                            <>
                              {expandedTaskId === task.id && (
                                <div className="mt-3 rounded-lg border border-jedadi-blue/20 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <Wrench size={14} />
                                    Detalles de estudio
                                  </p>
                                  <p className="whitespace-pre-wrap">{task.details}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ),
                    )
                  )}
                </div>
                <button
                  type="button"
                  aria-expanded={isCompletedTasksOpen}
                  onClick={() => setIsCompletedTasksOpen((current) => !current)}
                  className="mt-6 flex w-full items-center justify-between rounded-xl border border-jedadi-purple/20 bg-jedadi-purple/5 px-4 py-3 text-left text-sm font-bold text-jedadi-purple transition hover:border-jedadi-purple/50 hover:bg-jedadi-purple/10"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={17} />
                    Tareas realizadas ({completedTasks.length})
                  </span>
                  <ChevronDown
                    size={17}
                    className={`transition-transform duration-300 ${isCompletedTasksOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`task-form-accordion space-y-3 ${isCompletedTasksOpen ? "task-form-accordion-open mt-3" : ""}`}
                  aria-hidden={!isCompletedTasksOpen}
                >
                  {completedTasks.length === 0 ? (
                    <p className="py-5 text-center text-sm text-slate-500">
                      No hay tareas realizadas.
                    </p>
                  ) : (
                    completedTasks.map((task) => (
                      editingId === task.id ? (
                        <form
                          key={task.id}
                          onSubmit={(event) => saveEdit(event, task.id)}
                          className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-jedadi-blue/50 bg-slate-900 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_150px_120px_auto]"
                        >
                          <input
                            id={`completed-task-title-${task.id}`}
                            name="taskTitle"
                            className={inputClass}
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm({ ...editForm, title: event.target.value })
                            }
                          />
                          <CompactDateInput
                            id={`completed-task-due-date-${task.id}`}
                            name="dueDate"
                            value={editForm.due_date}
                            onChange={(event) =>
                              setEditForm({ ...editForm, due_date: event.target.value })
                            }
                            min={todayString()}
                            label="Fecha de entrega"
                          />
                          <select
                            id={`completed-task-priority-${task.id}`}
                            name="priority"
                            className={inputClass}
                            value={editForm.priority}
                            onChange={(event) =>
                              setEditForm({ ...editForm, priority: event.target.value })
                            }
                          >
                            <option value="alta">Alta</option>
                            <option value="media">Media</option>
                            <option value="baja">Baja</option>
                          </select>
                          <textarea
                            id={`completed-task-details-${task.id}`}
                            name="details"
                            className={`${inputClass} min-h-20 resize-y md:col-span-3`}
                            value={editForm.details}
                            onChange={(event) =>
                              setEditForm({ ...editForm, details: event.target.value })
                            }
                          />
                          <div className="flex gap-2">
                            <button type="submit" title="Guardar cambios" className="rounded-lg bg-emerald-600 px-3">
                              <Save size={16} />
                            </button>
                            <button
                              type="button"
                              title="Cancelar"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg bg-slate-800 px-3"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </form>
                      ) : (
                      <div
                        key={task.id}
                        className="relative rounded-xl border border-slate-900 bg-slate-900/50 p-4 text-slate-500 opacity-70"
                      >
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                          <button
                            onClick={() => toggleTask(task)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <CheckCircle2 className="shrink-0 text-emerald-500" size={20} />
                            <span className="truncate text-sm line-through">{task.title}</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1 text-jedadi-gray sm:gap-2">
                            <button
                              title="Editar tarea"
                              onClick={() => beginEdit(task)}
                              className="rounded-md p-1.5 hover:bg-slate-800 hover:text-jedadi-blue"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              title="Eliminar tarea"
                              onClick={() => deleteTask(task.id)}
                              className="rounded-md p-1.5 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="font-semibold text-jedadi-gray">Completada</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
                            <span className={`h-2 w-2 rounded-full ${task.priority === "alta" ? "bg-jedadi-orange" : task.priority === "baja" ? "bg-jedadi-green" : "bg-amber-400"}`} />
                            {task.priority || "media"}
                          </span>
                          {task.details && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTaskId((current) =>
                                  current === task.id ? null : task.id,
                                )
                              }
                              className="flex items-center gap-2 font-semibold text-jedadi-gray hover:text-slate-300"
                            >
                              <FileText size={14} />
                              {expandedTaskId === task.id ? "Ocultar notas" : "Ver notas"}
                              {expandedTaskId === task.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </div>
                        {task.details && (
                          <>
                            {expandedTaskId === task.id && (
                              <div className="mt-3 rounded-lg border border-jedadi-blue/20 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  <Wrench size={14} />
                                  Detalles de estudio
                                </p>
                                <p className="whitespace-pre-wrap">{task.details}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      )
                    ))
                  )}
                </div>
              </section>
              <aside className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="mb-1 flex items-center gap-2 font-bold">
                      <Edit3 size={17} className="text-amber-300" />
                      Notas rápidas
                    </h3>
                    <p className="text-xs text-slate-500">
                      Guardadas localmente para {selectedName}.
                    </p>
                  </div>
                  <img
                    src="/emblem.png"
                    alt="Look always ahead"
                    className="jedadi-emblem-glow h-11 w-11 shrink-0 object-contain opacity-80 md:hidden"
                  />
                </div>
                <textarea
                  id="quick-notes"
                  name="quickNotes"
                  value={notes[selectedCategory] || ""}
                  onChange={(event) => updateNotes(event.target.value)}
                  className={`${inputClass} min-h-64 resize-y leading-6`}
                  placeholder="Escribe ideas, enlaces o apuntes..."
                />
              </aside>
            </div>
          </>
        )}
        <BrandFooter />
      </main>
    </div>
  );
}

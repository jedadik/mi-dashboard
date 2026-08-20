import React, { useEffect, useRef, useState } from "react";
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
  { id: "completed", label: "Completadas" },
];

const priorityStyles = {
  alta: "border-red-500/30 bg-red-500/10 text-red-300",
  media: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  baja: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

const wompiCheckoutUrl =
  import.meta.env.VITE_WOMPI_CHECKOUT_URL ||
  "https://checkout.wompi.co/l/VPOS_zPdUt1";

const todayString = () => new Date().toISOString().slice(0, 10);

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

function CompactDateInput({ value, onChange, min, label }) {
  const inputRef = useRef(null);
  const formattedDate = value
    ? new Intl.DateTimeFormat("es", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00`))
    : "Elegir fecha";

  return (
    <div className="relative min-w-0">
      <input
        ref={inputRef}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        type="date"
        min={min}
        value={value}
        aria-label={label}
        onChange={onChange}
      />
      <div className="flex h-full min-h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100">
        <Calendar className="shrink-0 text-blue-400" size={17} />
        <span className="truncate">{formattedDate}</span>
      </div>
    </div>
  );
}

function SubscriptionLockScreen({ onSignOut }) {
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
              <div className="h-11 rounded-xl bg-blue-600/70" />
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
      <section className="relative z-10 w-full max-w-lg rounded-3xl border border-amber-500/30 bg-slate-900/95 p-6 text-center shadow-2xl shadow-amber-950/20 backdrop-blur sm:p-8">
        <AlertTriangle className="mx-auto text-amber-300" size={42} />
        <h1 className="mt-5 text-2xl font-bold text-white">
          Tu suscripción no está activa
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Renueva tu suscripción para continuar usando el Dashboard.
        </p>
        <a
          href={wompiCheckoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
        >
          Renovar con Wompi
          <ArrowRight size={17} />
        </a>
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
      <a
        href={wompiCheckoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200"
      >
        Renovar ahora
        <ArrowRight size={14} />
      </a>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isRecovery = mode === "recovery";
  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim() || (!isRecovery && !password)) {
      setError("Completa los campos requeridos.");
      return;
    }
    if (isRegister && password !== passwordConfirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const result = isRecovery
      ? await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })
      : isRegister
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { trial_days: 5 },
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
    } else if (isRegister) {
      if (result.data.session) await supabase.auth.signOut();
      setMessage(
        "¡Bienvenido! Tu cuenta fue creada. Ahora inicia sesión para comenzar tus 5 días gratis.",
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-blue-950/30 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 h-16 w-44 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-[0_0_24px_rgba(37,99,235,0.2)]">
            <img src="/logo.png" alt="JEDAI" className="h-full w-full object-contain" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">Tu espacio de enfoque</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{isRecovery ? "Recupera tu acceso" : isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h1>
          <p className="mt-2 text-sm text-slate-400">Organiza tus tareas y proyectos en un solo lugar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Correo electrónico
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-blue-500" placeholder="tu@email.com" />
            </div>
          </label>
          {!isRecovery && (
            <label className="block text-sm font-medium text-slate-300">
              Contraseña
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-blue-500" placeholder="Mínimo 6 caracteres" minLength={6} />
              </div>
            </label>
          )}
          {isRegister && (
            <label className="block text-sm font-medium text-slate-300">
              Confirmar contraseña
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-blue-500"
                  placeholder="Repite tu contraseña"
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
                {isRegister ? (
                  <>
                    <p className="text-base font-extrabold text-white">
                      ¡Cuenta creada exitosamente!
                    </p>
                    <p className="mt-1 text-sm leading-5 text-emerald-200">
                      Ahora inicia sesión para comenzar tus 5 días gratis.
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold">{message}</p>
                )}
              </div>
            </div>
          )}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Procesando..." : isRecovery ? "Enviar enlace" : isRegister ? "Crear cuenta" : "Entrar"}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm">
          {!isRecovery && <button onClick={() => { setMode("recovery"); setError(""); setMessage(""); }} className="block w-full text-slate-400 hover:text-blue-300">¿Olvidaste tu contraseña?</button>}
          <button onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); setMessage(""); }} className="font-semibold text-blue-300 hover:text-blue-200">{isRegister ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}</button>
          {isRecovery && <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} className="block w-full text-slate-400 hover:text-white">Volver a iniciar sesión</button>}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("university");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
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

  const isSubscriptionValid =
    profile?.subscription_status === "active" &&
    profile?.subscription_end_date != null &&
    new Date(profile.subscription_end_date).getTime() > Date.now();
  const subscriptionDaysRemaining = profile?.subscription_end_date
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
    if (!session?.user?.id || !isSubscriptionValid) return;

    async function fetchDashboardData() {
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
    }

    fetchDashboardData();
  }, [activeTab, isSubscriptionValid, session]);

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
  const criticalTask = categoryTasks
    .filter(
      (task) => !task.is_completed && task.priority === "alta" && task.due_date,
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const visibleTasks = categoryTasks
    .filter((task) => {
      const today = todayString();
      if (filter === "completed") return task.is_completed;
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
    .sort((firstTask, secondTask) => {
      if (!firstTask.due_date) return 1;
      if (!secondTask.due_date) return -1;
      return firstTask.due_date.localeCompare(secondTask.due_date);
    });

  const selectedName = categories.find(
    (category) => category.id === selectedCategory,
  )?.name;
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
    "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500";

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) showNotice(`No se pudo cerrar la sesión: ${error.message}`);
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Comprobando sesión...
      </main>
    );
  }

  if (!session) return <AuthScreen />;
  if (profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Verificando suscripción...
      </main>
    );
  }
  if (!isSubscriptionValid) {
    return <SubscriptionLockScreen onSignOut={signOut} />;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-900 text-slate-100 md:flex">
      <aside className="border-b border-slate-800 bg-slate-950 p-4 md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r md:p-6">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="relative flex h-16 w-44 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-[0_0_20px_rgba(37,99,235,0.18)] sm:h-[4.5rem] sm:w-48 md:h-20 md:w-52">
            <img
              src="/logo.png"
              alt="JEDAI"
              className="h-full w-full object-contain object-center"
            />
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-2 md:block md:space-y-2">
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
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${activeTab === tab ? (tab === "university" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white") : "text-slate-400 hover:bg-slate-800"}`}
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
      </aside>

      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 p-4 sm:p-5 md:p-10">
        {notice && (
          <div className="fixed right-5 top-5 z-10 rounded-lg border border-amber-500/30 bg-slate-800 px-4 py-3 text-sm text-amber-200 shadow-xl">
            {notice}
          </div>
        )}
        <header className="mb-8">
          {shouldShowRenewalNotice && (
            <SubscriptionRenewalNotice
              daysRemaining={subscriptionDaysRemaining}
            />
          )}
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
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

        <section className="mb-8">
          <div className="dashboard-scroll flex gap-3 overflow-x-auto pb-3">
            {sortedCategories.map((category) => (
              <div
                key={category.id}
                className={`flex shrink-0 items-center rounded-xl border text-sm font-semibold transition ${selectedCategory === category.id ? "border-blue-500 bg-slate-800 text-blue-300" : "border-slate-800 bg-slate-950 text-slate-400"}`}
              >
                <button
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setFilter("all");
                  }}
                  className="px-4 py-3 hover:text-blue-300"
                >
                  {category.name}
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

        {!selectedCategory ? (
          <p className="text-sm text-slate-500">
            Selecciona o crea una asignatura/proyecto para comenzar.
          </p>
        ) : (
          <>
            <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">
                    Progreso de {selectedName}
                  </span>
                  <strong className="text-2xl text-emerald-400">
                    {progress}%
                  </strong>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  <span className="text-slate-300">{completedCount}</span>{" "}
                  completadas de {categoryTasks.length} tareas
                </p>
              </div>
              {criticalTask ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
                        <AlertTriangle size={15} />
                        Próximo vencimiento crítico
                      </p>
                      <h3 className="mt-2 font-bold text-white">
                        {criticalTask.title}
                      </h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-red-200">
                        <Calendar size={15} />
                        {criticalTask.due_date}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                      {countdownLabel(criticalTask.due_date, currentTime)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">
                  <CheckCircle2 />
                  No hay vencimientos críticos próximos.
                </div>
              )}
            </section>

            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 md:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Calendar size={18} className="text-blue-400" />
                    Tareas
                  </h3>
                  <div className="dashboard-scroll flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-900 p-1">
                    {filters.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFilter(item.id)}
                        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${filter === item.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <form
                  onSubmit={addTask}
                  className="mb-6 grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_150px_120px_auto]"
                >
                  <input
                    className={inputClass}
                    placeholder="¿Qué tienes que hacer?"
                    value={newTask.title}
                    onChange={(event) =>
                      setNewTask({ ...newTask, title: event.target.value })
                    }
                  />
                  <CompactDateInput
                    value={newTask.due_date}
                    onChange={(event) =>
                      setNewTask({ ...newTask, due_date: event.target.value })
                    }
                    min={todayString()}
                    label="Fecha de entrega"
                  />
                  <select
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
                    className={`${inputClass} min-h-20 resize-y md:col-span-3`}
                    placeholder="Detalles adicionales (herramientas, temas, instrucciones...)"
                    value={newTask.details}
                    onChange={(event) =>
                      setNewTask({ ...newTask, details: event.target.value })
                    }
                  />
                  <button className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 md:w-auto">
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
                          className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-blue-500/50 bg-slate-900 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_150px_120px_auto]"
                        >
                          <input
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
                          className={`rounded-xl border p-4 transition ${task.is_completed ? "border-slate-900 bg-slate-900/50 text-slate-500" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}
                        >
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                            <button
                              onClick={() => toggleTask(task)}
                              className="flex min-w-0 items-center gap-3 text-left"
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
                            <div className="flex w-full shrink-0 items-center justify-end gap-1 text-xs sm:w-auto sm:gap-2">
                            <span
                              className={`rounded-full border px-2 py-1 font-semibold ${priorityStyles[task.priority] || priorityStyles.media}`}
                            >
                              {task.priority || "media"}
                            </span>
                            <span className="hidden items-center gap-1 text-slate-400 sm:flex">
                              <Clock3 size={13} />
                              {task.due_date}
                            </span>
                            {!task.is_completed && task.due_date && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold ${daysUntil(task.due_date, currentTime) < 0 ? "border-red-500/30 bg-red-500/10 text-red-300" : daysUntil(task.due_date, currentTime) <= 1 ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-blue-500/30 bg-blue-500/10 text-blue-300"}`}
                                title={`Cuenta regresiva: ${countdownLabel(task.due_date, currentTime)}`}
                              >
                                <Clock3 size={13} />
                                {countdownLabel(task.due_date, currentTime)}
                              </span>
                            )}
                            <button
                              title="Editar tarea"
                              onClick={() => beginEdit(task)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-blue-300"
                            >
                              <Edit3 size={15} />
                            </button>
                              <button
                                title="Eliminar tarea"
                                onClick={() => deleteTask(task.id)}
                                className="rounded-md p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                          {task.details && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTaskId((current) =>
                                    current === task.id ? null : task.id,
                                  )
                                }
                                className="mt-3 flex items-center gap-2 text-xs font-semibold text-blue-300 hover:text-blue-200"
                              >
                                <FileText size={14} />
                                {expandedTaskId === task.id
                                  ? "Ocultar notas"
                                  : "Ver notas"}
                                {expandedTaskId === task.id ? (
                                  <ChevronUp size={14} />
                                ) : (
                                  <ChevronDown size={14} />
                                )}
                              </button>
                              {expandedTaskId === task.id && (
                                <div className="mt-3 rounded-lg border border-blue-500/20 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
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
              </section>
              <aside className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="mb-1 flex items-center gap-2 font-bold">
                  <Edit3 size={17} className="text-amber-300" />
                  Notas rápidas
                </h3>
                <p className="mb-4 text-xs text-slate-500">
                  Guardadas localmente para {selectedName}.
                </p>
                <textarea
                  value={notes[selectedCategory] || ""}
                  onChange={(event) => updateNotes(event.target.value)}
                  className={`${inputClass} min-h-64 resize-y leading-6`}
                  placeholder="Escribe ideas, enlaces o apuntes..."
                />
                <p className="mt-2 text-right text-xs text-slate-600">
                  Markdown / texto
                </p>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  Edit3,
  FileText,
  GraduationCap,
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

const todayString = () => new Date().toISOString().slice(0, 10);

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysUntil(dateString) {
  const difference =
    new Date(`${dateString}T00:00:00`) - new Date(`${todayString()}T00:00:00`);
  return Math.ceil(difference / 86400000);
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

export default function App() {
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
  const [notes, setNotes] = useState(() =>
    JSON.parse(localStorage.getItem("dashboard-notes") || "{}"),
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function fetchDashboardData() {
      const [{ data: categoryData }, { data: taskData }] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("type", activeTab)
          .order("name"),
        supabase
          .from("tasks")
          .select("*")
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
  }, [activeTab]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function addCategory(event) {
    event.preventDefault();
    if (!newCatName.trim()) return;
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name: newCatName.trim(), type: activeTab }])
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
      .eq("category_id", category.id);
    if (tasksError) {
      return showNotice(`No se pudo eliminar la asignatura: ${tasksError.message}`);
    }

    const { error: categoryError } = await supabase
      .from("categories")
      .delete()
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
    const { error } = await supabase.from("tasks").delete().eq("id", id);
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
  const visibleTasks = categoryTasks.filter((task) => {
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
  });

  const selectedName = categories.find(
    (category) => category.id === selectedCategory,
  )?.name;
  const inputClass =
    "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500";

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-900 text-slate-100 md:flex">
      <aside className="border-b border-slate-800 bg-slate-950 p-4 md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r md:p-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/15 p-2 text-blue-400">
            <BookOpen size={20} />
          </div>
          <h1 className="font-bold tracking-wider">MI DASHBOARD</h1>
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
      </aside>

      <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 p-4 sm:p-5 md:p-10">
        {notice && (
          <div className="fixed right-5 top-5 z-10 rounded-lg border border-amber-500/30 bg-slate-800 px-4 py-3 text-sm text-amber-200 shadow-xl">
            {notice}
          </div>
        )}
        <header className="mb-8">
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
            {categories.map((category) => (
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
                      {daysUntil(criticalTask.due_date) < 0
                        ? "Vencida"
                        : daysUntil(criticalTask.due_date) === 0
                          ? "Hoy"
                          : `${daysUntil(criticalTask.due_date)} días`}
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

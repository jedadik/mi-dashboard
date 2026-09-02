# Auditoría técnica y arquitectura de JEDADI Dashboard

**Fecha de revisión:** 2026-09-02  
**Alcance:** revisión estática del repositorio actual y verificación del flujo de la interfaz en desarrollo.  
**Conclusión de alcance:** el proyecto es una SPA React + Vite. No usa Next.js, Server Components, API Routes, Context API, Zustand ni middleware de rutas.

---

## 0. Resumen ejecutivo

JEDADI Dashboard es una aplicación cliente React 19 que usa Supabase directamente desde el navegador para autenticación, lectura y escritura de perfiles, categorías y tareas. La aplicación se monta desde `src/main.jsx`; el componente raíz `App` concentra la sesión, suscripción, carga de datos, operaciones CRUD y renderizado del dashboard.

La integración de pagos está separada en una Supabase Edge Function Deno ubicada en `supabase/functions/wompi-webhook/index.ts`. Esa función valida la firma de Wompi, registra eventos idempotentes y actualiza perfiles con una clave administrativa.

La UI usa React local state y clases Tailwind. Las mejoras recientes de interfaz incluyen:

- Selector compacto de categorías/asignaturas con menú desplegable.
- Modal para crear categorías o proyectos.
- FAB para crear tareas mediante un modal.
- Acordeón colapsable para notas rápidas.
- Orden compuesto de tareas por fecha y prioridad.
- Modal con todas las próximas entregas.
- Espacio inferior reservado para evitar que el FAB tape el footer.

### Hallazgos principales

1. Las tareas y categorías se consultan desde el navegador con el cliente Supabase.
2. La sesión persistida se gestiona con Supabase Auth y su almacenamiento predeterminado; no hay cookies propias ni middleware.
3. La única migración incluida en el repositorio crea `payment_events`. Las tablas `profiles`, `categories` y `tasks` aparecen en el README, pero no tienen migraciones locales equivalentes.
4. `payment_events` tiene RLS habilitado, pero la migración no declara políticas. Las políticas de las otras tablas no están presentes en el repositorio.
5. React escapa el contenido textual al renderizarlo y no existe `dangerouslySetInnerHTML`. Esto evita que títulos, detalles y notas se interpreten como HTML o JavaScript en la UI.
6. Hay estados explícitos de guardado para evitar doble envío en creación de categorías, creación de tareas y edición de tareas.
7. No hay pruebas automatizadas ni validación server-side visible para longitudes, prioridad o contenido textual.

---

## 1. Estructura del proyecto

```text
/
├── index.html
├── package.json
├── README.md
├── tailwind.config.js
├── vercel.json
├── vite.config.js
├── public/
│   ├── logo.png
│   ├── emblem.png
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   ├── supabase.js
│   ├── lib/
│   │   └── supabase.js
│   └── assets/
├── supabase/
│   ├── config.toml
│   ├── functions/
│   │   └── wompi-webhook/
│   │       ├── deno.json
│   │       └── index.ts
│   └── migrations/
│       └── 20260826000000_create_payment_events.sql
└── backtosafe/
```

### Puntos de entrada

`src/main.jsx` importa los estilos globales y monta `App` dentro del elemento `#root` usando `StrictMode`:

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`vite.config.js` configura Vite con los plugins de React y Tailwind. `vercel.json` redirige cualquier ruta a `/index.html`, comportamiento típico de una SPA:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Cliente Supabase activo

El archivo utilizado por la aplicación es `src/lib/supabase.js`:

```js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

`src/supabase.js` existe, pero no es el cliente utilizado y está vacío según la revisión actual. Esto conviene aclararlo para evitar que una futura modificación importe el archivo equivocado.

---

## 2. Flujo de autenticación y carga inicial

### 2.1 Pantalla inicial

El componente `App` comienza con:

```jsx
const [session, setSession] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const [isRecoverySession, setIsRecoverySession] = useState(() =>
  window.location.hash.includes("type=recovery"),
);
```

Mientras `authLoading` es verdadero, se muestra `LoadingState` con el mensaje accesible `Comprobando sesión...`.

Cuando ya se resolvió la sesión:

```jsx
if (authLoading) return <LoadingState label="Comprobando sesión..." />;
if (isRecoverySession && session) return <AuthScreen initialMode="reset" />;
if (!session) return <AuthScreen />;
```

Por tanto, el usuario no autenticado no se redirige mediante URL: se renderiza la pantalla de autenticación en la misma ruta.

### 2.2 Modos de `AuthScreen`

`AuthScreen` puede funcionar en cuatro modos:

- `login`: correo + contraseña; usa `signInWithPassword`.
- `register`: correo + contraseña + confirmación; usa `signUp` y envía `trial_days: 10` en metadata.
- `recovery`: correo; usa `resetPasswordForEmail` y `VITE_APP_URL` como `redirectTo`.
- `reset`: nueva contraseña + confirmación; usa `updateUser`.

El botón se deshabilita mientras `loading` es verdadero y cambia a `Procesando...`.

La validación de cliente comprueba:

- campos requeridos;
- coincidencia de contraseñas;
- longitud mínima de contraseña de seis caracteres;
- tipo de correo mediante el input HTML `type="email"`.

### 2.3 Recuperación de sesión

En un `useEffect` de `App` se realizan dos operaciones:

```jsx
supabase.auth.getSession().then(({ data, error }) => {
  if (error) return clearInvalidSession();
  if (data.session && sessionIsExpired()) {
    clearInvalidSession();
    return;
  }
  if (data.session) rememberSessionStart();
  setSession(data.session);
  setAuthLoading(false);
});

const { data: { subscription } } =
  supabase.auth.onAuthStateChange((event, nextSession) => {
    // Actualiza session y reacciona a SIGNED_OUT,
    // PASSWORD_RECOVERY y TOKEN_REFRESHED.
  });
```

El listener se desuscribe al desmontar el componente.

### 2.4 Tokens, almacenamiento y cookies

La configuración usa `persistSession: true`, `autoRefreshToken: true` y `detectSessionInUrl: true`. No hay código propio para crear cookies ni una cookie de sesión administrada por la aplicación. El cliente delega el almacenamiento de la sesión a Supabase Auth, que en este tipo de cliente browser usa su almacenamiento persistente predeterminado.

La aplicación también utiliza `localStorage` para:

- `jedadi-auth-session-started-at`: inicio de sesión local.
- `jedadi-last-email`: último correo usado.
- claves `sb-*`: claves gestionadas por Supabase, eliminadas por `clearInvalidSession` al invalidar la sesión.

La expiración adicional de 24 horas es una regla local:

```jsx
const AUTH_SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

function sessionIsExpired() {
  const startedAt = Number(
    localStorage.getItem(AUTH_SESSION_STARTED_AT),
  );
  return startedAt > 0 && Date.now() - startedAt >= AUTH_SESSION_MAX_AGE;
}
```

Esto no demuestra que el refresh token de Supabase expire a las 24 horas; es una política adicional del frontend.

### 2.5 Cierre e invalidación

`clearInvalidSession` limpia el estado React, elimina el marcador local y ejecuta:

```jsx
await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
Object.keys(localStorage)
  .filter((key) => key.startsWith("sb-"))
  .forEach((key) => localStorage.removeItem(key));
```

El cierre manual usa `supabase.auth.signOut()`, elimina el marcador de sesión y muestra un aviso si Supabase devuelve un error.

### 2.6 Carga de perfil y control de acceso

Una vez que existe `session.user.id`, otro `useEffect` consulta `profiles`:

```jsx
const { data, error } = await supabase
  .from("profiles")
  .select("subscription_status, subscription_end_date, created_at")
  .eq("id", session.user.id)
  .maybeSingle();
```

Después se calcula:

- suscripción activa si `subscription_status === "active"` y la fecha de fin es futura;
- prueba activa si el perfil está en `trial` y han pasado menos de 10 días desde `created_at`;
- acceso si se cumple cualquiera de las dos condiciones.

El render condicional queda así:

```text
Comprobando sesión
  -> AuthScreen si no hay sesión
  -> Verificando suscripción si falta el perfil
  -> SubscriptionLockScreen si no hay acceso
  -> Dashboard si hay acceso
```

No existe React Router, middleware de Next.js ni protección de rutas por URL. La protección actual es condicional y está centralizada en el render de `App`.

### 2.7 Regreso de Wompi

Cuando la URL contiene `payment_status=check`, `isPaymentReturn` es verdadero. La aplicación vuelve a consultar `profiles` hasta cinco veces, esperando tres segundos entre intentos, para dar tiempo al webhook de actualizar la suscripción. Al confirmar estado activo o agotar los intentos, limpia el parámetro mediante `history.replaceState`.

---

## 3. Estado y modelo de datos

### 3.1 Modelo de estado React

No hay estado global externo. `App` usa `useState` y `useEffect`; los componentes auxiliares reciben props cuando lo necesitan.

Estados principales:

```jsx
// Sesión y acceso
session, authLoading, profile, profileLoading, dashboardLoading
isRecoverySession, isPaymentReturn

// Navegación y selección
activeTab, categories, selectedCategory, filter
isCategoryMenuOpen, isCategoryModalOpen
isUpcomingDeliveriesOpen, isCompletedTasksOpen

// Formularios y concurrencia
newCatName, isSavingCategory
newTask, isTaskFormOpen, isSavingTask
editingId, editForm, savingEditId

// UI local
expandedTaskId, isQuickNotesOpen, currentTime, notes, notice
```

No existe Context API, Redux, Zustand ni una store global.

### 3.2 Tablas esperadas

La aplicación usa estas tablas mediante Supabase:

#### `auth.users`

Tabla administrada por Supabase Auth. El frontend no la consulta directamente para CRUD del dashboard, pero sus identificadores se usan como propietarios.

#### `profiles`

Según el README:

| Campo | Papel |
|---|---|
| `id` | UUID, referencia a `auth.users(id)`, clave primaria |
| `email` | correo asociado al perfil |
| `subscription_status` | normalmente `trial` o `active`; también se contempla `expired` |
| `plan_type` | `monthly` o `annual` |
| `subscription_end_date` | fecha de vencimiento de la suscripción |
| `created_at` | fecha usada para calcular la prueba |

El frontend consulta el perfil por `id`. El webhook actualiza el perfil por `email`.

#### `categories`

Es la entidad que la interfaz llama “asignatura” o “proyecto”. No existe una tabla `subjects` en el código revisado.

| Campo | Papel |
|---|---|
| `id` | identificador de categoría |
| `user_id` | propietario, referencia a `auth.users(id)` |
| `name` | nombre mostrado |
| `type` | `university` o `personal` |
| `created_at` | fecha de creación |

La relación es `auth.users 1:N categories`.

#### `tasks`

| Campo | Papel |
|---|---|
| `id` | identificador de tarea |
| `user_id` | propietario |
| `category_id` | referencia a `categories(id)` |
| `title` | nombre de la tarea |
| `due_date` | fecha de entrega |
| `priority` | `alta`, `media` o `baja`; por defecto `media` |
| `details` | texto adicional |
| `is_completed` | estado de completado |
| `created_at` | fecha de creación |

Relaciones:

```text
auth.users 1 ─── N categories
categories 1 ─── N tasks
categories 1 ─── N tasks (on delete cascade documentado)
auth.users 1 ─── N tasks
```

#### `payment_events`

La única migración incluida crea:

```sql
create table if not exists public.payment_events (
  id bigint generated by default as identity primary key,
  transaction_id text not null unique,
  event_name text not null,
  processed_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;
```

La unicidad de `transaction_id` permite tratar reintentos del webhook como eventos duplicados.

### 3.3 Discrepancia de migraciones

El README contiene SQL para `profiles`, `categories`, `tasks` y `payment_events`, pero el directorio de migraciones del repositorio solo incluye la migración de `payment_events`. Por tanto, para una auditoría reproducible falta una migración versionada que cree las otras tablas y sus políticas RLS.

No es posible confirmar desde este repositorio si las tablas faltantes ya existen en el proyecto remoto de Supabase.

### 3.4 Estrategia de lectura y escritura

Las operaciones del dashboard se ejecutan en el navegador mediante `src/lib/supabase.js`:

- no hay Server Components;
- no hay API Routes;
- no hay backend intermedio para tareas o categorías;
- no hay Edge Function para el CRUD normal.

Lectura de categorías y tareas:

```jsx
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
```

Escrituras disponibles:

- `addCategory`: inserta categoría y la selecciona.
- `deleteCategory`: elimina sus tareas y luego la categoría.
- `addTask`: inserta tarea para `selectedCategory`.
- `toggleTask`: actualiza `is_completed`.
- `saveEdit`: actualiza título, fecha, prioridad y detalles.
- `deleteTask`: elimina por usuario e id.
- `updateNotes`: persiste notas rápidas en `localStorage`, no en Supabase.

Las consultas incluyen `user_id`, pero la seguridad real debe estar respaldada por políticas RLS en Supabase. Un filtro enviado por el cliente no sustituye una política de base de datos.

---

## 4. Pantalla principal y componentes visuales

Los componentes definidos en `App.jsx` son:

- `CompactDateInput`: input de fecha con icono y etiqueta contextual.
- `LoadingState`: estado de carga con emblema.
- `SubscriptionLockScreen`: bloqueo por suscripción.
- `SubscriptionRenewalNotice`: aviso de renovación.
- `TrialNotice`: aviso de prueba.
- `BrandFooter`: marca y footer.
- `AuthScreen`: login, registro y recuperación.
- `App`: orquestador de sesión, datos y dashboard.

### 4.1 Header y switcher

En móvil, la barra superior muestra el logo y una segunda barra con correo y `Salir`. Debajo se muestra el switcher de dos pestañas:

```jsx
[
  ["university", GraduationCap, "Asignaturas académicas"],
  ["personal", User, "Personal"],
].map(([tab, Icon, label]) => (
  <button
    key={tab}
    type="button"
    onClick={() => {
      setActiveTab(tab);
      setFilter("all");
      setIsCategoryMenuOpen(false);
    }}
  >
    <Icon size={16} />
    <span>{label}</span>
  </button>
))
```

En escritorio se usa el `aside` lateral. El cambio de pestaña reinicia el filtro y cierra el selector de categorías. No cambia la sesión ni hace navegación de URL.

### 4.2 Selector de asignaturas y proyectos

`categories` se consulta filtrando por `type === activeTab`. La lista se ordena por la próxima fecha pendiente de cada categoría y, cuando no hay fechas, por nombre.

El selector muestra únicamente la categoría activa. Al pulsarlo abre un menú con:

- categorías existentes;
- indicador `Próxima` cuando corresponde;
- botón de eliminar por categoría;
- opción final `Crear nueva asignatura...` o `Crear nuevo proyecto...`.

La selección conserva la lógica original:

```jsx
setSelectedCategory(category.id);
setFilter("all");
setIsCategoryMenuOpen(false);
```

La opción de creación abre un modal compacto. Su formulario usa `addCategory`, que inserta con:

```jsx
{
  name: newCatName.trim(),
  type: activeTab,
  user_id: session.user.id,
}
```

Tras éxito se actualizan `categories`, `selectedCategory`, `newCatName` y se cierra el modal.

### 4.3 Progreso

El progreso se calcula solo para la categoría seleccionada:

```jsx
const categoryTasks = tasks.filter(
  (task) => task.category_id === selectedCategory,
);
const completedCount = categoryTasks.filter(
  (task) => task.is_completed,
).length;
const progress = categoryTasks.length
  ? Math.round((completedCount / categoryTasks.length) * 100)
  : 0;
```

La fórmula es:

```text
progreso = round(tareas_completadas / total_de_tareas * 100)
```

Las tareas completadas y pendientes forman parte del denominador. Con cero tareas el resultado es `0%`.

### 4.4 Próximas entregas

El dashboard calcula las tareas activas globales y obtiene la fecha mínima disponible:

```jsx
const activeTasks = tasks.filter((task) => !task.is_completed);
const nextDueDate = activeTasks
  .filter((task) => task.due_date)
  .map((task) => task.due_date)
  .sort()[0];

const nextDueTasks = nextDueDate
  ? activeTasks.filter((task) => task.due_date === nextDueDate)
  : activeTasks.slice(0, 1);
```

La tarjeta principal muestra como máximo dos tareas de la fecha más cercana. Si hay más de dos, `+X más` se representa como botón:

```jsx
<button
  type="button"
  onClick={() => setIsUpcomingDeliveriesOpen(true)}
  className="... cursor-pointer ... hover:bg-jedadi-orange/35"
>
  +{nextDueTasks.length - 2} más
</button>
```

El modal `Todas las próximas entregas` usa `upcomingDeliveries`, que contiene todas las tareas activas con fecha y las ordena con el comparador de tareas. Cada fila muestra:

- `task.title`;
- nombre de categoría entre paréntesis;
- `countdownLabel`, que devuelve `Hoy`, `Mañana`, `Vencida` o `X días`.

El modal es responsive (`w-full`, `max-w-lg`, padding lateral y área interna con `overflow-y-auto`), usa fondo `#0B0F19` mediante `bg-jedadi-dark` y se cierra con el botón `X` o al pulsar fuera.

**Observación:** las tareas se consultan globalmente, mientras que `categories` solo contiene las categorías del tab activo. Si una entrega pertenece al otro tab, el modal puede no resolver su nombre de categoría. Esto es un riesgo de consistencia visual y conviene resolverlo con una consulta global de categorías o un join controlado.

### 4.5 Panel de tareas y filtros

Los filtros existentes son:

- `Todas`: tareas activas sin condición adicional.
- `Para hoy`: `task.due_date === todayString()`.
- `Esta semana`: desde el lunes de la semana actual hasta antes del siguiente límite de siete días.
- `Vencidas`: fecha menor que hoy.

Las tareas completadas se excluyen de la lista activa antes de aplicar los filtros.

El filtro de semana usa fechas locales normalizadas mediante `startOfWeek`. La fecha de vencimiento se compara como fecha `YYYY-MM-DD` o como objeto `Date` en el caso de la semana.

### 4.6 Orden compuesto fecha + prioridad

El comparador actual conserva la fecha como criterio principal:

```jsx
const priorityOrder = { alta: 1, media: 2, baja: 3 };

const sortTasksByDueDate = (firstTask, secondTask) => {
  if (firstTask.due_date && secondTask.due_date) {
    const dateDifference = firstTask.due_date.localeCompare(
      secondTask.due_date,
    );
    if (dateDifference !== 0) return dateDifference;
  } else if (firstTask.due_date) {
    return -1;
  } else if (secondTask.due_date) {
    return 1;
  }

  return (
    (priorityOrder[firstTask.priority] || priorityOrder.media) -
    (priorityOrder[secondTask.priority] || priorityOrder.media)
  );
};
```

Orden efectivo:

1. fechas existentes en orden ascendente;
2. para una misma fecha: `alta`, `media`, `baja`;
3. tareas sin fecha después de las fechadas;
4. entre tareas sin fecha, también se aplica prioridad.

Las fechas se almacenan y comparan como `YYYY-MM-DD`, por lo que `localeCompare` funciona para orden cronológico en ese formato.

### 4.7 Prioridad visual

Las opciones de creación son `Prioridad alta`, `Prioridad media` y `Prioridad baja`. El valor inicial es `media`.

En la tarjeta, el indicador junto al título usa:

- alta: `bg-jedadi-orange` y glow naranja;
- media: `bg-jedadi-purple` y glow violeta;
- baja: `bg-jedadi-green` y glow verde.

El indicador tiene `title` y `aria-label` como `Prioridad alta`, etc. Los nombres de tarea activos y completados usan `truncate`; los nombres de categorías en el selector también usan `truncate`.

### 4.8 FAB para crear tareas

Cuando existe `selectedCategory`, se renderiza un botón global:

```jsx
<button
  type="button"
  aria-label="Añadir tarea"
  onClick={() => setIsTaskFormOpen(true)}
  className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-jedadi-blue ..."
>
  <Plus size={25} />
</button>
```

El FAB abre un modal con título, fecha, prioridad y detalles. El formulario conserva `addTask`, que asocia la tarea a `selectedCategory` y a `session.user.id`.

El `main` tiene `pb-24` para reservar 96px en la parte inferior. Esto evita que el FAB cubra el footer al alcanzar el final de la página.

### 4.9 Notas rápidas

Las notas rápidas son distintas de `task.details`:

- `task.details` se almacena en Supabase como parte de la tarea.
- `notes[selectedCategory]` se almacena en `localStorage` bajo `dashboard-notes`.

El acordeón inicia cerrado mediante:

```jsx
const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
```

El encabezado usa `aria-expanded` y alterna el contenido con clases de transición. El `textarea` sigue vinculado a:

```jsx
value={notes[selectedCategory] || ""}
onChange={(event) => updateNotes(event.target.value)}
```

`updateNotes` actualiza React y escribe inmediatamente en `localStorage`:

```jsx
function updateNotes(value) {
  const nextNotes = { ...notes, [selectedCategory]: value };
  setNotes(nextNotes);
  localStorage.setItem("dashboard-notes", JSON.stringify(nextNotes));
}
```

No se realiza una petición DB para notas rápidas.

---

## 5. Modales y estados de doble envío

### 5.1 Creación de categoría

Estado:

```jsx
const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
const [isSavingCategory, setIsSavingCategory] = useState(false);
```

El handler evita reentrada y deshabilita el botón:

```jsx
if (!newCatName.trim() || isSavingCategory) return;
setIsSavingCategory(true);
try {
  // insert en categories
} finally {
  setIsSavingCategory(false);
}
```

El botón muestra `Guardando...` y tiene `disabled={isSavingCategory}`.

### 5.2 Creación de tarea

Estado:

```jsx
const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
const [isSavingTask, setIsSavingTask] = useState(false);
```

Antes de insertar se comprueba título, fecha, categoría y fecha no anterior a hoy. La condición `isSavingTask` impide doble submit. El botón usa `disabled={isSavingTask}` y muestra `Guardando...`.

Al terminar correctamente:

```jsx
setTasks((current) => [...current, data[0]]);
setNewTask({ title: "", due_date: "", priority: "media", details: "" });
setIsTaskFormOpen(false);
```

### 5.3 Edición de tarea

La edición no es un modal independiente, sino un formulario embebido en la tarjeta. Se protege por tarea:

```jsx
const [savingEditId, setSavingEditId] = useState(null);

if (!editForm.title.trim() || !editForm.due_date || savingEditId === id) {
  return;
}
```

El botón de guardar usa `disabled={savingEditId === task.id}` y el estado se libera en `finally`.

---

## 6. Errores, carga y seguridad

### 6.1 Estados de carga

Se distinguen:

- `authLoading`: comprobar sesión inicial.
- `profileLoading`: consultar perfil y suscripción.
- `dashboardLoading`: cargar categorías y tareas.
- `loading` interno de `AuthScreen`: login, registro, recuperación o reset.
- `isSavingCategory`: creación de categoría.
- `isSavingTask`: creación de tarea.
- `savingEditId`: edición de tarea.

`LoadingState` ofrece un indicador visual con el emblema y un texto accesible mediante `role="status"` y `aria-label`.

### 6.2 Errores de red y Supabase

Los handlers CRUD revisan `error` y usan `showNotice` para presentar mensajes temporales. La eliminación de categorías elimina primero tareas y luego la categoría. La edición y creación no cierran el formulario si la respuesta devuelve error.

El webhook captura excepciones generales y devuelve respuestas JSON con códigos HTTP adecuados para firma inválida, datos inválidos, configuración incompleta o fallo interno.

### 6.3 Riesgos de manejo de errores

La auditoría identifica estos puntos de mejora:

- `fetchDashboardData` destructura solo `data` e ignora errores individuales de categorías y tareas; un fallo puede aparentar una lista vacía.
- `fetchProfile` transforma cualquier error en `profile = null`, por lo que no distingue entre perfil inexistente y error de red.
- `AuthScreen.handleSubmit` no usa `try/finally`; una excepción inesperada fuera de la respuesta normal podría dejar `loading` activo.
- `showNotice` crea temporizadores independientes; avisos consecutivos pueden limpiarse fuera de orden.
- `JSON.parse(localStorage.getItem("dashboard-notes") || "{}")` no tiene `try/catch`; datos locales corruptos podrían impedir el montaje de `App`.

### 6.4 Sanitización y renderizado

Para tareas, categorías y notas, React renderiza valores como texto mediante expresiones JSX:

```jsx
<span>{task.title}</span>
<p>{task.details}</p>
<textarea value={notes[selectedCategory] || ""} />
```

React escapa esos valores al construir el DOM. No se encontró `dangerouslySetInnerHTML`, así que una entrada como `<script>alert(1)</script>` se presenta como texto y no se ejecuta en la interfaz.

Las operaciones de Supabase usan el builder de la librería, no SQL concatenado por el usuario. Eso reduce el riesgo de inyección SQL desde estos formularios.

Sin embargo:

- no hay un sanitizador HTML porque no se permite HTML en la UI actual;
- no hay validación server-side visible para longitudes o contenido;
- no hay límites explícitos de longitud para título, detalles, categorías o notas;
- las políticas RLS remotas deben verificarse en Supabase, ya que no están definidas en las migraciones entregadas.

La protección actual contra inyección depende de mantener estos valores como texto y de no introducir en el futuro renderizado HTML directo.

### 6.5 Seguridad del webhook

`wompi-webhook/index.ts` es una Edge Function Deno que:

1. analiza el JSON;
2. procesa `transaction.updated`;
3. toma `signature.properties`, extrae los valores y reconstruye el payload;
4. concatena propiedades, timestamp y secreto;
5. calcula SHA-256;
6. compara con `timingSafeEqual`;
7. ignora transacciones no aprobadas;
8. valida moneda COP, monto, link, correo e id;
9. inserta `transaction_id` en `payment_events`;
10. usa `SUPABASE_SERVICE_ROLE_KEY` para actualizar `profiles`;
11. trata código `23505` como duplicado.

Los planes actuales son:

- mensual: `2.000.000` centavos y 30 días;
- anual: `18.000.000` centavos y 365 días.

La service role key solo debe existir en secretos de la Edge Function y nunca en variables `VITE_*` del frontend.

El webhook actualiza por email y exige exactamente un perfil coincidente. Conviene mantener unicidad lógica del email en perfiles o migrar a un identificador de usuario inequívoco si el proveedor de pagos lo permite.

---

## 7. Auditoría de consistencia y recomendaciones

### Prioridad alta

1. Versionar migraciones para `profiles`, `categories` y `tasks`.
2. Definir y auditar políticas RLS para que cada usuario solo pueda leer y modificar sus propios registros.
3. Verificar en Supabase remoto que `payment_events` tenga una política compatible con la Edge Function o que el uso de service role sea el único acceso esperado.
4. Validar que el cliente nunca exponga `SUPABASE_SERVICE_ROLE_KEY`.

### Prioridad media

1. Manejar explícitamente errores separados de categorías y tareas en `fetchDashboardData`.
2. Diferenciar “perfil inexistente” de “fallo de red” en `fetchProfile`.
3. Proteger la lectura inicial de notas con `try/catch` ante JSON corrupto.
4. Añadir límites de longitud de UI y validación server-side para nombres, títulos, detalles y prioridades.
5. Añadir pruebas para filtros, orden compuesto, creación, edición, doble submit y recuperación de sesión.
6. Resolver nombres de categoría en próximas entregas cuando la tarea pertenece al tab no activo.

### Prioridad baja

1. Centralizar la creación de avisos para evitar temporizadores fuera de orden.
2. Extraer modales y tarjetas a componentes separados si `App.jsx` continúa creciendo.
3. Eliminar o documentar `src/supabase.js` vacío para evitar imports accidentales.
4. Actualizar README para reflejar que el webhook es una Supabase Edge Function, no una función serverless de Vercel.
5. Alinear la documentación con el nombre real `categories` en lugar de `subjects`/`asignaturas` como nombre de tabla.

---

## 8. Checklist de auditoría final

- [x] Punto de entrada React identificado.
- [x] Cliente Supabase activo identificado.
- [x] Flujo de sesión y recuperación descrito.
- [x] Ausencia de middleware, router y Next.js documentada.
- [x] Estados React enumerados.
- [x] Relaciones de datos descritas.
- [x] Diferencia entre `categories` y `subjects` documentada.
- [x] Lecturas/escrituras y Edge Function descritas.
- [x] Selector, modales, progreso, entregas, filtros, prioridades, FAB y notas documentados.
- [x] Overflow y truncado documentados.
- [x] Protección contra doble submit documentada.
- [x] Sanitización por escape de React documentada.
- [x] Riesgos de RLS, errores, migraciones y validación server-side señalados.
- [ ] Pruebas automatizadas agregadas: pendiente.
- [ ] Políticas RLS completas versionadas: pendiente de confirmar en Supabase.
- [ ] Migraciones de tablas principales versionadas: pendiente.

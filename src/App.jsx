import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { GraduationCap, User, Plus, Calendar, CheckCircle2, Circle, AlertCircle } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('university') // 'university' | 'personal'
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [tasks, setTasks] = useState([])
  
  // Formularios
  const [newCatName, setNewCatName] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('media')

  useEffect(() => {
    fetchCategories()
    fetchTasks()
  }, [activeTab])

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('type', activeTab)
    setCategories(data || [])
    if (data && data.length > 0 && !selectedCategory) {
      setSelectedCategory(data[0].id)
    }
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true })
    setTasks(data || [])
  }

  async function addCategory(e) {
    e.preventDefault()
    if (!newCatName.trim()) return
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: newCatName, type: activeTab }])
      .select()
    if (!error && data) {
      setCategories([...categories, data[0]])
      setSelectedCategory(data[0].id)
      setNewCatName('')
    }
  }

  async function addTask(e) {
    e.preventDefault()
    if (!newTaskTitle.trim() || !newTaskDate || !selectedCategory) return
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: newTaskTitle,
        due_date: newTaskDate,
        priority: newTaskPriority,
        category_id: selectedCategory
      }])
      .select()
    if (!error && data) {
      setTasks([...tasks, data[0]])
      setNewTaskTitle('')
      setNewTaskDate('')
    }
  }

  async function toggleTask(id, isCompleted) {
    await supabase.from('tasks').update({ is_completed: !isCompleted }).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !isCompleted } : t))
  }

  const currentTasks = tasks.filter(t => t.category_id === selectedCategory)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar de Navegación */}
      <aside className="w-full md:w-64 bg-slate-950 p-6 flex flex-col border-r border-slate-800">
        <h1 className="text-xl font-bold tracking-wider text-blue-400 mb-8">MI DASHBOARD</h1>
        
        <nav className="space-y-2">
          <button
            onClick={() => { setActiveTab('university'); setSelectedCategory(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'university' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <GraduationCap size={20} />
            <span className="font-medium">Universidad</span>
          </button>

          <button
            onClick={() => { setActiveTab('personal'); setSelectedCategory(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'personal' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <User size={20} />
            <span className="font-medium">Proyectos / Vida</span>
          </button>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        <header className="mb-8">
          <h2 className="text-3xl font-extrabold capitalize text-white">
            {activeTab === 'university' ? 'Asignaturas Académicas' : 'Proyectos Personales'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Gestiona tus áreas de enfoques y entrega tus pendientes a tiempo.</p>
        </header>

        {/* Sección 1: Categorías / Asignaturas */}
        <section className="mb-10">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-3 rounded-xl font-semibold border text-sm transition shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-slate-800 border-blue-500 text-blue-400 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <form onSubmit={addCategory} className="mt-3 flex gap-2 max-w-md">
            <input
              type="text"
              placeholder={activeTab === 'university' ? "Nueva asignatura..." : "Nuevo proyecto..."}
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-sm w-full focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 shrink-0">
              <Plus size={16} /> Crear
            </button>
          </form>
        </section>

        {/* Sección 2: Tareas de la Categoría Seleccionada */}
        {selectedCategory ? (
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-blue-400" /> Quehaceres Organizados por Fecha
            </h3>

            {/* Formulario de Nueva Tarea */}
            <form onSubmit={addTask} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <input
                type="text"
                placeholder="¿Qué tienes que hacer?"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm md:col-span-2 focus:outline-none focus:border-blue-500"
              />
              <input
                type="date"
                value={newTaskDate}
                onChange={e => setNewTaskDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-300"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 font-semibold py-2 rounded-lg text-sm transition flex items-center justify-center gap-1">
                <Plus size={16} /> Añadir
              </button>
            </form>

            {/* Lista de Tareas ordenadas por fecha */}
            <div className="space-y-3">
              {currentTasks.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No hay tareas pendientes en esta área.</p>
              ) : (
                currentTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id, task.is_completed)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition cursor-pointer ${
                      task.is_completed ? 'bg-slate-900/50 border-slate-900 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {task.is_completed ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Circle size={20} />}
                      <span className={task.is_completed ? 'line-through' : 'font-medium'}>{task.title}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-md text-slate-400">
                        {task.due_date}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <p className="text-slate-500 text-sm">Selecciona o crea una asignatura/proyecto para comenzar a gestionar tareas.</p>
        )}
      </main>
    </div>
  )
}
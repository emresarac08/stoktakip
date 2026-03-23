'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Package, Plus, LogOut, AlertTriangle, CheckCircle,
  Pencil, Trash2, X, Save, TrendingDown, TrendingUp,
  BarChart3, FileDown, Search, Sun, Moon, History,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/supabase-js'

const StockCharts = dynamic(() => import('./StockCharts'), { ssr: false })

// ─── Types ───────────────────────────────────────────────────────────────────
interface Product {
  id: string
  user_id: string
  name: string
  quantity: number
  critical_threshold: number
  unit: string
  category: string
  subcategory: string
  created_at: string
}

interface StockMovement {
  id: string
  product_id: string
  user_id: string
  quantity_change: number
  quantity_before: number
  quantity_after: number
  note: string
  created_at: string
}

interface Props {
  user: User
  initialProducts: Product[]
}

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES: Record<string, string[]> = {
  'Soft İçecekler': [
    'Kola & Gazlı', 'Su & Maden Suyu', 'Meyve Suyu',
    'Enerji İçeceği', 'Çay & Kahve', 'Diğer',
  ],
  'Alkollü İçecekler': [
    'Viski', 'Vodka', 'Cin', 'Brendi', 'Rakı',
    'Şarap', 'Bira', 'Likör', 'Tekila', 'Şampanya', 'Diğer',
  ],
}

const ALL_UNITS = ['adet', 'kg', 'litre', 'cl', 'kutu', 'paket', 'şişe', 'fıçı']

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardClient({ user, initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCharts, setShowCharts] = useState(false)
  const [historyProductId, setHistoryProductId] = useState<string | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [allMovements, setAllMovements] = useState<StockMovement[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [form, setForm] = useState({
    name: '', quantity: '', critical_threshold: '', unit: 'şişe',
    category: 'Alkollü İçecekler', subcategory: 'Viski',
  })

  const supabase = createClient()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı'
  const businessName = user.user_metadata?.business_name || ''

  // Load all movements for charts (last 7 days)
  useEffect(() => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    supabase
      .from('stock_movements')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAllMovements(data) })
  }, [])

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = !activeCategory || p.category === activeCategory
      const matchSub = !activeSubcategory || p.subcategory === activeSubcategory
      return matchSearch && matchCat && matchSub
    })
  }, [products, search, activeCategory, activeSubcategory])

  const criticalCount = products.filter(p => p.quantity <= p.critical_threshold).length
  const okCount = products.length - criticalCount

  const resetForm = () => {
    setForm({ name: '', quantity: '', critical_threshold: '', unit: 'şişe', category: 'Alkollü İçecekler', subcategory: 'Viski' })
    setError('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  // Record movement helper
  const recordMovement = async (productId: string, before: number, after: number, note = '') => {
    await supabase.from('stock_movements').insert({
      product_id: productId,
      user_id: user.id,
      quantity_change: after - before,
      quantity_before: before,
      quantity_after: after,
      note,
    })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        quantity: Number(form.quantity),
        critical_threshold: Number(form.critical_threshold),
        unit: form.unit,
        category: form.category,
        subcategory: form.subcategory,
      })
      .select()
      .single()

    if (error) { setError('Ürün eklenirken hata oluştu.'); setLoading(false); return }
    setProducts([data, ...products])
    if (Number(form.quantity) > 0) {
      await recordMovement(data.id, 0, Number(form.quantity), 'İlk stok')
    }
    setShowAddForm(false)
    resetForm()
    setLoading(false)
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      quantity: String(product.quantity),
      critical_threshold: String(product.critical_threshold),
      unit: product.unit,
      category: product.category || 'Alkollü İçecekler',
      subcategory: product.subcategory || 'Viski',
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setLoading(true)
    setError('')

    const prev = products.find(p => p.id === editingId)
    const newQty = Number(form.quantity)

    const { data, error } = await supabase
      .from('products')
      .update({
        name: form.name.trim(),
        quantity: newQty,
        critical_threshold: Number(form.critical_threshold),
        unit: form.unit,
        category: form.category,
        subcategory: form.subcategory,
      })
      .eq('id', editingId)
      .select()
      .single()

    if (error) { setError('Güncellenirken hata oluştu.'); setLoading(false); return }
    if (prev && prev.quantity !== newQty) {
      await recordMovement(editingId, prev.quantity, newQty, 'Manuel güncelleme')
    }
    setProducts(products.map(p => p.id === editingId ? data : p))
    setEditingId(null)
    resetForm()
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(products.filter(p => p.id !== id))
    setDeletingId(null)
  }

  const handleQuantityChange = async (product: Product, delta: number) => {
    const newQty = Math.max(0, product.quantity + delta)
    const { data, error } = await supabase
      .from('products')
      .update({ quantity: newQty })
      .eq('id', product.id)
      .select()
      .single()

    if (!error && data) {
      setProducts(products.map(p => p.id === product.id ? data : p))
      await recordMovement(product.id, product.quantity, newQty, delta > 0 ? 'Artış' : 'Azalış')
    }
  }

  const handleShowHistory = async (productId: string) => {
    setHistoryProductId(productId)
    setLoadingHistory(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(30)
    setMovements(data || [])
    setLoadingHistory(false)
  }

  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'StokTakip'
    wb.created = new Date()
    const ws = wb.addWorksheet('Stok Listesi', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    })
    ws.columns = [
      { key: 'no', width: 6 }, { key: 'name', width: 30 }, { key: 'cat', width: 20 },
      { key: 'subcat', width: 16 }, { key: 'qty', width: 18 }, { key: 'unit', width: 12 },
      { key: 'thresh', width: 18 }, { key: 'status', width: 14 },
    ]
    ws.mergeCells('A1:H1')
    const titleCell = ws.getCell('A1')
    titleCell.value = businessName ? `${businessName} — STOK TAKİP RAPORU` : 'STOK TAKİP RAPORU'
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 36
    ws.mergeCells('A2:H2')
    ws.getCell('A2').value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}`
    ws.getCell('A2').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF888888' } }
    ws.getCell('A2').alignment = { horizontal: 'center' }
    ws.getRow(2).height = 20
    ws.addRow([])
    const hRow = ws.addRow(['#', 'Ürün Adı', 'Kategori', 'Alt Kategori', 'Mevcut', 'Birim', 'Kritik Eşik', 'Durum'])
    hRow.height = 28
    hRow.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    products.forEach((p, i) => {
      const isCritical = p.quantity <= p.critical_threshold
      const row = ws.addRow([i + 1, p.name, p.category, p.subcategory, p.quantity, p.unit, p.critical_threshold, isCritical ? 'KRİTİK' : 'Yeterli'])
      row.height = 22
      row.eachCell((cell, col) => {
        cell.font = { name: 'Calibri', size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF' } }
        cell.alignment = { horizontal: col === 2 ? 'left' : 'center', vertical: 'middle' }
      })
      const statusCell = row.getCell(8)
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isCritical ? 'FFDC2626' : 'FF16A34A' } }
    })
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stok-listesi-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const historyProduct = products.find(p => p.id === historyProductId)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Arka plan efekti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1,1.1,1], opacity: [0.04,0.08,0.04] }} transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500 rounded-full blur-3xl -translate-y-1/2" />
        {criticalCount > 0 && (
          <motion.div animate={{ scale: [1,1.15,1], opacity: [0.03,0.07,0.03] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }}
            className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-red-500 rounded-full blur-3xl translate-y-1/2" />
        )}
      </div>

      {/* ── Header ── */}
      <motion.header initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div whileHover={{ rotate: 10, scale: 1.1 }} className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/30 flex-shrink-0">
              <Package size={20} className="text-white" />
            </motion.div>
            <div className="min-w-0">
              <span className="font-bold text-lg tracking-tight block leading-none">StokTakip</span>
              {businessName && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate block max-w-[140px] sm:max-w-none">{businessName}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block truncate max-w-[120px]">{displayName}</span>

            {/* Dark/Light toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-colors"
              title={isDark ? 'Gündüz modu' : 'Gece modu'}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={isDark ? 'moon' : 'sun'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            <motion.button onClick={handleLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-xl">
              <LogOut size={15} />
              <span className="hidden sm:block">Çıkış</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-5xl mx-auto px-4 py-5 relative z-10">
        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Toplam', value: products.length, color: 'text-gray-900 dark:text-white', icon: <BarChart3 size={14} />, iconColor: 'text-blue-500', border: 'border-blue-200 dark:border-blue-500/20', bg: 'from-blue-50 dark:from-blue-600/10' },
            { label: 'Yeterli', value: okCount, color: 'text-green-600 dark:text-green-400', icon: <CheckCircle size={14} />, iconColor: 'text-green-500', border: 'border-green-200 dark:border-green-500/20', bg: 'from-green-50 dark:from-green-600/10' },
            { label: 'Kritik', value: criticalCount, color: 'text-red-600 dark:text-red-400', icon: <AlertTriangle size={14} />, iconColor: 'text-red-500', border: 'border-red-200 dark:border-red-500/20', bg: 'from-red-50 dark:from-red-600/10' },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className={`bg-gradient-to-br ${s.bg} to-transparent bg-white dark:bg-gray-900 border ${s.border} rounded-2xl p-3 sm:p-4 cursor-default`}>
              <div className={`flex items-center gap-1.5 ${s.iconColor} text-xs mb-1.5`}>
                {s.icon} <span className="hidden sm:inline">{s.label}</span>
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className={`text-xs text-gray-400 sm:hidden mt-0.5`}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Search ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={14} />
            </button>
          )}
        </motion.div>

        {/* ── Category Tabs ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[null, ...Object.keys(CATEGORIES)].map(cat => (
              <button key={cat ?? 'all'}
                onClick={() => { setActiveCategory(cat); setActiveSubcategory(null) }}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500'
                }`}>
                {cat ?? 'Tümü'}
              </button>
            ))}
          </div>

          {/* Subcategory chips */}
          <AnimatePresence>
            {activeCategory && CATEGORIES[activeCategory] && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 overflow-x-auto pb-1 pt-2 scrollbar-hide">
                <button onClick={() => setActiveSubcategory(null)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    !activeSubcategory
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  Hepsi
                </button>
                {CATEGORIES[activeCategory].map(sub => (
                  <button key={sub} onClick={() => setActiveSubcategory(sub === activeSubcategory ? null : sub)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      activeSubcategory === sub
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                    {sub}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Toolbar ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {filteredProducts.length} ürün
              {(search || activeCategory) && <span className="text-gray-400 dark:text-gray-500 font-normal"> (filtreli)</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowCharts(v => !v)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-xl transition-colors border border-gray-200 dark:border-gray-700">
              <BarChart3 size={15} />
              <span className="hidden sm:block">Grafikler</span>
              {showCharts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </motion.button>
            <AnimatePresence>
              {products.length > 0 && (
                <motion.button onClick={handleExportExcel}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-600/20">
                  <FileDown size={15} />
                  <span className="hidden sm:block">Excel</span>
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button onClick={() => { setShowAddForm(true); setEditingId(null); resetForm() }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
              <Plus size={15} />
              <span className="hidden sm:block">Ekle</span>
              <span className="sm:hidden">Ekle</span>
            </motion.button>
          </div>
        </motion.div>

        {/* ── Charts Panel ── */}
        <AnimatePresence>
          {showCharts && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }} className="overflow-hidden mb-5">
              <StockCharts products={products} movements={allMovements} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add Form ── */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
              className="bg-white dark:bg-gray-900/90 border border-blue-300 dark:border-blue-500/30 rounded-2xl p-5 mb-4 overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white">Yeni Ürün Ekle</h3>
                <motion.button whileHover={{ rotate: 90 }} onClick={() => { setShowAddForm(false); resetForm() }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={18} />
                </motion.button>
              </div>
              <form onSubmit={handleAdd}>
                <ProductForm form={form} setForm={setForm} error={error} loading={loading}
                  onCancel={() => { setShowAddForm(false); resetForm() }} submitLabel="Ekle" />
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Product List ── */}
        {filteredProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center py-20 text-gray-400 dark:text-gray-600">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
              <Package size={48} className="mx-auto mb-3 opacity-30" />
            </motion.div>
            <p className="text-sm">{search ? `"${search}" için sonuç bulunamadı.` : 'Henüz ürün eklenmedi.'}</p>
          </motion.div>
        ) : (
          <motion.div className="space-y-2.5" initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
            <AnimatePresence>
              {filteredProducts.map(product => {
                const isCritical = product.quantity <= product.critical_threshold
                const isEditing = editingId === product.id
                const percentage = product.critical_threshold > 0
                  ? Math.min(100, Math.round((product.quantity / (product.critical_threshold * 3)) * 100))
                  : 100

                if (isEditing) {
                  return (
                    <motion.div key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-500/30 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-sm text-gray-800 dark:text-white">Düzenle</h3>
                        <motion.button whileHover={{ rotate: 90 }} onClick={() => { setEditingId(null); resetForm() }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <X size={18} />
                        </motion.button>
                      </div>
                      <form onSubmit={handleUpdate}>
                        <ProductForm form={form} setForm={setForm} error={error} loading={loading}
                          onCancel={() => { setEditingId(null); resetForm() }} submitLabel="Kaydet" />
                      </form>
                    </motion.div>
                  )
                }

                return (
                  <motion.div key={product.id}
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    whileHover={{ y: -1, transition: { duration: 0.15 } }}
                    className={`relative bg-white dark:bg-gray-900/80 backdrop-blur-sm border rounded-2xl p-4 transition-colors ${
                      isCritical
                        ? 'border-red-300 dark:border-red-500/40 shadow-red-100 dark:shadow-red-500/5 shadow-md'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}>

                    {isCritical && (
                      <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-2xl ring-1 ring-red-400/20 pointer-events-none" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Name + badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {isCritical && (
                            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>
                              <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                            </motion.div>
                          )}
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{product.name}</h3>
                          {product.category && product.category !== 'Diğer' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
                              {product.subcategory || product.category}
                            </span>
                          )}
                        </div>

                        {/* Quantity info */}
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2.5">
                          <span>Stok: <span className={`font-bold ${isCritical ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{product.quantity} {product.unit}</span></span>
                          <span className="text-gray-300 dark:text-gray-700">|</span>
                          <span>Eşik: <span className="text-gray-600 dark:text-gray-300">{product.critical_threshold} {product.unit}</span></span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                            className={`h-1.5 rounded-full ${isCritical ? 'bg-red-500' : percentage > 60 ? 'bg-green-500' : 'bg-yellow-500'}`}
                          />
                        </div>
                        {isCritical && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">Kritik seviyede!</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {[
                          { icon: <TrendingDown size={14} />, onClick: () => handleQuantityChange(product, -1), title: 'Azalt', hover: 'hover:bg-gray-100 dark:hover:bg-gray-700' },
                          { icon: <TrendingUp size={14} />, onClick: () => handleQuantityChange(product, 1), title: 'Artır', hover: 'hover:bg-gray-100 dark:hover:bg-gray-700' },
                          { icon: <History size={14} />, onClick: () => handleShowHistory(product.id), title: 'Geçmiş', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-600 dark:hover:text-amber-400' },
                          { icon: <Pencil size={14} />, onClick: () => handleEdit(product), title: 'Düzenle', hover: 'hover:bg-blue-100 dark:hover:bg-blue-600 hover:text-blue-600 dark:hover:text-white' },
                        ].map(({ icon, onClick, title, hover }) => (
                          <motion.button key={title} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            onClick={onClick} title={title}
                            className={`w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${hover} rounded-lg text-gray-500 dark:text-gray-400 transition-colors`}>
                            {icon}
                          </motion.button>
                        ))}
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} title="Sil"
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-600 hover:text-red-600 dark:hover:text-white disabled:opacity-50 rounded-lg text-gray-500 dark:text-gray-400 transition-colors">
                          {deletingId === product.id
                            ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <Trash2 size={14} />}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ── History Modal ── */}
      <AnimatePresence>
        {historyProductId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setHistoryProductId(null)}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    Stok Geçmişi
                  </h3>
                  {historyProduct && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{historyProduct.name}</p>}
                </div>
                <motion.button whileHover={{ rotate: 90 }} onClick={() => setHistoryProductId(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={18} />
                </motion.button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : movements.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                    <Clock size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Henüz hareket kaydı yok</p>
                  </div>
                ) : (
                  movements.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${m.quantity_change > 0 ? 'text-green-500' : m.quantity_change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                          </span>
                          {m.note && <span className="text-xs text-gray-400 dark:text-gray-500">{m.note}</span>}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {m.quantity_before} → {m.quantity_after}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(m.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ProductForm ──────────────────────────────────────────────────────────────
function ProductForm({
  form, setForm, error, loading, onCancel, submitLabel
}: {
  form: { name: string; quantity: string; critical_threshold: string; unit: string; category: string; subcategory: string }
  setForm: (f: typeof form) => void
  error: string
  loading: boolean
  onCancel: () => void
  submitLabel: string
}) {
  const subcategories = CATEGORIES[form.category] || []

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ürün Adı</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Örn: Jack Daniel's" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kategori</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subcategory: CATEGORIES[e.target.value]?.[0] || 'Diğer' })}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
            {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Alt Kategori</label>
          <select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
            {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mevcut</label>
          <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required min="0"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="0" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kritik Eşik</label>
          <input type="number" value={form.critical_threshold} onChange={e => setForm({ ...form, critical_threshold: e.target.value })} required min="0"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Birim</label>
          <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
            {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-xl px-3 py-2 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
          İptal
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white rounded-xl transition-colors flex items-center gap-1.5">
          {loading
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><Save size={14} />{submitLabel}</>}
        </button>
      </div>
    </div>
  )
}

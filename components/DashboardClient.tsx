'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Package, Plus, LogOut, AlertTriangle, CheckCircle,
  Pencil, Trash2, X, Save, TrendingDown, TrendingUp, BarChart3, FileDown
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/supabase-js'

interface Product {
  id: string
  user_id: string
  name: string
  quantity: number
  critical_threshold: number
  unit: string
  created_at: string
}

interface Props {
  user: User
  initialProducts: Product[]
}

const UNITS = ['adet', 'kg', 'litre', 'cl', 'kutu', 'paket', 'metre']

export default function DashboardClient({ user, initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    quantity: '',
    critical_threshold: '',
    unit: 'adet',
  })

  const supabase = createClient()
  const router = useRouter()

  const resetForm = () => {
    setForm({ name: '', quantity: '', critical_threshold: '', unit: 'adet' })
    setError('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'StokTakip'
    wb.created = new Date()

    const ws = wb.addWorksheet('Stok Listesi', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    })

    // Sütun genişlikleri
    ws.columns = [
      { key: 'no',     width: 6  },
      { key: 'name',   width: 30 },
      { key: 'qty',    width: 18 },
      { key: 'unit',   width: 12 },
      { key: 'thresh', width: 18 },
      { key: 'status', width: 14 },
      { key: 'date',   width: 18 },
    ]

    // Başlık satırı (1. satır) — rapor adı birleşik hücre
    ws.mergeCells('A1:G1')
    const titleCell = ws.getCell('A1')
    titleCell.value = 'STOK TAKİP RAPORU'
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 36

    // Tarih satırı (2. satır)
    ws.mergeCells('A2:G2')
    const dateCell = ws.getCell('A2')
    dateCell.value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}`
    dateCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF888888' } }
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(2).height = 20

    // Boş satır
    ws.addRow([])
    ws.getRow(3).height = 6

    // Kolon başlıkları (4. satır)
    const headerRow = ws.addRow(['#', 'Ürün Adı', 'Mevcut Miktar', 'Birim', 'Kritik Eşik', 'Durum', 'Eklenme Tarihi'])
    headerRow.height = 28
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FF1D4ED8' } },
        bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } },
        left:   { style: 'thin', color: { argb: 'FF1D4ED8' } },
        right:  { style: 'thin', color: { argb: 'FF1D4ED8' } },
      }
    })

    // Veri satırları
    products.forEach((p, i) => {
      const isCritical = p.quantity <= p.critical_threshold
      const isCl = p.unit === 'cl'
      const isEven = i % 2 === 0

      // CL satırı: turuncu-amber ton | Normal: zebra gri/beyaz
      const rowBg = isCl
        ? (isEven ? 'FFFFF3CD' : 'FFFEF0B0')  // amber/sarımsı
        : (isEven ? 'FFFAFAFA' : 'FFFFFFFF')

      const fontSize = isCl ? 11 : 10
      const rowHeight = isCl ? 26 : 22

      const row = ws.addRow([
        i + 1,
        p.name,
        p.quantity,
        p.unit,
        p.critical_threshold,
        isCritical ? 'KRİTİK' : 'Yeterli',
        new Date(p.created_at).toLocaleDateString('tr-TR'),
      ])
      row.height = rowHeight

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: fontSize, bold: isCl, color: { argb: 'FF1F2937' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        cell.border = {
          top:    { style: isCl ? 'thin' : 'hair', color: { argb: isCl ? 'FFD97706' : 'FFE5E7EB' } },
          bottom: { style: isCl ? 'thin' : 'hair', color: { argb: isCl ? 'FFD97706' : 'FFE5E7EB' } },
          left:   { style: isCl ? 'thin' : 'hair', color: { argb: isCl ? 'FFD97706' : 'FFE5E7EB' } },
          right:  { style: isCl ? 'thin' : 'hair', color: { argb: isCl ? 'FFD97706' : 'FFE5E7EB' } },
        }
        if (colNum === 1 || colNum === 3 || colNum === 4 || colNum === 5 || colNum === 6 || colNum === 7) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' }
        }
      })

      // Ürün adı hücresi — sarı arka plan, siyah bold, büyük font (tüm satırlar)
      const nameCell = row.getCell(2)
      nameCell.font = { name: 'Calibri', size: isCl ? 12 : 11, bold: true, color: { argb: 'FF111827' } }
      nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } }  // sarı
      nameCell.border = {
        top:    { style: 'thin', color: { argb: 'FFFBBF24' } },
        bottom: { style: 'thin', color: { argb: 'FFFBBF24' } },
        left:   { style: 'thin', color: { argb: 'FFFBBF24' } },
        right:  { style: 'thin', color: { argb: 'FFFBBF24' } },
      }

      // Birim hücresi — CL ise turuncu vurgulu
      if (isCl) {
        const unitCell = row.getCell(4)
        unitCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF92400E' } }
        unitCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } }  // turuncu açık
      }

      // Durum hücresi
      const statusCell = row.getCell(6)
      if (isCritical) {
        statusCell.font = { name: 'Calibri', size: fontSize, bold: true, color: { argb: 'FFFFFFFF' } }
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }
      } else {
        statusCell.font = { name: 'Calibri', size: fontSize, bold: true, color: { argb: 'FFFFFFFF' } }
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
      }

      // Miktar hücresi — kritikse kırmızı bold
      if (isCritical) {
        const qtyCell = row.getCell(3)
        qtyCell.font = { name: 'Calibri', size: fontSize, bold: true, color: { argb: 'FFDC2626' } }
      }
    })

    // Özet satırı
    ws.addRow([])
    const summaryRow = ws.addRow([
      '', 'TOPLAM ÜRÜN',
      products.length, '',
      '', `Kritik: ${products.filter(p => p.quantity <= p.critical_threshold).length} / Yeterli: ${products.filter(p => p.quantity > p.critical_threshold).length}`, ''
    ])
    summaryRow.height = 24
    summaryRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E3A5F' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0EDFF' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // İndir
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stok-listesi-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
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
      })
      .select()
      .single()

    if (error) {
      setError('Ürün eklenirken hata oluştu.')
      setLoading(false)
      return
    }

    setProducts([data, ...products])
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
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('products')
      .update({
        name: form.name.trim(),
        quantity: Number(form.quantity),
        critical_threshold: Number(form.critical_threshold),
        unit: form.unit,
      })
      .eq('id', editingId)
      .select()
      .single()

    if (error) {
      setError('Güncellenirken hata oluştu.')
      setLoading(false)
      return
    }

    setProducts(products.map(p => p.id === editingId ? data : p))
    setEditingId(null)
    resetForm()
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) {
      setProducts(products.filter(p => p.id !== id))
    }
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
    }
  }

  const criticalCount = products.filter(p => p.quantity <= p.critical_threshold).length
  const totalProducts = products.length
  const okCount = totalProducts - criticalCount

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı'

  const statCards = [
    { label: 'Toplam Ürün', value: totalProducts, color: 'text-white', icon: <BarChart3 size={16} />, iconColor: 'text-blue-400', bg: 'from-blue-600/10 to-transparent', border: 'border-blue-500/20' },
    { label: 'Yeterli Stok', value: okCount, color: 'text-green-400', icon: <CheckCircle size={16} />, iconColor: 'text-green-400', bg: 'from-green-600/10 to-transparent', border: 'border-green-500/20' },
    { label: 'Kritik Stok', value: criticalCount, color: 'text-red-400', icon: <AlertTriangle size={16} />, iconColor: 'text-red-400', bg: 'from-red-600/10 to-transparent', border: 'border-red-500/20' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Arka plan efekti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1,1.1,1], opacity: [0.08,0.14,0.08] }} transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600 rounded-full blur-3xl -translate-y-1/2" />
        {criticalCount > 0 && (
          <motion.div animate={{ scale: [1,1.15,1], opacity: [0.06,0.12,0.06] }} transition={{ duration: 7, repeat: Infinity, delay: 1 }}
            className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-red-600 rounded-full blur-3xl translate-y-1/2" />
        )}
      </div>

      {/* Header */}
      <motion.header initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
        className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div whileHover={{ rotate: 10, scale: 1.1 }} className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/30">
              <Package size={20} className="text-white" />
            </motion.div>
            <span className="font-bold text-lg tracking-tight">StokTakip</span>
          </div>
          <div className="flex items-center gap-3">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-sm text-gray-400 hidden sm:block">{displayName}</motion.span>
            <motion.button onClick={handleLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg">
              <LogOut size={15} />
              <span className="hidden sm:block">Çıkış</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {statCards.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 + 0.1 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className={`bg-gradient-to-br ${s.bg} bg-gray-900 border ${s.border} rounded-2xl p-4 cursor-default`}>
              <div className={`flex items-center gap-2 ${s.iconColor} text-xs mb-2`}>
                {s.icon} {s.label}
              </div>
              <motion.p key={s.value} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className={`text-2xl font-bold ${s.color}`}>{s.value}</motion.p>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-300">Ürünler</h2>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {products.length > 0 && (
                <motion.button onClick={handleExportExcel}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-700/20">
                  <FileDown size={16} /> Excel
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button onClick={() => { setShowAddForm(true); setEditingId(null); resetForm() }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
              <Plus size={16} /> Ürün Ekle
            </motion.button>
          </div>
        </motion.div>

        {/* Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.25 }}
              className="bg-gray-900/90 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-5 mb-4 overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Yeni Ürün Ekle</h3>
                <motion.button whileHover={{ rotate: 90 }} onClick={() => { setShowAddForm(false); resetForm() }} className="text-gray-500 hover:text-gray-300 transition-colors">
                  <X size={18} />
                </motion.button>
              </div>
              <form onSubmit={handleAdd}>
                <ProductForm form={form} setForm={setForm} error={error} loading={loading} onCancel={() => { setShowAddForm(false); resetForm() }} submitLabel="Ekle" />
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product List */}
        {products.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-center py-20 text-gray-600">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
              <Package size={48} className="mx-auto mb-3 opacity-20" />
            </motion.div>
            <p className="text-sm">Henüz ürün eklenmedi.</p>
            <p className="text-xs mt-1 opacity-60">Yukarıdaki "Ürün Ekle" butonunu kullanın.</p>
          </motion.div>
        ) : (
          <motion.div className="space-y-3" initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
            <AnimatePresence>
              {products.map(product => {
                const isCritical = product.quantity <= product.critical_threshold
                const isEditing = editingId === product.id
                const percentage = product.critical_threshold > 0
                  ? Math.min(100, Math.round((product.quantity / (product.critical_threshold * 3)) * 100))
                  : 100

                if (isEditing) {
                  return (
                    <motion.div key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="bg-gray-900 border border-blue-500/30 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-sm">Düzenle</h3>
                        <motion.button whileHover={{ rotate: 90 }} onClick={() => { setEditingId(null); resetForm() }} className="text-gray-500 hover:text-gray-300">
                          <X size={18} />
                        </motion.button>
                      </div>
                      <form onSubmit={handleUpdate}>
                        <ProductForm form={form} setForm={setForm} error={error} loading={loading} onCancel={() => { setEditingId(null); resetForm() }} submitLabel="Kaydet" />
                      </form>
                    </motion.div>
                  )
                }

                return (
                  <motion.div key={product.id}
                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    className={`bg-gray-900/80 backdrop-blur-sm border rounded-2xl p-4 transition-colors ${isCritical ? 'border-red-500/40 shadow-red-500/5 shadow-lg' : 'border-gray-800 hover:border-gray-700'}`}>
                    {isCritical && (
                      <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-2xl ring-1 ring-red-500/20 pointer-events-none" />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isCritical && (
                            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>
                              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                            </motion.div>
                          )}
                          <h3 className="font-semibold truncate">{product.name}</h3>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                          <span>Stok: <span className={`font-bold ${isCritical ? 'text-red-400' : 'text-white'}`}>{product.quantity} {product.unit}</span></span>
                          <span>Eşik: <span className="text-gray-300">{product.critical_threshold} {product.unit}</span></span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                            className={`h-1.5 rounded-full ${isCritical ? 'bg-red-500' : 'bg-green-500'}`}
                          />
                        </div>
                        {isCritical && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 mt-1">
                            Kritik seviyede veya altında!
                          </motion.p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {[
                          { icon: <TrendingDown size={14} />, onClick: () => handleQuantityChange(product, -1), title: '1 azalt', hover: 'hover:bg-gray-700' },
                          { icon: <TrendingUp size={14} />, onClick: () => handleQuantityChange(product, 1), title: '1 artır', hover: 'hover:bg-gray-700' },
                          { icon: <Pencil size={14} />, onClick: () => handleEdit(product), title: 'Düzenle', hover: 'hover:bg-blue-600' },
                        ].map(({ icon, onClick, title, hover }) => (
                          <motion.button key={title} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            onClick={onClick} title={title}
                            className={`w-8 h-8 flex items-center justify-center bg-gray-800 ${hover} rounded-lg text-gray-300 hover:text-white transition-colors`}>
                            {icon}
                          </motion.button>
                        ))}
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} title="Sil"
                          className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-600 disabled:opacity-50 rounded-lg text-gray-300 hover:text-white transition-colors">
                          {deletingId === product.id
                            ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    </div>
  )
}

function ProductForm({
  form, setForm, error, loading, onCancel, submitLabel
}: {
  form: { name: string; quantity: string; critical_threshold: string; unit: string }
  setForm: (f: any) => void
  error: string
  loading: boolean
  onCancel: () => void
  submitLabel: string
}) {
  const UNITS = ['adet', 'kg', 'litre', 'cl', 'kutu', 'paket', 'metre']
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Ürün Adı</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Örn: A4 Kağıt"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Mevcut Miktar</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
            min="0"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Kritik Eşik</label>
          <input
            type="number"
            value={form.critical_threshold}
            onChange={(e) => setForm({ ...form, critical_threshold: e.target.value })}
            required
            min="0"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Birim</label>
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-3 py-2 text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl transition-colors flex items-center gap-1.5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={14} />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

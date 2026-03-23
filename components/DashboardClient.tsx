'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Package, Plus, LogOut, AlertTriangle, CheckCircle,
  Pencil, Trash2, X, Save, TrendingDown, TrendingUp, BarChart3
} from 'lucide-react'
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

const UNITS = ['adet', 'kg', 'litre', 'kutu', 'paket', 'metre']

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Package size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg">StokTakip</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">{displayName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg"
            >
              <LogOut size={15} />
              <span className="hidden sm:block">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <BarChart3 size={14} />
              Toplam Ürün
            </div>
            <p className="text-2xl font-bold">{totalProducts}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
              <CheckCircle size={14} />
              Yeterli Stok
            </div>
            <p className="text-2xl font-bold text-green-400">{okCount}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-red-400 text-xs mb-2">
              <AlertTriangle size={14} />
              Kritik Stok
            </div>
            <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
          </div>
        </div>

        {/* Add Button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-300">Ürünler</h2>
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); resetForm() }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={16} />
            Ürün Ekle
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-gray-900 border border-blue-500/30 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Yeni Ürün Ekle</h3>
              <button onClick={() => { setShowAddForm(false); resetForm() }} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd}>
              <ProductForm form={form} setForm={setForm} error={error} loading={loading} onCancel={() => { setShowAddForm(false); resetForm() }} submitLabel="Ekle" />
            </form>
          </div>
        )}

        {/* Product List */}
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz ürün eklenmedi.</p>
            <p className="text-xs mt-1">Yukarıdaki "Ürün Ekle" butonunu kullanın.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(product => {
              const isCritical = product.quantity <= product.critical_threshold
              const isEditing = editingId === product.id
              const percentage = product.critical_threshold > 0
                ? Math.min(100, Math.round((product.quantity / (product.critical_threshold * 3)) * 100))
                : 100

              if (isEditing) {
                return (
                  <div key={product.id} className="bg-gray-900 border border-blue-500/30 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-sm">Düzenle</h3>
                      <button onClick={() => { setEditingId(null); resetForm() }} className="text-gray-500 hover:text-gray-300">
                        <X size={18} />
                      </button>
                    </div>
                    <form onSubmit={handleUpdate}>
                      <ProductForm form={form} setForm={setForm} error={error} loading={loading} onCancel={() => { setEditingId(null); resetForm() }} submitLabel="Kaydet" />
                    </form>
                  </div>
                )
              }

              return (
                <div
                  key={product.id}
                  className={`bg-gray-900 border rounded-2xl p-4 transition-colors ${isCritical ? 'border-red-500/40' : 'border-gray-800'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isCritical && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                        <h3 className="font-semibold truncate">{product.name}</h3>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <span>
                          Stok: <span className={`font-bold ${isCritical ? 'text-red-400' : 'text-white'}`}>
                            {product.quantity} {product.unit}
                          </span>
                        </span>
                        <span>Eşik: <span className="text-gray-300">{product.critical_threshold} {product.unit}</span></span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1">
                        <div
                          className={`h-1.5 rounded-full transition-all ${isCritical ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                        />
                      </div>
                      {isCritical && (
                        <p className="text-xs text-red-400 mt-1">Kritik seviyede veya altında!</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Quick quantity buttons */}
                      <button
                        onClick={() => handleQuantityChange(product, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
                        title="1 azalt"
                      >
                        <TrendingDown size={14} />
                      </button>
                      <button
                        onClick={() => handleQuantityChange(product, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
                        title="1 artır"
                      >
                        <TrendingUp size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-blue-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-red-600 disabled:opacity-50 rounded-lg text-gray-300 hover:text-white transition-colors"
                        title="Sil"
                      >
                        {deletingId === product.id
                          ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
  const UNITS = ['adet', 'kg', 'litre', 'kutu', 'paket', 'metre']
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

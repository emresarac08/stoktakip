'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts'
import { useTheme } from 'next-themes'

interface Product {
  id: string
  name: string
  quantity: number
  critical_threshold: number
  category: string
  subcategory: string
}

interface StockMovement {
  id: string
  quantity_change: number
  quantity_after: number
  created_at: string
}

interface Props {
  products: Product[]
  movements: StockMovement[]
}

const CATEGORY_COLORS: Record<string, string> = {
  'Soft İçecekler': '#3b82f6',
  'Alkollü İçecekler': '#8b5cf6',
  'Diğer': '#6b7280',
}

export default function StockCharts({ products, movements }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const axisColor = isDark ? '#6b7280' : '#9ca3af'
  const gridColor = isDark ? '#1f2937' : '#f3f4f6'
  const tooltipBg = isDark ? '#1f2937' : '#ffffff'
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb'
  const tooltipText = isDark ? '#f9fafb' : '#111827'

  // Bar chart — top 12 ürün stok durumu
  const barData = products
    .slice(0, 12)
    .map(p => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
      Mevcut: p.quantity,
      Kritik: p.critical_threshold,
    }))

  // Pie chart — kategori dağılımı
  const categoryMap: Record<string, number> = {}
  products.forEach(p => {
    const cat = p.category || 'Diğer'
    categoryMap[cat] = (categoryMap[cat] || 0) + 1
  })
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }))
  const pieColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

  // Line chart — son 7 günlük hareket trendi
  const now = Date.now()
  const dayLabels: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    const key = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    dayLabels[key] = 0
  }
  movements.forEach(m => {
    const d = new Date(m.created_at)
    const key = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    if (key in dayLabels) {
      dayLabels[key] += Math.abs(m.quantity_change)
    }
  })
  const lineData = Object.entries(dayLabels).map(([tarih, işlem]) => ({ tarih, işlem }))

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: 8,
    color: tooltipText,
    fontSize: 12,
  }

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Stok Seviyeleri</p>
        {barData.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Henüz ürün yok</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
              <Bar dataKey="Mevcut" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Kritik" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie + Line */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Kategori Dağılımı</p>
          {pieData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Henüz veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line Chart */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Son 7 Gün İşlem</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="tarih" tick={{ fill: axisColor, fontSize: 10 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="işlem" stroke="#10b981" strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

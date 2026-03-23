'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, UserPlus, Eye, EyeOff, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalıdır.'); setLoading(false); return }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          full_name: name,
          business_name: businessName,
        }
      },
    })

    if (!error && data.user && !data.session) {
      setError('Kayıt başarılı! Lütfen e-postanızı doğrulayın.')
      setLoading(false)
      return
    }
    if (error) {
      setError(error.message === 'User already registered' ? 'Bu e-posta zaten kayıtlı.' : 'Kayıt sırasında hata oluştu.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const fields = [
    { label: 'Ad Soyad', type: 'text', value: name, set: setName, placeholder: 'Ahmet Yılmaz', delay: 0.3 },
    { label: 'İşletme / Mekan Adı', type: 'text', value: businessName, set: setBusinessName, placeholder: 'Örn: Cafe Merkez', delay: 0.35, icon: <Building2 size={14} className="text-gray-500" /> },
    { label: 'E-posta', type: 'email', value: email, set: setEmail, placeholder: 'ornek@email.com', delay: 0.4 },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale: [1,1.2,1], opacity: [0.1,0.2,0.1] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        <motion.div animate={{ scale: [1,1.15,1], opacity: [0.08,0.15,0.08] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10">

        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <motion.div whileHover={{ rotate: -10, scale: 1.1 }} className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
              <Package size={32} className="text-white" />
            </motion.div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">StokTakip</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Yeni hesap oluşturun</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-50 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
            {fields.map(({ label, type, value, set, placeholder, delay, icon }) => (
              <motion.div key={label} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{label}</label>
                <div className="relative">
                  {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
                  <input type={type} value={value} onChange={e => set(e.target.value)} required placeholder={placeholder}
                    className={`w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl ${icon ? 'pl-9' : 'px-4'} pr-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all`} />
                </div>
              </motion.div>
            ))}

            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Şifre</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 pr-11 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="En az 6 karakter" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className={`border rounded-xl px-4 py-2.5 text-sm ${error.includes('başarılı') ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700/50 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700/50 text-red-600 dark:text-red-400'}`}>
                {error}
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={18} />Kayıt Ol</>}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-4">
            Zaten hesabınız var mı?{' '}
            <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium">Giriş Yap</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

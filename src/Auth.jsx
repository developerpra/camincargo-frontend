import { useState } from 'react'
import { login, signup } from './api/auth'

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login({ email, phoneNumber, password })
      } else {
        await signup({ customerName: name, email, phoneNumber, address, password })
      }
      onAuthenticated?.()
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50 p-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-800 text-center">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {mode === 'signup' && (
            <>
              <input type="text" placeholder="Customer name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              <input type="text" placeholder="Phone number" value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              <input type="text" placeholder="Address" value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
            </>
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="text" placeholder="Phone number" value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} type="submit" className="w-full px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Sign up (password optional)')}
          </button>
        </form>
        <div className="px-6 pb-3 text-center text-sm text-slate-600">
          {mode === 'login' ? (
            <span>Don&apos;t have an account? <button className="text-emerald-700 hover:underline" onClick={()=>setMode('signup')}>Sign up</button></span>
          ) : (
            <span>Already have an account? <button className="text-emerald-700 hover:underline" onClick={()=>setMode('login')}>Sign in</button></span>
          )}
        </div>
        <div className="px-6 pb-6 text-center text-xs text-slate-500">
          <a href="/products" className="hover:underline">Skip and view products</a>
        </div>
      </div>
    </div>
  )
}



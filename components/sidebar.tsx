'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Calculator,
  ShieldCheck,
  ChevronRight,
  Zap,
  BarChart2,
  Users,
  GitFork,
  LogOut,
  X,
} from 'lucide-react'

const NAV = [
  { href: '/visao-geral',   label: 'Visão Geral',      icon: LayoutDashboard, desc: 'KPIs consolidados' },
  { href: '/tempo-real',    label: 'Tempo Real',       icon: Activity,        desc: 'Funil ao vivo' },
  { href: '/trafego',       label: 'Tráfego Meta',     icon: BarChart2,       desc: 'Captação · Aquecimento · Venda' },
  { href: '/forecasting',   label: 'Forecasting',      icon: TrendingUp,      desc: 'Projeções e comparativos' },
  { href: '/perfil',        label: 'Perfil Comprador', icon: Users,           desc: 'Formação · Renda · Perfil' },
  { href: '/financeiro',    label: 'DRE Dinâmico',     icon: DollarSign,      desc: 'Conciliação financeira' },
  { href: '/recuperacao',   label: 'Recuperação',      icon: RefreshCw,       desc: 'Inadimplência e chargeback' },
  { href: '/funil',         label: 'Canvas de Funil',  icon: GitFork,         desc: 'Visualização do funil' },
  { href: '/simulador',     label: 'Simulador',        icon: Calculator,      desc: 'Forecasting Preditivo' },
  { href: '/auditoria',     label: 'Auditoria',        icon: ShieldCheck,     desc: 'Qualidade dos dados' },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-800 bg-gray-950">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
          <Zap size={14} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold tracking-tight text-white">Launch</p>
          <p className="text-[10px] text-gray-500">Analytics v2.0</p>
        </div>
        {/* Botão fechar — só aparece no mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 md:hidden"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all
                ${active
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 border border-transparent'
                }
              `}
            >
              <item.icon size={15} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{item.label}</p>
              </div>
              {active && <ChevronRight size={11} className="shrink-0 text-emerald-500" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-800/60 hover:text-red-400 transition-all text-xs"
        >
          <LogOut size={13} className="shrink-0" />
          <span>Sair</span>
        </button>
        <p className="text-[10px] text-gray-700 text-center">Supabase · sxoebppeutexyaljxucr</p>
      </div>
    </aside>
  )
}

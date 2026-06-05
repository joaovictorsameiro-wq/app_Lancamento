'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle, Database, RefreshCw } from 'lucide-react'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_number, fmt_pct } from '../../../lib/format'

interface AuditoriaData {
  trafegoRecente: { ultima_data: string; horas_atraso: number } | null
  leadsUtmVazias: { sem_utm: number; total: number } | null
  compradoresDuplicados: { duplicados: number } | null
  contagens: {
    totalTrafego: number
    totalLeads: number
    totalCompradores: number
    totalAvatar: number
  }
}

interface CheckItem {
  id: string
  label: string
  desc: string
  status: 'ok' | 'warning' | 'error' | 'loading'
  value?: string
}

export default function AuditoriaPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [data, setData] = useState<AuditoriaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = () => {
    if (!lancamentoId) return
    setLoading(true)
    const url = `/api/auditoria${lancamentoId ? `?id=${lancamentoId}` : ''}`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLastUpdate(new Date())
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [lancamentoId])

  const checks: CheckItem[] = data ? [
    {
      id: 'trafego_atualizado',
      label: 'Tráfego atualizado recentemente',
      desc: data.trafegoRecente
        ? `Último registro: ${new Date(data.trafegoRecente.ultima_data).toLocaleDateString('pt-BR')}`
        : 'Sem dados de tráfego',
      status: data.trafegoRecente == null
        ? 'error'
        : data.trafegoRecente.horas_atraso > 48
        ? 'error'
        : data.trafegoRecente.horas_atraso > 24
        ? 'warning'
        : 'ok',
      value: data.trafegoRecente
        ? `${data.trafegoRecente.horas_atraso}h atrás`
        : 'N/A',
    },
    {
      id: 'leads_utm',
      label: 'Leads com UTM Source preenchida',
      desc: data.leadsUtmVazias
        ? `${fmt_number(data.leadsUtmVazias.sem_utm)} leads sem UTM de ${fmt_number(data.leadsUtmVazias.total)} total`
        : 'Sem dados',
      status: !data.leadsUtmVazias
        ? 'ok'
        : data.leadsUtmVazias.total === 0
        ? 'ok'
        : (data.leadsUtmVazias.sem_utm / data.leadsUtmVazias.total) > 0.3
        ? 'error'
        : (data.leadsUtmVazias.sem_utm / data.leadsUtmVazias.total) > 0.1
        ? 'warning'
        : 'ok',
      value: data.leadsUtmVazias && data.leadsUtmVazias.total > 0
        ? fmt_pct((1 - data.leadsUtmVazias.sem_utm / data.leadsUtmVazias.total) * 100, 1)
        : '—',
    },
    {
      id: 'compradores_duplicados',
      label: 'Sem compradores duplicados',
      desc: data.compradoresDuplicados
        ? `${data.compradoresDuplicados.duplicados} email(s) com mais de uma compra`
        : 'Sem dados',
      status: !data.compradoresDuplicados || data.compradoresDuplicados.duplicados === 0 ? 'ok' : 'warning',
      value: String(data.compradoresDuplicados?.duplicados ?? 0),
    },
    {
      id: 'trafego_volume',
      label: 'Volume de registros de tráfego',
      desc: `${fmt_number(data.contagens.totalTrafego)} registros históricos na tabela trafego_meta`,
      status: data.contagens.totalTrafego > 100 ? 'ok' : data.contagens.totalTrafego > 0 ? 'warning' : 'error',
      value: fmt_number(data.contagens.totalTrafego),
    },
    {
      id: 'leads_volume',
      label: 'Volume de leads captados',
      desc: `${fmt_number(data.contagens.totalLeads)} leads na base de dados`,
      status: data.contagens.totalLeads > 50 ? 'ok' : data.contagens.totalLeads > 0 ? 'warning' : 'error',
      value: fmt_number(data.contagens.totalLeads),
    },
    {
      id: 'avatar_vs_leads',
      label: 'Taxa de resposta do Avatar',
      desc: `${fmt_number(data.contagens.totalAvatar)} respostas de ${fmt_number(data.contagens.totalLeads)} leads`,
      status: data.contagens.totalLeads === 0
        ? 'error'
        : (data.contagens.totalAvatar / data.contagens.totalLeads) > 0.3
        ? 'ok'
        : (data.contagens.totalAvatar / data.contagens.totalLeads) > 0.1
        ? 'warning'
        : 'error',
      value: data.contagens.totalLeads > 0
        ? fmt_pct((data.contagens.totalAvatar / data.contagens.totalLeads) * 100, 1)
        : '—',
    },
  ] : []

  const statusCount = { ok: 0, warning: 0, error: 0 }
  checks.forEach(c => { statusCount[c.status as 'ok' | 'warning' | 'error']++ })
  const score = checks.length > 0
    ? Math.round((statusCount.ok / checks.length) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            Auditoria & Qualidade dos Dados
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Monitoramento de pipelines · integridade dos dados · alertas técnicos</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              {lastUpdate.toLocaleTimeString('pt-BR')}
            </button>
          )}
          <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
        </div>
      </div>

      {/* Score geral */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className={`rounded-xl border p-5 flex items-center gap-4 ${score >= 80 ? 'border-emerald-500/30 bg-emerald-500/5' : score >= 50 ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className={`text-4xl font-black tabular-nums ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {score}
          </div>
          <div>
            <p className="text-xs text-gray-400">Score de Qualidade</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {statusCount.ok} OK · {statusCount.warning} aviso · {statusCount.error} erro
            </p>
          </div>
        </div>

        {[
          { label: 'Registros Tráfego', value: data ? fmt_number(data.contagens.totalTrafego) : '—', icon: Database },
          { label: 'Total Leads', value: data ? fmt_number(data.contagens.totalLeads) : '—', icon: Database },
          { label: 'Compradores', value: data ? fmt_number(data.contagens.totalCompradores) : '—', icon: Database },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
            <div className="flex items-center gap-2 mb-2">
              <item.icon size={13} className="text-gray-500" />
              <p className="text-xs text-gray-400">{item.label}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Verificações de Integridade</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : checks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Selecione um lançamento para verificar a integridade dos dados</p>
        ) : (
          <div className="space-y-2">
            {checks.map(check => {
              const isOk = check.status === 'ok'
              const isWarning = check.status === 'warning'
              const isError = check.status === 'error'

              return (
                <div
                  key={check.id}
                  className={`flex items-center gap-3 rounded-xl p-3 border
                    ${isOk ? 'border-gray-800 bg-gray-800/30'
                    : isWarning ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  {isOk
                    ? <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    : isWarning
                    ? <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    : <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${isOk ? 'text-gray-200' : isWarning ? 'text-amber-200' : 'text-red-200'}`}>
                      {check.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{check.desc}</p>
                  </div>
                  {check.value && (
                    <span className={`text-xs font-bold tabular-nums shrink-0 ${isOk ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-red-400'}`}>
                      {check.value}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dicas de resolução */}
      {data && (statusCount.warning > 0 || statusCount.error > 0) && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Recomendações</h2>
          <div className="space-y-2 text-xs text-gray-400">
            {data.trafegoRecente && data.trafegoRecente.horas_atraso > 24 && (
              <p className="flex gap-2"><span className="text-amber-400">→</span> Verifique se o workflow n8n de sincronização do Meta Ads está ativo e sem erros.</p>
            )}
            {data.leadsUtmVazias && data.leadsUtmVazias.total > 0 && (data.leadsUtmVazias.sem_utm / data.leadsUtmVazias.total) > 0.1 && (
              <p className="flex gap-2"><span className="text-amber-400">→</span> Muitos leads sem UTM — verifique se os parâmetros UTM estão configurados nos links de captura.</p>
            )}
            {data.compradoresDuplicados && data.compradoresDuplicados.duplicados > 0 && (
              <p className="flex gap-2"><span className="text-amber-400">→</span> Existem emails com mais de uma compra registrada — pode indicar reprocessamento de webhook ou compras legítimas múltiplas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

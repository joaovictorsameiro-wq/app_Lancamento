'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import KpiCard from '../../../components/kpi-card'
import DataTable from '../../../components/data-table'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency, fmt_number, fmt_date } from '../../../lib/format'
import type { StatusCount, RecuperacaoRow } from '../../../lib/db/compradores'

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  aprovado:  { color: '#10b981', icon: CheckCircle,    label: 'Aprovado' },
  pendente:  { color: '#f59e0b', icon: Clock,          label: 'Pendente' },
  cancelado: { color: '#ef4444', icon: XCircle,        label: 'Cancelado' },
  atrasado:  { color: '#f97316', icon: AlertTriangle,  label: 'Atrasado' },
  chargeback:{ color: '#dc2626', icon: AlertTriangle,  label: 'Chargeback' },
}

export default function RecuperacaoPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [statusData, setStatusData] = useState<StatusCount[]>([])
  const [pipeline, setPipeline] = useState<RecuperacaoRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/compradores?id=${lancamentoId}&view=status`).then(r => r.json()),
      fetch(`/api/compradores?id=${lancamentoId}&view=recuperacao`).then(r => r.json()),
    ]).then(([status, recup]) => {
      setStatusData(status)
      setPipeline(recup)
    }).finally(() => setLoading(false))
  }, [lancamentoId])

  // Agregar por status
  const porStatus = statusData.reduce<Record<string, { quantidade: number; valor: number }>>((acc, s) => {
    const key = s.status || 'desconhecido'
    acc[key] = acc[key] || { quantidade: 0, valor: 0 }
    acc[key].quantidade += s.quantidade
    acc[key].valor += s.valor_bruto_total
    return acc
  }, {})

  const totalAprovado = porStatus['aprovado']?.valor ?? 0
  const totalPendente = porStatus['pendente']?.valor ?? 0
  const totalCancelado = (porStatus['cancelado']?.valor ?? 0) + (porStatus['chargeback']?.valor ?? 0)
  const totalRecuperavel = totalPendente + (porStatus['atrasado']?.valor ?? 0)

  const pieData = Object.entries(porStatus).map(([status, dados]) => ({
    name: STATUS_CONFIG[status]?.label ?? status,
    value: dados.valor,
    color: STATUS_CONFIG[status]?.color ?? '#6b7280',
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <RefreshCw size={18} className="text-amber-400" />
            Recuperação & Inadimplência
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Pipeline de recuperação · status de pagamentos · chargebacks</p>
        </div>
        <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard title="Receita Aprovada" value={fmt_currency(totalAprovado, true)} accent="emerald" icon={CheckCircle} loading={loading} />
        <KpiCard title="Recuperável" value={fmt_currency(totalRecuperavel, true)} accent="amber" icon={Clock} loading={loading} />
        <KpiCard title="Pendentes" value={fmt_number(porStatus['pendente']?.quantidade ?? 0)} subtitle={fmt_currency(totalPendente, true)} accent="amber" loading={loading} />
        <KpiCard title="Cancelado / CB" value={fmt_currency(totalCancelado, true)} accent="red" icon={XCircle} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Pizza de status */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Distribuição por Status</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }}
                  formatter={(v: number) => [fmt_currency(v, true), 'Valor']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">{loading ? 'Carregando...' : 'Selecione um lançamento'}</p>
          )}

          {/* Tabela de status */}
          <div className="mt-3 space-y-2">
            {Object.entries(porStatus).map(([status, dados]) => {
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['cancelado']
              return (
                <div key={status} className="flex items-center gap-2">
                  <cfg.icon size={12} style={{ color: cfg.color }} />
                  <span className="text-xs text-gray-400 flex-1">{cfg.label}</span>
                  <span className="text-xs tabular-nums text-white">{fmt_number(dados.quantidade)}x</span>
                  <span className="text-xs tabular-nums text-gray-300 w-20 text-right">{fmt_currency(dados.valor, true)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pipeline de recuperação */}
        <div className="lg:col-span-3 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Pipeline de Recuperação</h2>
          <p className="text-xs text-gray-500 mb-4">Transações pendentes, canceladas, em atraso e chargebacks</p>
          <DataTable
            loading={loading}
            columns={[
              { key: 'nome', label: 'Nome', render: r => <span className="text-xs">{(r.nome as string)?.slice(0, 20) || r.email as string}</span> },
              {
                key: 'status_pagamento', label: 'Status',
                render: r => {
                  const cfg = STATUS_CONFIG[r.status_pagamento as string] ?? STATUS_CONFIG['cancelado']
                  return (
                    <span className="flex items-center gap-1 text-xs" style={{ color: cfg.color }}>
                      <cfg.icon size={10} /> {cfg.label}
                    </span>
                  )
                }
              },
              { key: 'metodo_pagamento', label: 'Método', render: r => <span className="text-xs capitalize">{r.metodo_pagamento as string}</span> },
              { key: 'valor_bruto', label: 'Valor', align: 'right', sortable: true, render: r => fmt_currency(r.valor_bruto as number) },
              { key: 'data_compra', label: 'Data', render: r => <span className="text-xs text-gray-400">{fmt_date(r.data_compra as string)}</span> },
            ]}
            data={pipeline as unknown as Record<string, unknown>[]}
            emptyMessage="Nenhuma transação pendente de recuperação."
          />
        </div>
      </div>
    </div>
  )
}

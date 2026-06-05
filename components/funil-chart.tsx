'use client'

import { fmt_number, fmt_pct } from '../lib/format'

interface FunilStage {
  label: string
  value: number
  color: string
}

interface FunilChartProps {
  investimento: number
  leads: number
  avatar: number
  compradores: number
  faturamento: number
}

export default function FunilChart({ investimento, leads, avatar, compradores, faturamento }: FunilChartProps) {
  const stages: FunilStage[] = [
    { label: 'Leads Captados', value: leads, color: '#3b82f6' },
    { label: 'Responderam Avatar', value: avatar, color: '#8b5cf6' },
    { label: 'Compradores', value: compradores, color: '#10b981' },
  ]

  const maxVal = leads || 1

  return (
    <div className="space-y-2">
      {/* Investimento no topo */}
      <div className="flex items-center gap-3">
        <div className="w-32 text-right text-xs text-gray-400">Investimento</div>
        <div className="flex-1 relative h-10 flex items-center">
          <div className="w-full h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center px-3">
            <span className="text-xs font-medium text-amber-400">
              R$ {fmt_number(investimento, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Funil stages */}
      {stages.map((stage, i) => {
        const width = Math.max((stage.value / maxVal) * 100, 5)
        const prevVal = i === 0 ? leads : stages[i - 1].value
        const taxa = prevVal > 0 ? (stage.value / prevVal) * 100 : 0

        return (
          <div key={stage.label} className="flex items-center gap-3">
            <div className="w-32 text-right text-xs text-gray-400">{stage.label}</div>
            <div className="flex-1 relative h-10">
              <div
                className="h-10 rounded-lg flex items-center px-3 transition-all"
                style={{
                  width: `${width}%`,
                  background: `${stage.color}22`,
                  border: `1px solid ${stage.color}44`,
                }}
              >
                <span className="text-xs font-bold text-white">{fmt_number(stage.value)}</span>
              </div>
              {i > 0 && (
                <span className="absolute left-0 -top-4 text-xs text-gray-500 ml-1">
                  ↓ {fmt_pct(taxa)} do anterior
                </span>
              )}
            </div>
          </div>
        )
      })}

      {/* Faturamento no fundo */}
      <div className="flex items-center gap-3 mt-1">
        <div className="w-32 text-right text-xs text-gray-400">Faturamento</div>
        <div className="flex-1">
          <div
            className="h-10 rounded-lg flex items-center px-3"
            style={{
              width: `${Math.max((compradores / maxVal) * 100, 5)}%`,
              background: '#10b98122',
              border: '1px solid #10b98144',
            }}
          >
            <span className="text-xs font-bold text-emerald-400">
              R$ {fmt_number(faturamento, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Conversão final */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-800/60 p-2 text-center">
          <p className="text-xs text-gray-400">CPL</p>
          <p className="text-sm font-bold text-white">
            R$ {investimento > 0 && leads > 0 ? fmt_number(investimento / leads, 2) : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800/60 p-2 text-center">
          <p className="text-xs text-gray-400">Conversão</p>
          <p className="text-sm font-bold text-white">
            {leads > 0 ? fmt_pct((compradores / leads) * 100, 2) : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800/60 p-2 text-center">
          <p className="text-xs text-gray-400">ROI</p>
          <p className={`text-sm font-bold ${investimento > 0 && faturamento / investimento > 1 ? 'text-emerald-400' : 'text-red-400'}`}>
            {investimento > 0 ? `${fmt_number((faturamento / investimento - 1) * 100, 1)}%` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

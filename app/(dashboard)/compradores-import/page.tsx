'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Upload, CheckCircle2, AlertCircle, Loader2, History } from 'lucide-react'
import type { ResultadoImportacaoCompradores } from '../../../lib/db/compradores-import'

type Historico = { arquivo_nome: string; importado_em: string; linhas: number }

export default function CompradoresImportPage() {
  const [historico, setHistorico] = useState<Historico[]>([])
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImportacaoCompradores | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const carregarHistorico = useCallback(async () => {
    const r = await fetch('/api/compradores/marcar').then(r => r.json())
    setHistorico(Array.isArray(r) ? r : [])
  }, [])

  useEffect(() => { carregarHistorico() }, [carregarHistorico])

  async function enviarArquivo(file: File) {
    setEnviando(true)
    setErro(null)
    setResultado(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch('/api/compradores/marcar', { method: 'POST', body: form })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Erro ao importar')
      setResultado(d)
      await carregarHistorico()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao importar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Upload size={18} className="text-emerald-400" />
          Marcar Compradores (por e-mail)
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Suba uma lista com os e-mails de quem comprou (.xlsx ou .csv, qualquer coluna — pode deixar só o e-mail).
          Pra cada e-mail encontrado em <code className="text-emerald-400">leads</code>, marca <code className="text-emerald-400">virou_comprador = true</code> em
          todas as linhas correspondentes (qualquer lançamento). Não duplica: quem já estava marcado simplesmente não muda.
        </p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setArrastando(true) }}
        onDragLeave={() => setArrastando(false)}
        onDrop={e => {
          e.preventDefault()
          setArrastando(false)
          const file = e.dataTransfer.files?.[0]
          if (file) enviarArquivo(file)
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          arrastando ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) enviarArquivo(f) }}
        />
        {enviando ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
            <p className="text-sm">Importando...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload size={24} />
            <p className="text-sm">Arraste o arquivo aqui ou clique para escolher</p>
            <p className="text-xs text-gray-600">.xlsx ou .csv</p>
          </div>
        )}
      </div>

      {erro && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {resultado && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <p className="text-sm text-emerald-400 flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} /> Importação concluída
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Stat label="E-mails no arquivo" value={resultado.totalEmailsNoArquivo} />
            <Stat label="Marcados agora" value={resultado.leadsMarcadosAgora} highlight="emerald" />
            <Stat label="Já estavam marcados" value={resultado.leadsJaMarcados} />
            <Stat label="Sem lead correspondente" value={resultado.emailsNaoEncontrados} />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <History size={13} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Histórico de importações</p>
        </div>
        <div className="space-y-1.5">
          {historico.length === 0 && <p className="text-xs text-gray-600">Nenhuma importação ainda</p>}
          {historico.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs border-b border-gray-800/60 pb-1.5">
              <span className="text-gray-300 truncate max-w-xs" title={h.arquivo_nome}>{h.arquivo_nome}</span>
              <span className="text-gray-500">{h.linhas} e-mails</span>
              <span className="text-gray-600">{new Date(h.importado_em).toLocaleString('pt-BR')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: 'emerald' }) {
  const color = highlight === 'emerald' ? 'text-emerald-400' : 'text-gray-200'
  return (
    <div className="rounded-lg bg-gray-950/50 border border-gray-800 p-2.5">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-gray-500">{label}</p>
    </div>
  )
}

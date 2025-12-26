import { useEffect, useRef, useState } from 'react'
import { supabase } from "../lib/supabaseClient";

type MemberRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  card_uid: string | null
}

export default function SearchGlobal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (m: MemberRow) => void
}) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<MemberRow[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
    else {
      setQ('')
      setRows([])
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const run = async () => {
      if (!q.trim()) { setRows([]); return }
      setLoading(true)

      let out: MemberRow[] = []
      try {
        const rpc = await supabase.rpc('search_everywhere', { q })
        if (!rpc.error && rpc.data) out = rpc.data as MemberRow[]
      } catch (_) {}

      if (out.length === 0) {
        const { data } = await supabase
          .from('members')
          .select('id, first_name, last_name, email, phone, card_uid')
          .or([
            `first_name.ilike.%${q}%`,
            `last_name.ilike.%${q}%`,
            `email.ilike.%${q}%`,
            `phone.ilike.%${q}%`,
            `card_uid.ilike.%${q}%`,
          ].join(','))
          .order('last_scan_at', { ascending: false })
          .limit(20)
        if (data) out = data
      }
      setRows(out)
      setLoading(false)
    }
    const t = setTimeout(run, 200)
    return () => clearTimeout(t)
  }, [q, open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="mx-auto mt-24 max-w-xl rounded-2xl bg-[#0F2548] p-4 shadow-xl"
           onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Nom, email, téléphone ou carte…"
          className="w-full rounded-lg bg-[#0b1b33] px-4 py-3 text-white outline-none"
        />
        <div className="mt-3 max-h-80 overflow-auto">
          {loading && <div className="p-3 text-sm opacity-70">Recherche…</div>}
          {!loading && rows.length === 0 && q && (
            <div className="p-3 text-sm opacity-70">Aucun résultat</div>
          )}
          {rows.map(r => (
            <button key={r.id}
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5"
              onClick={() => { onSelect(r); onClose() }}>
              <div className="text-white font-medium">
                {(r.first_name ?? '') + ' ' + (r.last_name ?? '')}
              </div>
              <div className="text-xs opacity-70">
                {r.email ?? '—'} · {r.phone ?? '—'} · {r.card_uid ?? '—'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
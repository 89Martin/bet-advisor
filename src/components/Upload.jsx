import React, { useRef, useState, useCallback } from 'react'
import { parseCSV } from '../lib/parse'
import { Card } from './ui'

export default function Upload({ onLoaded }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const dataset = await parseCSV(file)
      if (!dataset.bets.length) {
        setError('No bets could be read from that file. Make sure it is a CSV export with a header row.')
        setBusy(false)
        return
      }
      onLoaded(dataset, file.name)
    } catch (e) {
      setError(`Could not parse the file: ${e.message || e}`)
      setBusy(false)
    }
  }, [onLoaded])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center mb-8 fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Betting Advisor
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-50">
          Know which bets to <span className="text-emerald-400">hammer</span>,
          <br className="hidden sm:block" /> and which to cut.
        </h1>
        <p className="mt-4 text-slate-400 max-w-xl mx-auto">
          Upload your PIKKIT CSV export. We clean the data, break down every angle of your
          betting, and tell you in plain English where your real edges are.
        </p>
      </div>

      <Card
        className={`w-full max-w-2xl p-10 text-center transition-colors cursor-pointer fade-up ${
          dragging ? 'border-emerald-400/60 bg-emerald-500/[0.06]' : ''
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 text-2xl">
          {busy ? <Spinner /> : '↑'}
        </div>
        <div className="text-lg font-semibold text-slate-100">
          {busy ? 'Crunching your bets…' : 'Drop your CSV here'}
        </div>
        <div className="mt-1 text-sm text-slate-400">
          {busy ? 'Parsing, cleaning and grading every market.' : 'or click to browse — your data never leaves this browser.'}
        </div>
        {!busy && (
          <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors">
            Choose CSV file
          </button>
        )}
      </Card>

      {error && (
        <div className="mt-4 w-full max-w-2xl rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-8 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <Feature title="Auto-detects columns" body="Date, sport, odds, stake, result, sportsbook, closing line — matched automatically." />
        <Feature title="Grades every angle" body="Sport, market, odds range, stake size, singles vs parlays, props vs game lines." />
        <Feature title="Acts like an advisor" body="Hammer, Keep, Reduce, Cut, Watchlist — with plain-English next steps." />
      </div>

      <p className="mt-8 text-xs text-slate-500">
        100% local. Nothing is uploaded to any server — parsing happens entirely in your browser.
      </p>
    </div>
  )
}

function Feature({ title, body }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-1 text-xs text-slate-400 leading-relaxed">{body}</div>
    </Card>
  )
}

function Spinner() {
  return <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />
}

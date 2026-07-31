'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './kuitansi.module.css';

// ── helpers ─────────────────────────────────────────────────────────────────
const SATUAN = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan',
  'Sembilan','Sepuluh','Sebelas','Dua Belas','Tiga Belas','Empat Belas','Lima Belas',
  'Enam Belas','Tujuh Belas','Delapan Belas','Sembilan Belas'];

function terbilang(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'Nol';
  function t(x: number): string {
    if (x < 20) return SATUAN[x];
    if (x < 100) return (SATUAN[Math.floor(x/10)] + ' Puluh ' + SATUAN[x%10]).trim();
    if (x < 200) return ('Seratus ' + t(x-100)).trim();
    if (x < 1000) return (SATUAN[Math.floor(x/100)] + ' Ratus ' + t(x%100)).trim();
    if (x < 2000) return ('Seribu ' + t(x-1000)).trim();
    if (x < 1000000) return (t(Math.floor(x/1000)) + ' Ribu ' + t(x%1000)).trim();
    if (x < 1000000000) return (t(Math.floor(x/1000000)) + ' Juta ' + t(x%1000000)).trim();
    return (t(Math.floor(x/1000000000)) + ' Miliar ' + t(x%1000000000)).trim();
  }
  return t(n).replace(/\s+/g, ' ').trim();
}

function fmtRp(n: number) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
function fmtNum(n: number) { return Math.round(n).toLocaleString('id-ID'); }
function parseNum(s: string) { return parseInt(String(s).replace(/[^\d-]/g, ''), 10) || 0; }

const BULAN_IDX = ['januari','februari','maret','april','mei','juni','juli',
  'agustus','september','oktober','november','desember'];
const BULAN_CAP = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
  'Agustus','September','Oktober','November','Desember'];
const BULAN_ROM = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

function todayStr() {
  const d = new Date();
  return `${d.getDate()} ${BULAN_CAP[d.getMonth()]} ${d.getFullYear()}`;
}

function buildInvoiceNo(unit: string, noUrut: string, tanggal: string) {
  const parts = tanggal.trim().split(/\s+/);
  const mi = parts.length >= 2 ? BULAN_IDX.indexOf(parts[parts.length-2].toLowerCase()) : -1;
  const rom = mi >= 0 ? BULAN_ROM[mi] : BULAN_ROM[new Date().getMonth()];
  const yr = parts.length >= 1 ? parts[parts.length-1] : String(new Date().getFullYear());
  const urut = String(parseInt(noUrut, 10) || 0).padStart(4, '0');
  return `${urut}/KWT/AF-${unit}/${rom}/${yr}`;
}

function bulanTahun(tanggal: string) {
  const parts = tanggal.trim().split(/\s+/);
  return parts.length >= 2 ? parts.slice(-2).join(' ') : tanggal;
}

// ── kelas list ───────────────────────────────────────────────────────────────
const DEFAULT_KELAS: Record<string, string[]> = {
  SD: ["1A An Na'im", "1B Al Ma'wa", "1C Al Adn", "1D Darussalam"],
  SMP: ['Al Haytham', 'Al Khawarizmi', 'Ibnu Khaldun', 'Ibnu Rusyd', 'Ibnu Sina'],
};

function loadKelasList(unit: string): string[] {
  try {
    const l = JSON.parse(localStorage.getItem('afKelasList_' + unit) || 'null');
    return l && l.length ? l : [...DEFAULT_KELAS[unit]];
  } catch { return [...(DEFAULT_KELAS[unit] || [])]; }
}
function saveKelasList(unit: string, list: string[]) {
  localStorage.setItem('afKelasList_' + unit, JSON.stringify(list));
}

// ── types ────────────────────────────────────────────────────────────────────
interface Row { ket: string; jumlah: string; }
interface KuitansiState {
  papersize: string; unit: string; nama: string; kelas: string; noUrut: string;
  tanggal: string; status: string; potongan: string; potonganMode: string;
  untuk: string; rows: Row[];
}
interface HistoryItem {
  ts: string; noKwt: string; nama: string; jumlah: string; state: KuitansiState;
}

const UNTUK_OPTS = ['SPP', 'Uang Masuk / Uang Pangkal', 'Ekskul', 'UKT', 'Seragam'];

const DEFAULT_ROWS: Row[] = [
  { ket: 'SPP (Sumbangan Pembinaan Pendidikan)', jumlah: '0' },
  { ket: 'Uang Masuk / Uang Pangkal', jumlah: '0' },
  { ket: 'Ekskul (Kegiatan Ekstrakurikuler)', jumlah: '0' },
  { ket: 'UKT (Uang Kegiatan Tahunan)', jumlah: '0' },
];

// ── component ────────────────────────────────────────────────────────────────
export default function KuitansiApp() {
  const [unit, setUnit] = useState('SMP');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('Al Haytham');
  const [noUrut, setNoUrut] = useState('1');
  const [tanggal, setTanggal] = useState(() => todayStr());
  const [status, setStatus] = useState('LUNAS');
  const [papersize, setPapersize] = useState('A5');
  const [potongan, setPotongan] = useState('0');
  const [potonganMode, setPotonganMode] = useState('rp');
  const [untuk, setUntuk] = useState('');
  const [untukChecks, setUntukChecks] = useState([true, false, true, true, false]);
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [addingKelas, setAddingKelas] = useState(false);
  const [newKelasInput, setNewKelasInput] = useState('');
  const [kelasList, setKelasList] = useState<string[]>([]);

  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // load kelas list when unit changes
  useEffect(() => {
    const list = loadKelasList(unit);
    setKelasList(list);
    if (!list.includes(kelas)) setKelas(list[0] || '');
  }, [unit]); // eslint-disable-line react-hooks/exhaustive-deps

  // load from localStorage on mount
  useEffect(() => {
    const savedNoUrut = localStorage.getItem('afInvoiceNoUrut') || '1';
    setNoUrut(savedNoUrut);
    try {
      const draft: KuitansiState = JSON.parse(localStorage.getItem('afDraftState') || 'null');
      if (draft) {
        setPapersize(draft.papersize || 'A5');
        setUnit(draft.unit || 'SMP');
        setNama(draft.nama || '');
        setNoUrut(draft.noUrut || savedNoUrut);
        setTanggal(draft.tanggal || todayStr());
        setStatus(draft.status || 'LUNAS');
        setPotongan(draft.potongan || '0');
        setPotonganMode(draft.potonganMode || 'rp');
        setUntuk(draft.untuk || '');
        setRows(draft.rows || DEFAULT_ROWS);
        // set kelas after unit loads
        setTimeout(() => {
          const list = loadKelasList(draft.unit || 'SMP');
          setKelasList(list);
          setKelas(draft.kelas || list[0] || '');
        }, 0);
      }
    } catch { /* ignore */ }
    setHistory(loadHistory());
  }, []);

  // auto-rebuild "untuk" text when checkboxes or tanggal changes
  useEffect(() => {
    const checked = UNTUK_OPTS.filter((_, i) => untukChecks[i]);
    let text = '';
    if (checked.length === 1) text = checked[0];
    else if (checked.length > 1) text = checked.slice(0,-1).join(', ') + ' & ' + checked[checked.length-1];
    if (text) text += ' bulan ' + bulanTahun(tanggal);
    setUntuk(text);
  }, [untukChecks, tanggal]);

  // draft autosave
  const saveDraft = useCallback(() => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try {
        const s: KuitansiState = { papersize, unit, nama, kelas, noUrut, tanggal, status, potongan, potonganMode, untuk, rows };
        localStorage.setItem('afDraftState', JSON.stringify(s));
      } catch { /* ignore */ }
    }, 400);
  }, [papersize, unit, nama, kelas, noUrut, tanggal, status, potongan, potonganMode, untuk, rows]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  // fit sheet to scroll width
  useEffect(() => {
    const fit = () => {
      const wrap = sheetScrollRef.current;
      const sheet = sheetRef.current;
      if (!wrap || !sheet) return;
      sheet.style.transform = '';
      const natural = sheet.getBoundingClientRect().width;
      const avail = wrap.clientWidth - 32;
      const scale = avail < natural ? avail / natural : 1;
      if (scale < 1) {
        sheet.style.transform = `scale(${scale})`;
        wrap.style.minHeight = `${sheet.getBoundingClientRect().height * scale + 32}px`;
      } else {
        wrap.style.minHeight = '';
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [unit, papersize]);

  // ── computed ────────────────────────────────────────────────────────────────
  const subtotal = rows.reduce((s, r) => s + parseNum(r.jumlah), 0);
  const potonganAmt = potonganMode === 'pct'
    ? Math.round(subtotal * parseNum(potongan) / 100)
    : parseNum(potongan);
  const grand = subtotal - potonganAmt;
  const invoiceNo = buildInvoiceNo(unit, noUrut, tanggal);
  const terbilangText = terbilang(grand) + ' Rupiah';
  const nonZeroRows = rows.filter(r => parseNum(r.jumlah) > 0);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    'https://' + (unit === 'SD' ? 'sdialfakhir.sch.id' : 'smpialfakhir.sch.id')
  )}`;
  const sheetClass = [styles.sheet, papersize === 'A5' ? styles.a5 : papersize === 'A4' ? styles.a4l : ''].filter(Boolean).join(' ');

  // ── actions ─────────────────────────────────────────────────────────────────
  function handlePrint() {
    const origTitle = document.title;
    const cleanName = (nama || 'Siswa').replace(/[\\/:*?"<>|]+/g, '');
    const cleanTgl = tanggal.replace(/\s+/g, '-').replace(/[\\/:*?"<>|]+/g, '');
    document.title = `${cleanName} _${unit}_ ${cleanTgl}`;
    // save to history
    const newItem: HistoryItem = {
      ts: new Date().toISOString(),
      noKwt: invoiceNo,
      nama,
      jumlah: fmtRp(grand),
      state: { papersize, unit, nama, kelas, noUrut, tanggal, status, potongan, potonganMode, untuk, rows },
    };
    const newHistory = [newItem, ...history].slice(0, 500);
    setHistory(newHistory);
    localStorage.setItem('afKuitansiHistory', JSON.stringify(newHistory));
    // increment urut
    const next = String((parseInt(noUrut, 10) || 0) + 1);
    localStorage.setItem('afInvoiceNoUrut', next);
    setNoUrut(next);
    window.print();
    document.title = origTitle;
  }

  function restoreState(s: KuitansiState) {
    setPapersize(s.papersize || 'A5');
    setUnit(s.unit || 'SMP');
    setNama(s.nama || '');
    setNoUrut(s.noUrut || '1');
    setTanggal(s.tanggal || todayStr());
    setStatus(s.status || 'LUNAS');
    setPotongan(s.potongan || '0');
    setPotonganMode(s.potonganMode || 'rp');
    setUntuk(s.untuk || '');
    setRows(s.rows || DEFAULT_ROWS);
    const list = loadKelasList(s.unit || 'SMP');
    setKelasList(list);
    setKelas(s.kelas || list[0] || '');
    setShowHistory(false);
  }

  function addKelasFromInput() {
    const v = newKelasInput.trim();
    if (!v) return;
    const list = loadKelasList(unit);
    if (!list.includes(v)) { list.push(v); saveKelasList(unit, list); }
    setKelasList([...list]);
    setKelas(v);
    setAddingKelas(false);
    setNewKelasInput('');
  }

  function updateRow(i: number, field: keyof Row, val: string) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function removeRow(i: number) { setRows(rs => rs.filter((_, idx) => idx !== i)); }
  function addRow() { setRows(rs => [...rs, { ket: '', jumlah: '0' }]); }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Print page CSS — injected globally for @page rule */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #kuitansi-print-root { display: block !important; position: fixed; inset: 0; z-index: 9999; }
          .no-print, [data-no-print] { display: none !important; }
          ${papersize === 'A5' ? '@page{size:A5 landscape;margin:0;}' : '@page{size:A4 landscape;margin:0;}'}
        }
      `}</style>

      <div className="flex flex-col h-full" id="kuitansi-print-root">
        {/* ── TOOLBAR ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 overflow-y-auto" data-no-print="1">
          <div className="flex flex-wrap gap-3 mb-3">
            <div className="min-w-[120px]">
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Unit</label>
              <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Kertas</label>
              <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                value={papersize} onChange={e => setPapersize(e.target.value)}>
                <option value="A5">A5 landscape</option>
                <option value="A4">A4 landscape</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Nama Siswa</label>
              <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama siswa" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Kelas</label>
              {addingKelas ? (
                <input autoFocus className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                  value={newKelasInput} onChange={e => setNewKelasInput(e.target.value)}
                  placeholder="Nama kelas baru, Enter"
                  onKeyDown={e => { if (e.key === 'Enter') addKelasFromInput(); if (e.key === 'Escape') setAddingKelas(false); }}
                  onBlur={() => { if (newKelasInput.trim()) addKelasFromInput(); else setAddingKelas(false); }} />
              ) : (
                <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                  value={kelas} onChange={e => {
                    if (e.target.value === '__add__') { setAddingKelas(true); }
                    else if (e.target.value === '__none__') { setKelas(''); }
                    else setKelas(e.target.value);
                  }}>
                  <option value="__none__">Belum Ada Kelas (Siswa Baru)</option>
                  {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                  <option value="__add__">+ Tambah Kelas Baru</option>
                </select>
              )}
            </div>
            <div className="min-w-[150px]">
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Tanggal</label>
              <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                value={tanggal} onChange={e => setTanggal(e.target.value)} placeholder="22 Juli 2026" />
            </div>
            <div className="min-w-[120px]">
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</label>
              <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
                value={status} onChange={e => setStatus(e.target.value)}>
                <option value="LUNAS">LUNAS</option>
                <option value="BELUM LUNAS">BELUM LUNAS</option>
              </select>
            </div>
          </div>

          {/* Untuk checkboxes */}
          <div className="mb-3">
            <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Untuk Pembayaran</label>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
              {UNTUK_OPTS.map((opt, i) => (
                <label key={opt} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={untukChecks[i]}
                    onChange={e => setUntukChecks(cs => cs.map((c, idx) => idx === i ? e.target.checked : c))} />
                  {opt}
                </label>
              ))}
            </div>
            <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
              value={untuk} onChange={e => setUntuk(e.target.value)} placeholder="Keterangan untuk..." />
          </div>

          {/* Items table */}
          <table className="w-full mb-2 border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-white bg-teal-700 px-2 py-1.5 rounded-tl-md">Keterangan</th>
                <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-white bg-teal-700 px-2 py-1.5">Jumlah (Rp)</th>
                <th className="bg-teal-700 rounded-tr-md w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className="px-1 py-0.5">
                    <input className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:border-teal-600"
                      value={row.ket} onChange={e => updateRow(i, 'ket', e.target.value)} />
                  </td>
                  <td className="px-1 py-0.5 w-36">
                    <input className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:border-teal-600"
                      value={row.jumlah}
                      onFocus={e => { e.target.value = String(parseNum(e.target.value)); }}
                      onBlur={e => { updateRow(i, 'jumlah', fmtNum(parseNum(e.target.value))); }}
                      onChange={e => updateRow(i, 'jumlah', e.target.value)} />
                  </td>
                  <td className="px-1 py-0.5 text-right">
                    <button type="button" onClick={() => removeRow(i)}
                      className="text-red-500 hover:text-red-700 text-base leading-none px-1">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" onClick={addRow}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
              + Tambah Baris
            </button>

            <div className="flex items-center gap-1.5 ml-2">
              <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">Potongan</label>
              <input className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-28 text-right focus:outline-none focus:border-teal-600"
                value={potongan}
                onFocus={e => { e.target.value = String(parseNum(e.target.value)); }}
                onBlur={e => { setPotongan(fmtNum(parseNum(e.target.value))); }}
                onChange={e => setPotongan(e.target.value)} />
              <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-teal-600"
                value={potonganMode} onChange={e => setPotonganMode(e.target.value)}>
                <option value="rp">Rp</option>
                <option value="pct">%</option>
              </select>
            </div>

            <div className="ml-auto flex gap-2 flex-wrap">
              <button type="button" onClick={handlePrint}
                className="px-4 py-1.5 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800">
                Cetak / Simpan PDF
              </button>
              <button type="button" onClick={() => { setHistory(loadHistory()); setShowHistory(true); }}
                className="px-4 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                Riwayat
              </button>
            </div>
          </div>
        </div>

        {/* ── SHEET PREVIEW ── */}
        <div ref={sheetScrollRef} className={styles.sheetScroll}>
          <div ref={sheetRef} className={sheetClass}>
            <div className={styles.frame}>
              <div className={`${styles.corner} ${styles.tl}`} />
              <div className={`${styles.corner} ${styles.tr}`} />
              <div className={`${styles.corner} ${styles.bl}`} />
              <div className={`${styles.corner} ${styles.br}`} />

              {/* Watermark */}
              {/* ponytail: using img src paths from /public/invoice — avoids embedding 390KB base64 in bundle */}
              <img className={styles.watermark} src={`/invoice/logo-${unit === 'SD' ? 'sd' : 'smp'}.png`} alt="" />

              {/* Header */}
              <div className={styles.header}>
                <div className={styles.logoRow}>
                  <img src="/invoice/logo-sd.png" alt="Logo SD Al-Fakhir" />
                  <div className={styles.logoDivider} />
                  <img src="/invoice/logo-smp.png" alt="Logo Al-Fakhir SMP" />
                </div>
                <div className={styles.eyebrow}>Yayasan Prestasi Belia Indonesia</div>
                <div className={styles.schoolName}>
                  {unit === 'SD' ? 'SD Islam Modern Al Fakhir' : 'SMP Islam Modern Al Fakhir'}
                </div>
                <div className={styles.schoolAddr}>
                  Jl. Kemang No. 48, Pasir Putih, Kec. Sawangan, Kota Depok, Jawa Barat 16519<br />
                  +62 852-8175-2123 / +62 813-9526-221 &middot; {unit === 'SD' ? 'sdialfakhir.sch.id' : 'smpialfakhir.sch.id'}
                </div>
                <div className={styles.rule} />
                <div className={styles.docTitle}>Bukti Pembayaran</div>
              </div>

              {/* Meta row */}
              <div className={styles.metaRow}>
                <div>Tanggal&nbsp; <strong>{tanggal}</strong></div>
                <div className={styles.badge}>{status}</div>
                <div style={{visibility:'hidden'}}>No. {invoiceNo}</div>
              </div>

              {/* Info grid */}
              <div className={styles.infoGrid}>
                <div className={styles.infoCol}>
                  <p>Nama Siswa</p>
                  <h3>{nama || '—'}</h3>
                </div>
                <div className={styles.infoCol}>
                  <p>Kelas</p>
                  <h3>{kelas || '—'}</h3>
                </div>
              </div>

              {/* Kuitansi lines */}
              <div className={styles.kuitansiLines}>
                {(nama || kelas) && (
                  <div className={styles.kuitansiUntuk}>
                    <span className="label">Untuk pembayaran</span>
                    {' '}: <span className="val">
                      {nama || '(Siswa Baru)'}
                      {kelas ? ` (Kelas ${kelas})` : ''}
                    </span>
                  </div>
                )}
                <table className={styles.kuitansiTable}>
                  <thead>
                    <tr>
                      <th className={styles.kitNo}>No</th>
                      <th>Keterangan Pembayaran</th>
                      <th className={styles.kitNominal}>Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonZeroRows.map((r, i) => (
                      <tr key={i}>
                        <td>{i+1}</td>
                        <td>{r.ket.split('(')[0].trim() || r.ket}</td>
                        <td className={styles.kitNominal}>Rp {fmtNum(parseNum(r.jumlah))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {potonganAmt > 0 && <>
                      <tr><td colSpan={2}>Subtotal</td><td className={styles.kitNominal}>{fmtRp(subtotal)}</td></tr>
                      <tr><td colSpan={2}>Potongan / Beasiswa</td><td className={styles.kitNominal}>-{fmtRp(potonganAmt)}</td></tr>
                    </>}
                    <tr><td colSpan={2}>Jumlah</td><td className={styles.kitNominal}>{fmtRp(grand)}</td></tr>
                  </tfoot>
                </table>
              </div>

              <div className={styles.terbilang}>Terbilang: <b>{terbilangText}</b></div>

              {/* Rekening */}
              <div className={`${styles.extraWrap} ${styles.full}`}>
                <div className={styles.extraBox}>
                  <div className={styles.extraTitle}>Informasi Rekening</div>
                  <div className={styles.rekeningBox}>
                    <div className={styles.bankRow}><span>Yayasan Prestasi Belia Indonesia (BRI)</span><b>1147-01-000490-56-5</b></div>
                    <div className={styles.bankRow}><span>Yayasan Prestasi Belia Indonesia (BSI)</span><b>7344413171</b></div>
                    <div className={`${styles.bankRow} ${unit === 'SD' ? styles.active : ''}`}><span>SD Islam Modern Al Fakhir (BSI)</span><b>7344437836</b></div>
                    <div className={`${styles.bankRow} ${unit === 'SMP' ? styles.active : ''}`}><span>SMP Islam Modern Al Fakhir (BSI)</span><b>7344438026</b></div>
                  </div>
                  <div className={styles.catatan}>
                    Catatan: Simpan bukti pembayaran ini sebagai referensi. Untuk pertanyaan seputar tagihan atau riwayat pembayaran, silakan hubungi bendahara sekolah pada jam kerja.
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={styles.footer}>
                <div className={styles.verify}>
                  {/* ponytail: external QR API — no internal QR lib needed */}
                  <img className={styles.qr} src={qrUrl} alt="QR Verifikasi" />
                  <div className={styles.verifyText}>
                    <b>Verifikasi Keaslian</b>
                    Pindai kode untuk menuju situs resmi sekolah dan memastikan dokumen ini diterbitkan oleh Al-Fakhir.
                  </div>
                </div>
                <div className={styles.signBlock}>
                  <div className={styles.signDate}>Depok, {tanggal}</div>
                  <div className={styles.sealWrap}>
                    <img className={styles.sealLogo} src={`/invoice/logo-${unit === 'SD' ? 'sd' : 'smp'}.png`} alt="Cap Sekolah" />
                    <img className={styles.ttdSign} src="/invoice/ttdnun.png" alt="TTD" />
                  </div>
                  <div className={styles.signName}>Nurhidayati, S.Pd.</div>
                  <div className={styles.signRole}>Bendahara Sekolah</div>
                </div>
              </div>

              <div className={styles.footnote}>
                Dokumen ini dihasilkan secara elektronik oleh Pembayaran Al-Fakhir School dan sah tanpa tanda tangan basah.
                {papersize === 'A5' ? ' Dicetak pada kertas A5 landscape (21 × 14,8 cm).' : ' Dicetak pada kertas A4 landscape (29,7 × 21 cm).'}
              </div>
            </div>
          </div>
        </div>

        {/* ── HISTORY MODAL ── */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-no-print="1">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">Riwayat Cetak</h3>
                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              </div>
              <div className="overflow-y-auto flex-1">
                {history.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">Belum ada riwayat.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">Waktu</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">Nama</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-600">Jumlah</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item, i) => {
                        const d = new Date(item.ts);
                        const tgl = d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
                        return (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{tgl}</td>
                            <td className="px-4 py-2 text-slate-800">{item.nama || '—'}</td>
                            <td className="px-4 py-2 text-slate-800 text-right font-mono">{item.jumlah}</td>
                            <td className="px-4 py-2 text-right">
                              <button className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
                                onClick={() => restoreState(item.state)}>
                                Tampilkan
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem('afKuitansiHistory') || '[]'); } catch { return []; }
}

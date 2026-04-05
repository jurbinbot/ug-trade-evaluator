import { useState, useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Default dino data
// ---------------------------------------------------------------------------
const DEFAULT_DINOS = [
  // Hunters
  { name: 'Newbiesaurus',  category: 'Hunters', base: 3  },
  { name: 'Raptoe',        category: 'Hunters', base: 5  },
  { name: 'Chilladon',     category: 'Hunters', base: 6  },
  { name: 'Chadalodon',    category: 'Hunters', base: 6  },
  { name: 'Chompasaurus',  category: 'Hunters', base: 7  },
  { name: 'Beastasaur',    category: 'Hunters', base: 7  },
  { name: 'DilophosUGus',  category: 'Hunters', base: 7  },
  { name: 'Razorclaw',     category: 'Hunters', base: 8  },
  { name: 'Unkylosaurus',  category: 'Hunters', base: 8  },
  { name: 'T. Rex',        category: 'Hunters', base: 9  },
  // Tanks (corrected)
  { name: 'Gertiesaur',    category: 'Tanks',   base: 8  },
  { name: 'Shelldon',      category: 'Tanks',   base: 9  },
  { name: 'Grugadon',      category: 'Tanks',   base: 10 },
  { name: 'Mammothor',     category: 'Tanks',   base: 10 },
  { name: 'Torknash',      category: 'Tanks',   base: 11 },
  { name: 'UGlisaur',      category: 'Tanks',   base: 17 },
  { name: 'Aurasaur',      category: 'Tanks',   base: 7  },
  // Gliders (corrected)
  { name: 'Terrordactyl',  category: 'Gliders', base: 9  },
  { name: 'Swoopjaw',      category: 'Gliders', base: 11 },
  { name: 'Diemorphugon',  category: 'Gliders', base: 12 },
  { name: 'Dragadon',      category: 'Gliders', base: 14 },
  // Hybrids
  { name: 'Chomamasaur',   category: 'Hybrids', base: 13 },
  { name: 'Uglitoe',       category: 'Hybrids', base: 13 },
  { name: 'Gertie Rex',    category: 'Hybrids', base: 14 },
  { name: 'Chugadon',      category: 'Hybrids', base: 14 },
  { name: 'Sugnash',       category: 'Hybrids', base: 15 },
  { name: 'Swoopclaw',     category: 'Hybrids', base: 15 },
  { name: 'Shellodactyl',  category: 'Hybrids', base: 16 },
  // Titans
  { name: 'Triskeletops',  category: 'Titans',  base: 16 },
  { name: 'Flaptor',       category: 'Titans',  base: 17 },
  { name: 'Magmadon',      category: 'Titans',  base: 17 },
  { name: 'Cryodon',       category: 'Titans',  base: 17 },
  { name: 'Skellemagmon',  category: 'Titans',  base: 18 },
  { name: 'Crystadon',     category: 'Titans',  base: 19 },
  { name: 'Ballrug',       category: 'Titans',  base: 20 },
]

const DEFAULT_CATEGORIES = ['Hunters', 'Tanks', 'Gliders', 'Hybrids', 'Titans']

const DEFAULT_CAT_COLOR = {
  Hunters: '#ef4444',
  Tanks:   '#3b82f6',
  Gliders: '#06b6d4',
  Hybrids: '#a855f7',
  Titans:  '#f59e0b',
}

const PRESET_COLORS = [
  { label: 'Red',    value: '#ef4444' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Cyan',   value: '#06b6d4' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Gold',   value: '#f59e0b' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Pink',   value: '#ec4899' },
]

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------
function dinoValue(base, level, bundle) {
  return base * (1 + level / 100) + (bundle ? 5 : 0)
}

function sideTotal(slots, bases) {
  return slots.reduce((sum, slot) => {
    if (!slot.dino) return sum
    const base = bases[slot.dino.name] ?? slot.dino.base
    return sum + dinoValue(base, slot.level, slot.dino.isBundle ?? false)
  }, 0)
}

function getVerdict(leftTotal, rightTotal) {
  if (leftTotal === 0 && rightTotal === 0) return null
  const higher = Math.max(leftTotal, rightTotal)
  if (higher === 0) return null
  const diff = Math.abs(leftTotal - rightTotal)
  const pct = diff / higher

  let label, color, emoji
  if (pct <= 0.10) {
    label = 'FAIR TRADE'; color = '#22c55e'; emoji = '🤝'
  } else if (pct <= 0.25) {
    label = 'SLIGHTLY UNEVEN'; color = '#eab308'; emoji = '⚖️'
  } else if (pct <= 0.50) {
    label = 'UNEVEN'; color = '#f97316'; emoji = '⚠️'
  } else {
    label = 'VERY ONE-SIDED'; color = '#ef4444'; emoji = '🚨'
  }

  let better = null
  if (pct > 0.10) {
    better = leftTotal > rightTotal ? 'you' : 'them'
  }

  return { label, color, emoji, better, pct }
}

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------
const LS_KEY = 'ug-dino-settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { bases: {}, bundles: {}, customDinos: [], customCatColors: {} }
    const parsed = JSON.parse(raw)
    return {
      bases: parsed.bases || {},
      bundles: parsed.bundles || {},
      customDinos: parsed.customDinos || [],
      customCatColors: parsed.customCatColors || {},
    }
  } catch {
    return { bases: {}, bundles: {}, customDinos: [], customCatColors: {} }
  }
}

function saveSettings(settings) {
  localStorage.setItem(LS_KEY, JSON.stringify(settings))
}

async function fetchSettingsFromAPI() {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

async function pushSettingsToAPI(settings) {
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
}

// ---------------------------------------------------------------------------
// Slot factory
// ---------------------------------------------------------------------------
function emptySlot() { return { dino: null, level: 1 } }
function emptySlots() { return [emptySlot(), emptySlot(), emptySlot(), emptySlot(), emptySlot()] }

// ---------------------------------------------------------------------------
// Global CSS
// ---------------------------------------------------------------------------
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body {
    background: #0a0a0f;
    color: #f0f0ff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
  }
  input[type=range] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 28px;
    background: transparent;
    cursor: pointer;
    touch-action: pan-y;
  }
  input[type=range]::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: #2a2a3d;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #7c3aed;
    margin-top: -10px;
    box-shadow: 0 0 0 3px rgba(124,58,237,0.3);
  }
  input[type=range]::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: #2a2a3d;
  }
  input[type=range]::-moz-range-thumb {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #7c3aed;
    border: none;
    box-shadow: 0 0 0 3px rgba(124,58,237,0.3);
  }
  input[type=number] {
    background: #0a0a0f;
    color: #f0f0ff;
    border: 1px solid #2a2a3d;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 14px;
    width: 64px;
    text-align: center;
  }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { opacity: 1; }
  input[type=text], input[type=search] {
    background: #0a0a0f;
    color: #f0f0ff;
    border: 1px solid #2a2a3d;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    outline: none;
    width: 100%;
  }
  input[type=text]:focus, input[type=search]:focus {
    border-color: #7c3aed;
  }
  select {
    background: #0a0a0f;
    color: #f0f0ff;
    border: 1px solid #2a2a3d;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    outline: none;
    width: 100%;
    cursor: pointer;
  }
  select:focus { border-color: #7c3aed; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a3d; border-radius: 2px; }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [view, setView] = useState('trade')
  const [left, setLeft] = useState(emptySlots)
  const [right, setRight] = useState(emptySlots)

  const [settings, setSettings] = useState(loadSettings)
  // settings = { bases, bundles, customDinos, customCatColors }

  const [picker, setPicker] = useState(null)      // { side, idx } | null
  const [editingSlot, setEditingSlot] = useState(null) // { side, idx } | null
  const [search, setSearch] = useState('')

  // On mount: pull from backend and overwrite localStorage cache
  useEffect(() => {
    fetchSettingsFromAPI()
      .then(data => {
        setSettings(data)
        saveSettings(data)
      })
      .catch(() => { /* backend unavailable — localStorage fallback already in state */ })
  }, [])

  // Derived
  const allDinos = [...DEFAULT_DINOS, ...settings.customDinos]
  const customCats = Object.keys(settings.customCatColors)
  const allCategories = [...DEFAULT_CATEGORIES, ...customCats.filter(c => !DEFAULT_CATEGORIES.includes(c))]
  const allCatColor = { ...DEFAULT_CAT_COLOR, ...settings.customCatColors }

  function persist(next) {
    setSettings(next)
    saveSettings(next)
    pushSettingsToAPI(next).catch(() => { /* silent — localStorage is the fallback */ })
  }

  function updateBase(name, val) {
    const clamped = Math.min(20, Math.max(1, Number(val) || 1))
    persist({ ...settings, bases: { ...settings.bases, [name]: clamped } })
  }

  function updateBundle(name, checked) {
    persist({ ...settings, bundles: { ...settings.bundles, [name]: checked } })
  }

  function resetAll() {
    persist({ bases: {}, bundles: {}, customDinos: settings.customDinos, customCatColors: settings.customCatColors })
  }

  function addCustomDino(dino) {
    const customDinos = [...settings.customDinos, dino]
    const customCatColors = { ...settings.customCatColors }
    if (dino.customCatColor) {
      customCatColors[dino.category] = dino.customCatColor
    }
    const { customCatColor: _, ...dinoClean } = dino
    persist({ ...settings, customDinos: [...settings.customDinos, dinoClean], customCatColors })
  }

  const getBase = (dino) => settings.bases[dino.name] ?? dino.base

  const leftTotal = sideTotal(left, settings.bases)
  const rightTotal = sideTotal(right, settings.bases)
  const verdict = getVerdict(leftTotal, rightTotal)

  // Slot mutations
  function setSlot(side, idx, updater) {
    const setter = side === 'left' ? setLeft : setRight
    setter(prev => prev.map((s, i) => i === idx ? (typeof updater === 'function' ? updater(s) : updater) : s))
  }

  function openPicker(side, idx) {
    setSearch('')
    setPicker({ side, idx })
  }

  function selectDino(dino) {
    if (!picker) return
    setSlot(picker.side, picker.idx, s => ({ ...s, dino }))
    setPicker(null)
  }

  function clearTrade() {
    setLeft(emptySlots())
    setRight(emptySlots())
  }

  // Picker filtered list — bundle-enabled dinos appear twice (normal + bundle variant)
  const filteredDinos = allDinos.flatMap(d => {
    if (!d.name.toLowerCase().includes(search.toLowerCase())) return []
    const entries = [d]
    if (settings.bundles[d.name]) entries.push({ ...d, isBundle: true })
    return entries
  })
  const groupedFiltered = allCategories.reduce((acc, cat) => {
    const list = filteredDinos.filter(d => d.category === cat)
    if (list.length) acc[cat] = list
    return acc
  }, {})

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {view === 'trade'
        ? <TradeScreen
            left={left} right={right}
            leftTotal={leftTotal} rightTotal={rightTotal}
            verdict={verdict}
            getBase={getBase}
            onOpenPicker={openPicker}
            onEdit={(side, idx) => setEditingSlot({ side, idx })}
            onRemove={(side, idx) => setSlot(side, idx, emptySlot())}
            onClear={clearTrade}
            onSettings={() => setView('settings')}
            allCatColor={allCatColor}
          />
        : <SettingsScreen
            allDinos={allDinos}
            allCategories={allCategories}
            allCatColor={allCatColor}
            settings={settings}
            onUpdateBase={updateBase}
            onUpdateBundle={updateBundle}
            onReset={resetAll}
            onAddDino={addCustomDino}
            onBack={() => setView('trade')}
          />
      }

      {picker && (
        <DinoPickerModal
          grouped={groupedFiltered}
          search={search}
          onSearch={setSearch}
          onSelect={selectDino}
          onClose={() => setPicker(null)}
          getBase={getBase}
          allCatColor={allCatColor}
        />
      )}

      {editingSlot && (() => {
        const slots = editingSlot.side === 'left' ? left : right
        const slot = slots[editingSlot.idx]
        if (!slot?.dino) return null
        return (
          <SlotEditModal
            slot={slot}
            getBase={getBase}
            allCatColor={allCatColor}
            onLevel={lvl => setSlot(editingSlot.side, editingSlot.idx, s => ({ ...s, level: Number(lvl) }))}
            onClose={() => setEditingSlot(null)}
          />
        )
      })()}
    </>
  )
}

// ---------------------------------------------------------------------------
// Trade Screen
// ---------------------------------------------------------------------------
function TradeScreen({ left, right, leftTotal, rightTotal, verdict, getBase,
                       onOpenPicker, onEdit, onRemove, onClear, onSettings, allCatColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: 148 }}>
      <header style={{
        background: '#13131a',
        borderBottom: '1px solid #2a2a3d',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px', color: '#f0f0ff' }}>
            🦕 UG Trade Eval
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>Meta Quest · Untamed Grounds</div>
        </div>
        <button onClick={onSettings} style={iconBtnStyle} aria-label="Settings">
          <GearIcon />
        </button>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        padding: '10px 8px 0',
        flex: 1,
      }}>
        <SideColumn label="Your Side" slots={left} side="left"
          getBase={getBase} total={leftTotal}
          onOpenPicker={onOpenPicker} onEdit={onEdit} onRemove={onRemove}
          allCatColor={allCatColor} />
        <SideColumn label="Their Side" slots={right} side="right"
          getBase={getBase} total={rightTotal}
          onOpenPicker={onOpenPicker} onEdit={onEdit} onRemove={onRemove}
          allCatColor={allCatColor} />
      </div>

      <VerdictBar leftTotal={leftTotal} rightTotal={rightTotal} verdict={verdict} onClear={onClear} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Side Column
// ---------------------------------------------------------------------------
function SideColumn({ label, slots, side, getBase, total, onOpenPicker, onEdit, onRemove, allCatColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ textAlign: 'center', marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: side === 'left' ? '#7c3aed' : '#06b6d4', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
          Total: <span style={{ color: '#f0f0ff', fontWeight: 700 }}>{total.toFixed(1)}</span>
        </div>
      </div>
      {slots.map((slot, idx) => (
        <DinoSlot
          key={idx}
          slot={slot}
          getBase={getBase}
          onOpen={() => onOpenPicker(side, idx)}
          onEdit={() => onEdit(side, idx)}
          onRemove={() => onRemove(side, idx)}
          allCatColor={allCatColor}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dino Slot
// ---------------------------------------------------------------------------
function DinoSlot({ slot, getBase, onOpen, onEdit, onRemove, allCatColor }) {
  const { dino, level } = slot

  if (!dino) {
    return (
      <button onClick={onOpen} style={{
        background: '#13131a',
        border: '1px dashed #2a2a3d',
        borderRadius: 10,
        color: '#555',
        fontSize: 12,
        fontWeight: 600,
        minHeight: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
        width: '100%',
        touchAction: 'manipulation',
      }}>
        <span style={{ fontSize: 16 }}>+</span> Add Dino
      </button>
    )
  }

  const base = getBase(dino)
  const bundle = dino.isBundle ?? false
  const value = dinoValue(base, level, bundle)
  const catColor = allCatColor[dino.category] || '#888'

  return (
    <div
      onClick={onEdit}
      style={{
        background: '#13131a',
        border: '1px solid #2a2a3d',
        borderRadius: 10,
        padding: '8px 8px 8px',
        position: 'relative',
        cursor: 'pointer',
        touchAction: 'manipulation',
        userSelect: 'none',
      }}
    >
      {/* Remove button — stopPropagation so it doesn't trigger onEdit */}
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        style={{
          position: 'absolute',
          top: 4, right: 4,
          background: 'transparent',
          border: 'none',
          color: '#555',
          fontSize: 14,
          cursor: 'pointer',
          padding: '2px 5px',
          lineHeight: 1,
          minWidth: 24, minHeight: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          touchAction: 'manipulation',
        }}
        aria-label="Remove"
      >×</button>

      {/* Dino name */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f0ff', paddingRight: 20, lineHeight: 1.3 }}>
        {dino.name}
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
        <span style={{
          background: catColor + '22', color: catColor,
          border: `1px solid ${catColor}55`,
          borderRadius: 4, fontSize: 9, fontWeight: 700,
          padding: '1px 4px', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>{dino.category}</span>
        {bundle && (
          <span style={{
            background: '#78350f', color: '#fbbf24',
            border: '1px solid #92400e',
            borderRadius: 4, fontSize: 9, fontWeight: 700, padding: '1px 4px',
          }}>📦 Bundle</span>
        )}
      </div>

      {/* Level + value row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 6,
      }}>
        <span style={{
          fontSize: 11, color: '#888',
        }}>
          Lv <span style={{ color: '#f0f0ff', fontWeight: 700 }}>{level}</span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
          ⚡ {value.toFixed(1)}
        </span>
      </div>

      {/* Tap hint */}
      <div style={{ fontSize: 9, color: '#3a3a55', marginTop: 3, textAlign: 'right' }}>
        tap to adjust
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Slot Edit Modal
// ---------------------------------------------------------------------------
function SlotEditModal({ slot, getBase, allCatColor, onLevel, onClose }) {
  const { dino, level } = slot
  const base = getBase(dino)
  const bundle = dino.isBundle ?? false
  const value = dinoValue(base, level, bundle)
  const catColor = allCatColor[dino.category] || '#888'
  const overlayRef = useRef(null)

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 50,
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        width: '100%',
        background: '#13131a',
        borderRadius: '16px 16px 0 0',
        borderTop: '1px solid #2a2a3d',
        padding: '0 0 32px',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, background: '#2a2a3d', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 16px',
          borderBottom: '1px solid #1a1a26',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#f0f0ff' }}>{dino.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <span style={{
                background: catColor + '22', color: catColor,
                border: `1px solid ${catColor}55`,
                borderRadius: 4, fontSize: 10, fontWeight: 700,
                padding: '2px 6px', textTransform: 'uppercase', letterSpacing: 0.5,
              }}>{dino.category}</span>
              <span style={{
                background: '#2a2a3d', color: '#bbb',
                borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '2px 6px',
              }}>Base {base}</span>
              {bundle && (
                <span style={{
                  background: '#78350f', color: '#fbbf24',
                  border: '1px solid #92400e',
                  borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '2px 6px',
                }}>📦 +5</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ ...iconBtnStyle, fontSize: 22, color: '#888' }}>×</button>
        </div>

        {/* Level display */}
        <div style={{ padding: '24px 28px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Level</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: '#f0f0ff', lineHeight: 1 }}>{level}</div>
        </div>

        {/* Slider */}
        <div style={{ padding: '8px 28px 20px' }}>
          <input
            type="range"
            min={1} max={100}
            value={level}
            onChange={e => onLevel(e.target.value)}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#444' }}>1</span>
            <span style={{ fontSize: 11, color: '#444' }}>100</span>
          </div>
        </div>

        {/* Value breakdown */}
        <div style={{
          margin: '0 20px 20px',
          background: '#0a0a0f',
          borderRadius: 10,
          padding: '12px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            {base} × (1 + {level}/100){bundle ? ' + 5' : ''}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#7c3aed' }}>
            ⚡ {value.toFixed(1)}
          </div>
        </div>

        {/* Done */}
        <div style={{ padding: '0 20px' }}>
          <button onClick={onClose} style={{
            width: '100%', padding: '14px',
            background: '#7c3aed',
            border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Verdict Bar
// ---------------------------------------------------------------------------
function VerdictBar({ leftTotal, rightTotal, verdict, onClear }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#13131a',
      borderTop: '1px solid #2a2a3d',
      padding: '10px 16px 16px',
      zIndex: 20,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, fontSize: 13, color: '#888',
      }}>
        <span>
          <span style={{ color: '#7c3aed', fontWeight: 700 }}>You:</span>{' '}
          <span style={{ color: '#f0f0ff', fontWeight: 700 }}>{leftTotal.toFixed(1)}</span>
        </span>
        <span style={{ fontSize: 11, color: '#444' }}>vs</span>
        <span>
          <span style={{ color: '#06b6d4', fontWeight: 700 }}>Them:</span>{' '}
          <span style={{ color: '#f0f0ff', fontWeight: 700 }}>{rightTotal.toFixed(1)}</span>
        </span>
      </div>

      {verdict ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            background: verdict.color + '22',
            border: `2px solid ${verdict.color}`,
            borderRadius: 10,
            padding: '8px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: verdict.color, letterSpacing: 1 }}>
              {verdict.emoji} {verdict.label}
            </div>
            {verdict.better && (
              <div style={{ fontSize: 12, color: '#bbb', marginTop: 3 }}>
                {verdict.better === 'you'
                  ? "You're getting the better deal"
                  : "They're getting the better deal"}
                {' '}({(verdict.pct * 100).toFixed(0)}% diff)
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#1a1a26', borderRadius: 10,
          padding: '8px 12px', textAlign: 'center',
          color: '#444', fontSize: 13, marginBottom: 8,
        }}>
          Add dinos to evaluate the trade
        </div>
      )}

      <button onClick={onClear} style={{
        width: '100%', padding: '10px',
        background: 'transparent',
        border: '1px solid #2a2a3d',
        borderRadius: 8, color: '#888',
        fontSize: 13, fontWeight: 600,
        cursor: 'pointer', touchAction: 'manipulation',
      }}>
        Clear Trade
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dino Picker Modal
// ---------------------------------------------------------------------------
function DinoPickerModal({ grouped, search, onSearch, onSelect, onClose, getBase, allCatColor }) {
  const overlayRef = useRef(null)

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 50,
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        width: '100%', maxHeight: '80vh',
        background: '#13131a',
        borderRadius: '16px 16px 0 0',
        borderTop: '1px solid #2a2a3d',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.25s ease',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, background: '#2a2a3d', borderRadius: 2 }} />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px 10px',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Choose a Dinosaur</div>
          <button onClick={onClose} style={{ ...iconBtnStyle, fontSize: 20, color: '#888' }}>×</button>
        </div>

        <div style={{ padding: '0 16px 10px' }}>
          <input
            type="search"
            placeholder="Search dinos..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1 }}>
          {Object.keys(grouped).length === 0 && (
            <div style={{ textAlign: 'center', color: '#555', padding: 32, fontSize: 14 }}>
              No dinos found
            </div>
          )}
          {Object.keys(grouped).map(cat => {
            const catColor = allCatColor[cat] || '#888'
            return (
              <div key={cat}>
                <div style={{
                  padding: '8px 16px 4px',
                  fontSize: 11, fontWeight: 700,
                  color: catColor,
                  textTransform: 'uppercase', letterSpacing: 1,
                  background: '#0a0a0f',
                  borderBottom: `1px solid ${catColor}33`,
                  position: 'sticky', top: 0,
                }}>
                  {cat}
                </div>
                {grouped[cat].map((dino) => {
                  const base = getBase(dino)
                  const rowKey = `${dino.name}-${dino.isBundle ? 'bundle' : 'normal'}`
                  return (
                    <button
                      key={rowKey}
                      onClick={() => onSelect(dino)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '12px 16px',
                        background: dino.isBundle ? '#78350f18' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #1a1a26',
                        cursor: 'pointer',
                        textAlign: 'left', touchAction: 'manipulation', color: '#f0f0ff',
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: dino.isBundle ? '#f59e0b' : catColor, flexShrink: 0,
                      }} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                        {dino.isBundle ? '📦 ' : ''}{dino.name}
                      </span>
                      {dino.isBundle && (
                        <span style={{
                          background: '#78350f', color: '#fbbf24',
                          borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '1px 5px',
                        }}>+5</span>
                      )}
                      <span style={{
                        background: '#2a2a3d', color: '#bbb',
                        borderRadius: 5, fontSize: 11, fontWeight: 700, padding: '2px 7px',
                      }}>
                        Base {base}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings Screen
// ---------------------------------------------------------------------------
function SettingsScreen({ allDinos, allCategories, allCatColor, settings,
                          onUpdateBase, onUpdateBundle, onReset, onAddDino, onBack }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBase, setEditingBase] = useState(null) // { name, defaultBase, catColor }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        background: '#13131a',
        borderBottom: '1px solid #2a2a3d',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={iconBtnStyle} aria-label="Back">
          <BackIcon />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Settings</div>
      </header>

      <div style={{ padding: '12px 16px', background: '#7c3aed22', borderBottom: '1px solid #7c3aed44' }}>
        <p style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>
          Edit base levels and add custom dinos. Toggle 📦 to make a bundle variant available in the picker (+5 value bonus).
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {allCategories.map(cat => {
          const catColor = allCatColor[cat] || '#888'
          const catDinos = allDinos.filter(d => d.category === cat)
          if (!catDinos.length) return null
          return (
            <div key={cat}>
              <div style={{
                padding: '10px 16px 6px',
                fontSize: 11, fontWeight: 700,
                color: catColor,
                textTransform: 'uppercase', letterSpacing: 1,
                background: '#0a0a0f',
                borderBottom: `1px solid ${catColor}33`,
                position: 'sticky', top: 0,
              }}>
                {cat}
              </div>
              {catDinos.map(dino => {
                const defaultBase = dino.base
                const currentBase = settings.bases[dino.name] ?? defaultBase
                const modified = settings.bases[dino.name] !== undefined && settings.bases[dino.name] !== defaultBase
                const bundle = settings.bundles[dino.name] ?? false
                return (
                  <div key={dino.name} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: '1px solid #1a1a26',
                    gap: 10,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: catColor, flexShrink: 0,
                    }} />
                    <span style={{
                      flex: 1, fontSize: 13, fontWeight: 600,
                      color: modified ? '#f0f0ff' : '#ccc',
                    }}>
                      {dino.name}
                      {modified && <span style={{ fontSize: 10, color: '#7c3aed', marginLeft: 6 }}>edited</span>}
                    </span>
                    {/* Bundle toggle */}
                    <BundleToggle checked={bundle} onChange={v => onUpdateBundle(dino.name, v)} />
                    {/* Base value button — tap to edit */}
                    <button
                      onClick={() => setEditingBase({ name: dino.name, defaultBase: dino.base, catColor })}
                      style={{
                        background: modified ? '#7c3aed22' : '#2a2a3d',
                        border: modified ? '1px solid #7c3aed55' : '1px solid transparent',
                        borderRadius: 8,
                        color: modified ? '#a78bfa' : '#bbb',
                        fontSize: 13, fontWeight: 700,
                        padding: '6px 12px',
                        cursor: 'pointer', touchAction: 'manipulation',
                        minWidth: 56, minHeight: 44,
                      }}
                    >
                      {currentBase}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
        <div style={{ height: 12 }} />

        {/* Add new dino section */}
        {showAddForm
          ? <AddDinoForm
              allCategories={allCategories}
              allCatColor={allCatColor}
              onAdd={(dino) => { onAddDino(dino); setShowAddForm(false) }}
              onCancel={() => setShowAddForm(false)}
            />
          : (
            <div style={{ padding: '12px 16px' }}>
              <button onClick={() => setShowAddForm(true)} style={{
                width: '100%', padding: '12px',
                background: '#7c3aed22',
                border: '1px dashed #7c3aed88',
                borderRadius: 8,
                color: '#a78bfa',
                fontSize: 14, fontWeight: 700,
                cursor: 'pointer', touchAction: 'manipulation',
              }}>
                + Add New Dino
              </button>
            </div>
          )
        }

        <div style={{ height: 80 }} />
      </div>

      <div style={{
        position: 'sticky', bottom: 0,
        background: '#13131a',
        borderTop: '1px solid #2a2a3d',
        padding: '12px 16px',
      }}>
        <button onClick={onReset} style={{
          width: '100%', padding: '12px',
          background: '#ef444422',
          border: '1px solid #ef444455',
          borderRadius: 8, color: '#ef4444',
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer', touchAction: 'manipulation',
        }}>
          Reset Base Levels &amp; Bundles to Defaults
        </button>
      </div>

      {editingBase && (
        <BaseEditModal
          name={editingBase.name}
          defaultBase={editingBase.defaultBase}
          currentBase={settings.bases[editingBase.name] ?? editingBase.defaultBase}
          catColor={editingBase.catColor}
          onChange={val => onUpdateBase(editingBase.name, val)}
          onClose={() => setEditingBase(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Base Edit Modal
// ---------------------------------------------------------------------------
function BaseEditModal({ name, defaultBase, currentBase, catColor, onChange, onClose }) {
  const overlayRef = useRef(null)
  const isModified = currentBase !== defaultBase

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 50,
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        width: '100%',
        background: '#13131a',
        borderRadius: '16px 16px 0 0',
        borderTop: '1px solid #2a2a3d',
        padding: '0 0 32px',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, background: '#2a2a3d', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 16px',
          borderBottom: '1px solid #1a1a26',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#f0f0ff' }}>{name}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
              Default: {defaultBase}
              {isModified && (
                <button
                  onClick={() => onChange(defaultBase)}
                  style={{
                    marginLeft: 10, background: 'transparent',
                    border: '1px solid #2a2a3d', borderRadius: 4,
                    color: '#888', fontSize: 11, padding: '1px 6px',
                    cursor: 'pointer', touchAction: 'manipulation',
                  }}
                >reset</button>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ ...iconBtnStyle, fontSize: 22, color: '#888' }}>×</button>
        </div>

        {/* Base value display */}
        <div style={{ padding: '24px 28px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Base Level</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: isModified ? '#a78bfa' : '#f0f0ff', lineHeight: 1 }}>
            {currentBase}
          </div>
        </div>

        {/* Slider 1–20 */}
        <div style={{ padding: '8px 28px 12px' }}>
          <input
            type="range"
            min={1} max={20}
            value={currentBase}
            onChange={e => onChange(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#444' }}>1</span>
            <span style={{ fontSize: 11, color: '#444' }}>20</span>
          </div>
        </div>

        {/* Stepper buttons for fine control */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '4px 28px 20px' }}>
          <button
            onClick={() => onChange(Math.max(1, currentBase - 1))}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#2a2a3d', border: 'none',
              color: '#f0f0ff', fontSize: 24, fontWeight: 700,
              cursor: 'pointer', touchAction: 'manipulation',
            }}
          >−</button>
          <button
            onClick={() => onChange(Math.min(20, currentBase + 1))}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#2a2a3d', border: 'none',
              color: '#f0f0ff', fontSize: 24, fontWeight: 700,
              cursor: 'pointer', touchAction: 'manipulation',
            }}
          >+</button>
        </div>

        {/* Done */}
        <div style={{ padding: '0 20px' }}>
          <button onClick={onClose} style={{
            width: '100%', padding: '14px',
            background: '#7c3aed',
            border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bundle Toggle (styled switch)
// ---------------------------------------------------------------------------
function BundleToggle({ checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 5,
      cursor: 'pointer', flexShrink: 0,
    }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20,
          borderRadius: 10,
          background: checked ? '#f59e0b' : '#2a2a3d',
          position: 'relative',
          transition: 'background 0.2s',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 2, left: checked ? 18 : 2,
          width: 16, height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 10, color: checked ? '#f59e0b' : '#555', fontWeight: 700, whiteSpace: 'nowrap' }}>
        📦
      </span>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Add Dino Form
// ---------------------------------------------------------------------------
function AddDinoForm({ allCategories, allCatColor, onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(allCategories[0] || 'Hunters')
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0].value)
  const [base, setBase] = useState(10)
  const [bundle, setBundle] = useState(false)

  const isNewCat = category === '__new__'
  const finalCat = isNewCat ? newCatName.trim() : category

  function handleSubmit() {
    if (!name.trim()) return
    if (isNewCat && !newCatName.trim()) return
    const dino = {
      name: name.trim(),
      category: finalCat,
      base: Math.min(20, Math.max(1, Number(base) || 10)),
      ...(isNewCat ? { customCatColor: newCatColor } : {}),
    }
    onAdd(dino)
  }

  return (
    <div style={{
      margin: '0 16px 16px',
      background: '#13131a',
      border: '1px solid #2a2a3d',
      borderRadius: 12,
      padding: 16,
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14, color: '#a78bfa' }}>
        + Add New Dino
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Dino Name</label>
          <input
            type="text"
            placeholder="e.g. Thunderclaw"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {allCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__new__">New Category...</option>
          </select>
        </div>

        {/* New category fields */}
        {isNewCat && (
          <>
            <div>
              <label style={labelStyle}>New Category Name</label>
              <input
                type="text"
                placeholder="e.g. Aquatics"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Category Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {PRESET_COLORS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setNewCatColor(p.value)}
                    style={{
                      width: 32, height: 32,
                      borderRadius: '50%',
                      background: p.value,
                      border: newCatColor === p.value ? '3px solid #fff' : '3px solid transparent',
                      cursor: 'pointer',
                      outline: 'none',
                      flexShrink: 0,
                    }}
                    title={p.label}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Base level */}
        <div>
          <label style={labelStyle}>Base Level (1–20)</label>
          <input
            type="number"
            min={1} max={20}
            value={base}
            onChange={e => setBase(e.target.value)}
            style={{ width: 80 }}
          />
        </div>

        {/* Bundle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Bundle (+5)</label>
          <BundleToggle checked={bundle} onChange={setBundle} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px',
            background: 'transparent',
            border: '1px solid #2a2a3d',
            borderRadius: 8, color: '#888',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || (isNewCat && !newCatName.trim())}
            style={{
              flex: 2, padding: '10px',
              background: '#7c3aed',
              border: 'none',
              borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer', touchAction: 'manipulation',
              opacity: (!name.trim() || (isNewCat && !newCatName.trim())) ? 0.4 : 1,
            }}
          >
            Add Dino
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 44, minHeight: 44,
  borderRadius: 8,
  touchAction: 'manipulation',
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
}

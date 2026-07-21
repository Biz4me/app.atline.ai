'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import QRCode from 'qrcode'

/* ── Icônes SVG inline (pas de webfont en prod) ─────────────── */
function svg(name: string): string {
  const p: Record<string, string> = {
    sparkles: '<path d="M12 4l1.6 4 4 1.6-4 1.6L12 16l-1.6-4.8L6 9.6l4-1.6z"/><path d="M18 4l.5 1.5L20 6l-1.5.5L18 8l-.5-1.5L16 6l1.5-.5z"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    pencil: '<path d="M4 20l4-1 9.5-9.5a1.5 1.5 0 0 0 0-2.1l-.9-.9a1.5 1.5 0 0 0-2.1 0L5 16z"/>',
    send: '<path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    squarePen: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
    check: '<path d="M5 12l4 4 10-10"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    message: '<path d="M4 5h16v11H9l-4 3z"/>',
    phone: '<path d="M5 4h4l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    atlasSpark: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">${p[name] || ''}</svg>`
}

type Refs = { root: HTMLDivElement; chat: HTMLDivElement; act: HTMLDivElement; prog: HTMLDivElement; back: HTMLButtonElement; scrollBtn: HTMLButtonElement; title: HTMLDivElement }
type Done = (d: Record<string, unknown>) => void

const AG: Record<string, { n: string; c: string; ic: string }> = {
  atlas: { n: 'Atlas', c: '#F97316', ic: 'sparkles' },
  aria: { n: 'Aria', c: '#14B8A6', ic: 'mic' },
  nova: { n: 'Nova', c: '#8B5CF6', ic: 'pencil' },
}
const COL: Record<string, { n: string; t: string; tf: string; tn: string; h: string; l: string }> = {
  rouge: { n: 'Rouge', t: 'Le Fonceur', tf: 'La Fonceuse', tn: 'Profil Fonceur', h: '#EF4444', l: 'Avec toi, je vais droit au but — pas de blabla.' },
  vert: { n: 'Vert', t: "L'Analyste", tf: "L'Analyste", tn: 'Profil Analyste', h: '#22C55E', l: "Je t'apporterai des faits et des preuves." },
  jaune: { n: 'Jaune', t: 'Le Connecteur', tf: 'La Connectrice', tn: 'Profil Connecteur', h: '#F4B342', l: 'On avance sans pression, à ton rythme.' },
  bleu: { n: 'Bleu', t: "L'Enthousiaste", tf: "L'Enthousiaste", tn: 'Profil Enthousiaste', h: '#3B82F6', l: 'On va rendre ça vivant et fun.' },
}
const MLM = ['Herbalife', 'Forever Living', 'Amway', 'Oriflame', 'NHT Global', 'doTERRA', 'Young Living', 'Mary Kay', 'Tupperware']


function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
}

function runEngine(R: Refs, name: string, onDone: Done) {
  const D: Record<string, unknown> = { objectives: [], socials: [], links: [] }
  const OB_CKPT = 'ob_ckpt' // checkpoint de reprise (sessionStorage) — reprise FINE au refresh
  // ── Rejeu express : au reload on relit la famille en cours (instantané) jusqu'à l'étape exacte ──
  let replaying = false
  const replayQueue: unknown[] = []
  let recAnswers: unknown[] = []
  let curFamilyIdx = 0
  const cardStore: Record<string, string> = {}
  const persistCkpt = () => { try { sessionStorage.setItem(OB_CKPT, JSON.stringify({ i: curFamilyIdx, answers: recAnswers, cards: cardStore, D, firstName, contactName, contactMarche })) } catch { /* ignore */ } }
  const recordAnswer = (v: unknown) => { recAnswers.push(v); persistCkpt() }
  // Renvoie la prochaine réponse à rejouer, ou signale qu'on est arrivé à l'étape vivante
  const takeReplay = (): { has: boolean; v?: unknown } => { if (replaying && replayQueue.length) return { has: true, v: replayQueue.shift() }; if (replaying) replaying = false; return { has: false } }
  let firstName = 'Marc', contactName = 'Marc Dubois', contactMarche = 'Famille'
  const chat = R.chat, act = R.act


  // Chevron « revenir en bas » : visible seulement en mode chat (scroll auto) ET quand on n'est pas au fond
  const scrollHost = chat.parentElement!
  const atBottom = () => scrollHost.scrollHeight - scrollHost.scrollTop - scrollHost.clientHeight < 48
  const syncScrollBtn = () => { R.scrollBtn.style.display = (scrollHost.style.overflowY === 'auto' && !atBottom()) ? 'flex' : 'none' }
  R.scrollBtn.onclick = () => scrollHost.scrollTo({ top: scrollHost.scrollHeight, behavior: 'smooth' })
  scrollHost.addEventListener('scroll', syncScrollBtn, { passive: true })

  const setAg = (a: string) => { R.root.style.setProperty('--ac', AG[a].c) }
  // Progression directe — la couleur suit var(--ac)
  const setProgPct = (p: number) => { R.prog.style.width = Math.min(p, 100) + '%' }
  const clearAct = () => { act.innerHTML = '' }


  function marketCode(m: string) { return m === 'Connaissance' ? 'TIEDE' : 'CHAUD' }
  function draftMessage() {
    const n = firstName
    if (contactMarche === 'Connaissance') return `Bonjour ${n}, j'espère que tu vas bien. Je me lance dans un nouveau projet et j'ai pensé à toi — aurais-tu 10 minutes cette semaine pour que je t'en dise un mot ?`
    return `Coucou ${n} ! Je me lance dans un projet qui me tient à cœur et tu es une des premières personnes à qui je pense. Tu as 10 min pour un café cette semaine ? J'aimerais avoir ton avis.`
  }
  function finish() {
    clearAct()
    try { sessionStorage.removeItem(OB_CKPT) } catch { /* ignore */ }
    const wait = document.createElement('div'); wait.style.cssText = 'text-align:center;color:#8a8c93;font-size:13px;padding:10px'; wait.textContent = 'On prépare ton espace…'; act.appendChild(wait)
    onDone(D)
  }


  // ── Intro « hero » : texte seul centré, position FIGÉE (hauteur réservée, CTA inclus) → ne bouge pas ──
  function heroIntro(lines: string[], ctaLabel: string, onCta: () => void) {
    const scrollEl = chat.parentElement!
    scrollEl.style.display = 'flex'; scrollEl.style.flexDirection = 'column'; scrollEl.style.justifyContent = 'center'; scrollEl.style.overflowY = 'hidden'
    chat.style.maxWidth = '460px'; chat.style.alignItems = 'center'; chat.style.textAlign = 'center'; chat.style.gap = '20px'
    const ic = document.createElement('div')
    ic.style.cssText = `width:44px;height:44px;flex:0 0 auto;border-radius:13px;background:${AG.atlas.c};color:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:-4px;opacity:0;transition:opacity .6s ease`
    ic.innerHTML = `<span style="width:24px;height:24px;display:block">${svg('atlasSpark')}</span>`
    chat.appendChild(ic); requestAnimationFrame(() => { ic.style.opacity = '1' })
    const els = lines.map((text, idx) => {
      const p = document.createElement('div')
      p.style.cssText = idx === 0
        ? 'font-size:27px;line-height:1.25;font-weight:700;color:#0f1012;letter-spacing:-0.025em;text-align:center'
        : 'font-size:18px;line-height:1.6;font-weight:450;color:#3a3c42;letter-spacing:-0.01em;text-align:center'
      p.textContent = text
      chat.appendChild(p)
      return { p, text }
    })
    // CTA sous le texte — réservé dès le départ (aucun saut), révélé en fondu après la frappe
    const btn = document.createElement('button')
    btn.style.cssText = 'margin-top:14px;cursor:pointer;border:none;border-radius:16px;height:44px;box-sizing:border-box;padding:0 24px;font-size:18px;font-weight:600;color:#fff;background:var(--ac);display:inline-flex;align-items:center;gap:8px;opacity:0;transform:translateY(12px);transition:opacity .55s ease,transform .55s ease;pointer-events:none'
    btn.innerHTML = ctaLabel + `<span style="width:18px;height:18px;display:block">${svg('arrow')}</span>`
    btn.onclick = onCta
    chat.appendChild(btn)
    // Réserver la hauteur finale (mesure) puis vider le texte → le bloc reste centré et NE BOUGE PLUS
    els.forEach(({ p }) => { p.style.minHeight = p.offsetHeight + 'px'; p.textContent = '' })

    // Tap n'importe où = on affiche tout d'un coup (respect du temps de l'utilisateur)
    let skipped = false
    const onTap = () => skip()
    const revealCta = () => {
      btn.style.opacity = '1'; btn.style.transform = 'translateY(0)'; btn.style.pointerEvents = 'auto'
      scrollEl.removeEventListener('click', onTap)
    }
    function skip() {
      if (skipped) return
      skipped = true
      els.forEach(({ p, text }) => { p.textContent = text })
      revealCta()
    }
    scrollEl.addEventListener('click', onTap)

    let li = 0
    const typeLine = () => {
      if (skipped) return
      if (li >= els.length) { setTimeout(() => { if (!skipped) revealCta() }, 220); return }
      const { p, text } = els[li]; let i = 0
      const t = () => {
        if (skipped) return
        if (i <= text.length) { p.textContent = text.slice(0, i); i++; setTimeout(t, 22) }
        else { li++; setTimeout(typeLine, 300) }
      }
      t()
    }
    typeLine()
  }

  // ── BRIQUES DE CHAT (titre hero + conversation) — pilote « Parlons de toi » ──────────────
  const scrollChat = () => { const s = chat.parentElement!; s.scrollTop = s.scrollHeight; R.scrollBtn.style.display = 'none' }
  // Typo FR : fine insécable avant : ; ! ? et insécable avant l'em-dash (jamais en début de ligne)
  const TH = String.fromCharCode(0x202F), NB = String.fromCharCode(0xA0), EM = String.fromCharCode(0x2014)
  const frText = (t: string) => t.replace(/ ([:;!?])/g, TH + '$1').replace(new RegExp(' ' + EM + ' ', 'g'), NB + EM + ' ')
  // Resserrement : deux messages du même interlocuteur d'affilée sont plus proches
  let lastSpeaker: string | null = null
  const tighten = (el: HTMLElement, who: string) => { if (lastSpeaker === who) el.style.marginTop = '-9px'; lastSpeaker = who }
  // Couleurs + icônes par agent (pédagogie : Atlas orange · Aria teal · Nova violet)
  const AGC: Record<string, string> = { atlas: '#F97316', aria: '#14B8A6', nova: '#8B5CF6' }
  const AGI: Record<string, string> = { atlas: 'atlasSpark', aria: 'mic', nova: 'squarePen' }
  function chatSetup(title: string, agent: string = 'atlas') {
    clearAct(); chat.innerHTML = ''; lastSpeaker = null
    const scrollEl = chat.parentElement!
    scrollEl.style.display = 'block'; scrollEl.style.justifyContent = 'flex-start'; scrollEl.style.overflowY = 'auto'
    chat.style.maxWidth = '440px'; chat.style.alignItems = 'stretch'; chat.style.textAlign = 'left'; chat.style.gap = '16px'; chat.style.margin = '0 auto'
    R.scrollBtn.style.display = 'none'
    R.title.innerHTML = ''
    R.root.style.setProperty('--ac', AGC[agent])
    const hd = document.createElement('div')
    hd.style.cssText = 'max-width:440px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:14px 0 10px;opacity:0;transition:opacity .5s ease'
    const ic = document.createElement('div'); ic.className = 'ob-hic'
    ic.style.cssText = `width:44px;height:44px;flex:0 0 auto;border-radius:13px;background:${AGC[agent]};color:#fff;display:flex;align-items:center;justify-content:center;transition:background .4s ease`
    ic.innerHTML = `<span style="width:24px;height:24px;display:block">${svg(AGI[agent])}</span>`
    const h = document.createElement('div')
    h.style.cssText = 'font-size:27px;line-height:1.1;font-weight:700;letter-spacing:-0.025em;color:#0f1012'
    h.textContent = title
    hd.appendChild(ic); hd.appendChild(h); R.title.appendChild(hd)
    requestAnimationFrame(() => { hd.style.opacity = '1' })
  }
  function chatAtlas(text: string, cb?: () => void) {
    text = frText(text)
    const d = document.createElement('div')
    d.style.cssText = 'align-self:flex-start;max-width:92%;font-size:18px;line-height:1.55;color:#26282d;white-space:pre-wrap'
    tighten(d, 'atlas')
    chat.appendChild(d); scrollChat()
    if (replaying) { d.textContent = text; scrollChat(); if (cb) cb(); return }
    let i = 0
    const t = () => { if (i <= text.length) { d.textContent = text.slice(0, i); i++; scrollChat(); setTimeout(t, 22) } else { if (cb) cb() } }
    setTimeout(t, 260)
  }
  function chatUser(text: string) {
    const d = document.createElement('div')
    d.style.cssText = 'align-self:flex-end;max-width:80%;min-height:44px;box-sizing:border-box;display:flex;align-items:center;background:var(--ac);color:#fff;border-radius:16px 16px 5px 16px;padding:8px 14px;font-size:18px;line-height:1.4'
    d.textContent = text; tighten(d, 'user'); chat.appendChild(d); scrollChat()
  }
  // Transforme un élément (option ou déclencheur) en champ de saisie SUR PLACE
  function inlineField(refEl: HTMLElement, placeholder: string, onSubmit: (v: string, box: HTMLElement) => void) {
    const box = document.createElement('div')
    box.style.cssText = 'align-self:stretch;display:flex;align-items:center;gap:6px;border:1px solid #ececf0;background:#fff;border-radius:24px;box-shadow:0 2px 12px rgba(0,0,0,.05);height:44px;box-sizing:border-box;padding:0 8px 0 17px;opacity:0;transition:opacity .25s ease'
    const inp = document.createElement('input'); inp.placeholder = placeholder
    inp.style.cssText = 'flex:1;border:none;outline:none;background:none;font-size:18px;color:#1a1a1a;padding:7px 0'
    const snd = document.createElement('button'); snd.innerHTML = `<span style="width:17px;height:17px;display:block">${svg('send')}</span>`; snd.setAttribute('aria-label', 'Envoyer')
    snd.style.cssText = 'cursor:pointer;width:36px;height:36px;flex:0 0 auto;border:none;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(0,0,0,.08);opacity:.4;transition:opacity .2s'
    const go = () => { const v = inp.value.trim(); if (v) onSubmit(v, box) }
    inp.addEventListener('input', () => { snd.style.opacity = inp.value.trim() ? '1' : '.4' })
    snd.onclick = go; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go() })
    const ib = (n: string, lbl: string) => { const b = document.createElement('button'); b.style.cssText = 'cursor:pointer;width:36px;height:36px;flex:0 0 auto;border:none;background:none;border-radius:50%;color:#9a9ca3;display:flex;align-items:center;justify-content:center'; b.innerHTML = `<span style="width:20px;height:20px;display:block">${svg(n)}</span>`; b.setAttribute('aria-label', lbl); return b }
    box.appendChild(inp); box.appendChild(ib('mic', 'Dictée')); box.appendChild(snd); refEl.replaceWith(box)
    requestAnimationFrame(() => { box.style.opacity = '1' })
    setTimeout(() => { inp.focus(); box.scrollIntoView({ block: 'center' }) }, 40)
    return box
  }
  function chatChoices(items: { label: string; color?: string; editable?: boolean; placeholder?: string }[], onPick: (v: string) => void) {
    const r = takeReplay(); if (r.has) { const v = String(r.v); chatUser(v); onPick(v); return }
    const card = document.createElement('div')
    card.style.cssText = 'display:flex;flex-direction:column;gap:2px;align-self:stretch;margin-top:-2px;opacity:0;transition:opacity .35s ease'
    items.forEach(({ label, color, editable, placeholder }) => {
      const fill = color || 'var(--ac)' // remplissage du rond : couleur DISC sinon couleur de l'agent
      const b = document.createElement('button')
      b.style.cssText = 'width:100%;display:flex;align-items:center;gap:12px;text-align:left;border:none;background:none;border-radius:12px;padding:11px 14px;cursor:pointer;transition:opacity .2s'
      // Rond de sélection (affordance « choisis une réponse ») — vide au départ, se remplit au tap
      const dot = document.createElement('span')
      dot.style.cssText = 'width:20px;height:20px;flex:0 0 auto;box-sizing:border-box;border-radius:50%;border:2px solid #cfd0d6;display:flex;align-items:center;justify-content:center;color:#fff;transition:border-color .2s,background .2s'
      const lbl = document.createElement('span')
      lbl.style.cssText = 'font-size:18px;font-weight:400;color:#2b2d33;line-height:1.4;transition:color .2s,font-weight .2s'
      lbl.textContent = label
      b.appendChild(dot); b.appendChild(lbl)
      const select = () => { dot.style.borderColor = fill; dot.style.background = fill; dot.innerHTML = `<span style="width:12px;height:12px;display:block">${svg('check')}</span>`; lbl.style.color = color || '#0f1012'; lbl.style.fontWeight = '700' }
      b.onclick = () => {
        card.style.pointerEvents = 'none'
        Array.prototype.forEach.call(card.children, (c: HTMLElement) => { if (c !== b) c.style.opacity = '0.3' })
        if (editable) { inlineField(b, placeholder || 'Précise…', (v) => { card.remove(); chatUser(v); recordAnswer(v); onPick(v) }); return }
        select()
        setTimeout(() => { card.remove(); chatUser(label); recordAnswer(label); onPick(label) }, color ? 420 : 240)
      }
      card.appendChild(b)
    })
    chat.appendChild(card); requestAnimationFrame(() => { card.style.opacity = '1' }); scrollChat()
  }
  function chatReveal(code: string, answer: string, cb: () => void) {
    const col = COL[code]
    const archetype = D.gender === 'F' ? col.tf : D.gender === 'N' ? col.tn : col.t
    const wrap = document.createElement('div')
    wrap.style.cssText = 'align-self:flex-start;max-width:94%;display:flex;flex-direction:column;gap:3px;opacity:0;transition:opacity .4s ease'
    tighten(wrap, 'atlas')
    const headerLine = document.createElement('div'); headerLine.style.cssText = 'font-size:18px;line-height:1.55;color:#26282d'
    headerLine.innerHTML = `<span style="color:${col.h};font-weight:700">${archetype}</span>, ta couleur de personnalité est ${col.n}.`
    const body = document.createElement('div'); body.style.cssText = 'font-size:18px;line-height:1.55;color:#26282d;margin-top:4px;white-space:pre-wrap'
    wrap.appendChild(headerLine); wrap.appendChild(body)
    chat.appendChild(wrap); requestAnimationFrame(() => { wrap.style.opacity = '1' }); scrollChat()
    if (replaying) { body.textContent = cardStore['reveal'] || frText(col.l); scrollChat(); cb(); return }
    const frTypo = (s: string) => frText(s)
    let full = ''; let shown = 0; let sdone = false
    const tick = () => { if (shown < full.length) { shown++; body.textContent = full.slice(0, shown); scrollChat(); setTimeout(tick, 22) } else if (sdone) cb(); else setTimeout(tick, 40) }
    setTimeout(tick, 300)
    const fb = () => { if (!full) full = `Tu es ${col.n} — ${archetype}. ${col.l}`; full = frTypo(full); cardStore['reveal'] = full; persistCkpt(); sdone = true }
    fetch('/api/onboarding/color-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_first_name: name, color: code.toUpperCase(), answer, gender: String(D.gender || 'M') }) })
      .then(async (r) => {
        if (!r.ok || !r.body) throw new Error('http')
        const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = ''; let got = false
        for (; ;) { const { done: dn, value } = await rd.read(); if (dn) break; buf += dec.decode(value, { stream: true }); let idx: number; while ((idx = buf.indexOf('\n\n')) >= 0) { const ln = buf.slice(0, idx).trim(); buf = buf.slice(idx + 2); if (!ln.startsWith('data:')) continue; const p = ln.slice(5).trim(); if (p === '[DONE]') continue; try { const j = JSON.parse(p); if (j.text) { got = true; full += j.text } } catch { /* ignore */ } } }
        if (!got) throw new Error('empty'); full = frTypo(full); cardStore['reveal'] = full; persistCkpt(); sdone = true
      })
      .catch(() => fb())
  }
  function chatDropdown(items: string[], opts: { trigger: string; otherInput: string; none?: string }, onPick: (v: string) => void, onOther?: (name: string) => void) {
    const sorted = [...items].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
    const rp = takeReplay()
    if (rp.has) { const v = rp.v as { other?: string } | string; if (v && typeof v === 'object' && v.other != null) { chatUser(String(v.other)); (onOther || onPick)(String(v.other)) } else { chatUser(String(v)); onPick(String(v)) } return }
    const trigger = document.createElement('button')
    trigger.style.cssText = 'align-self:stretch;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #ececf0;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.05);height:44px;box-sizing:border-box;padding:0 16px;cursor:pointer;font-size:18px;font-weight:400;color:#2b2d33;opacity:0;transition:opacity .35s ease'
    const tl = document.createElement('span'); tl.textContent = opts.trigger
    const tc = document.createElement('span'); tc.style.cssText = 'width:18px;height:18px;color:#6b6d73;flex:0 0 auto'; tc.innerHTML = svg('chevron')
    trigger.appendChild(tl); trigger.appendChild(tc); chat.appendChild(trigger)
    requestAnimationFrame(() => { trigger.style.opacity = '1' }); scrollChat()
    const choose = (v: string) => { trigger.remove(); chatUser(v); recordAnswer(v); onPick(v) }
    trigger.onclick = () => {
      const rect = trigger.getBoundingClientRect()
      const bd = document.createElement('div'); bd.style.cssText = 'position:fixed;inset:0;z-index:9998'
      const panel = document.createElement('div'); panel.className = 'ob-noscroll'
      const margin = 14, cap = 320 // ~6 choix visibles, puis scroll
      const spaceBelow = window.innerHeight - rect.top - margin
      const spaceAbove = rect.bottom - margin
      const up = spaceBelow < Math.min(cap, 240) && spaceAbove > spaceBelow
      const maxH = Math.round(Math.min(cap, up ? spaceAbove : spaceBelow))
      const pos = up ? `bottom:${Math.round(window.innerHeight - rect.bottom)}px` : `top:${Math.round(rect.top)}px`
      panel.style.cssText = `position:fixed;z-index:9999;box-sizing:border-box;left:${rect.left}px;${pos};width:${rect.width}px;max-height:${maxH}px;overflow-y:auto;background:#fff;border:1.5px solid #e2e2e8;border-radius:16px;box-shadow:0 16px 44px rgba(0,0,0,.16);text-align:left;opacity:0;transform:translateY(${up ? '6px' : '-6px'});transition:opacity .18s ease,transform .18s ease`
      const close = () => { bd.remove(); panel.remove() }
      bd.onclick = close
      ;[...(opts.none ? [opts.none] : []), ...sorted, 'Autre…'].forEach((c) => {
        const isOther = c === 'Autre…'
        const b = document.createElement('button'); b.style.cssText = `display:block;width:100%;text-align:left;border:none;background:none;padding:14px 18px;font-size:18px;font-weight:400;color:${isOther ? 'var(--ac)' : '#2b2d33'};cursor:pointer;border-radius:10px`
        b.textContent = c
        b.onclick = () => { close(); if (isOther) { inlineField(trigger, opts.otherInput, (v, box) => { box.remove(); chatUser(v); recordAnswer({ other: v }); if (onOther) onOther(v); else onPick(v) }) } else choose(c) }
        panel.appendChild(b)
      })
      document.body.appendChild(bd); document.body.appendChild(panel)
      requestAnimationFrame(() => { panel.style.opacity = '1'; panel.style.transform = 'translateY(0)' })
    }
  }
  // Bouton « Continuer » dans le fil (clôt une famille)
  function chatCta(label: string, fn: () => void) {
    if (replaying) replaying = false // un CTA est toujours le point vivant (fin de famille)
    const b = document.createElement('button')
    b.style.cssText = 'align-self:flex-end;height:44px;box-sizing:border-box;margin-top:6px;cursor:pointer;border:none;border-radius:16px 16px 5px 16px;padding:0 20px;font-size:18px;font-weight:600;color:#fff;background:var(--ac);display:inline-flex;align-items:center;gap:7px;opacity:0;transform:translateY(8px);transition:opacity .5s ease,transform .5s ease'
    b.innerHTML = label + `<span style="width:18px;height:18px;display:block">${svg('arrow')}</span>`
    b.onclick = fn; chat.appendChild(b)
    requestAnimationFrame(() => { b.style.opacity = '1'; b.style.transform = 'translateY(0)' }); scrollChat()
  }
  // Carte « brouillon/simulation » : stream Opus dans une carte + bouton régénérer (max 2 → 3 versions)
  function streamCard(opts: { header: string; endpoint: string; reqBody: (priors: string[]) => Record<string, unknown>; fallback: () => string; store?: (t: string) => void; regenLabel: string; onReady: () => void; tightParagraphs?: boolean; spaceParagraphs?: boolean }) {
    const card = document.createElement('div')
    card.style.cssText = 'align-self:stretch;border:1px solid #ececf0;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.06);opacity:0;transform:translateY(8px);transition:opacity .5s ease,transform .5s ease'
    card.innerHTML = `<div style="padding:11px 16px;border-bottom:1px solid #f2f2f4;font-size:16px;font-weight:600;color:#8a8c93">${opts.header}</div>`
    const body = document.createElement('div'); body.style.cssText = 'padding:16px;font-size:18px;line-height:1.55;color:#26282d;min-height:54px;white-space:pre-wrap'
    card.appendChild(body); chat.appendChild(card); requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)' }); scrollChat()
    if (cardStore[opts.header] != null) {
      const t2 = frText(cardStore[opts.header])
      if (opts.spaceParagraphs) body.innerHTML = t2.split(/\n+/).map((x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<div style="height:10px"></div>')
      else body.textContent = opts.tightParagraphs ? t2.replace(/\n{2,}/g, '\n') : t2
      if (opts.store) opts.store(cardStore[opts.header]); scrollChat(); opts.onReady(); return
    }
    let busy = false
    const priors: string[] = []
    const generate = (follow: boolean, done2: () => void) => {
      busy = true
      let full = ''; let shown = 0; let mdone = false; body.textContent = ''
      const tick = () => { if (shown < full.length) { shown++; const t = frText(full.slice(0, shown)); if (opts.spaceParagraphs) { body.innerHTML = t.split(/\n+/).map((x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<div style="height:10px"></div>') } else { body.textContent = opts.tightParagraphs ? t.replace(/\n{2,}/g, '\n') : t } if (follow) scrollChat(); setTimeout(tick, 16) } else if (mdone) { busy = false; done2() } else setTimeout(tick, 40) }
      setTimeout(tick, follow ? 360 : 140)
      const fb = () => { if (!full) full = opts.fallback(); if (opts.store) opts.store(full); cardStore[opts.header] = full; persistCkpt(); priors.push(full); mdone = true }
      fetch(opts.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts.reqBody(priors)) })
        .then(async (resp) => {
          if (!resp.ok || !resp.body) throw new Error('http')
          const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = ''; let got = false
          for (; ;) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let idx: number; while ((idx = buf.indexOf('\n\n')) >= 0) { const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 2); if (!line.startsWith('data:')) continue; const payload = line.slice(5).trim(); if (payload === '[DONE]') continue; try { const j = JSON.parse(payload); if (j.text) { got = true; full += j.text } } catch { /* ignore */ } } }
          if (!got) throw new Error('empty'); if (opts.store) opts.store(full); cardStore[opts.header] = full; persistCkpt(); priors.push(full); mdone = true
        })
        .catch(() => fb())
    }
    let regensLeft = 2
    const labelHtml = () => `<span style="width:15px;height:15px;display:block">${svg('refresh')}</span><span>${opts.regenLabel} · ${regensLeft} restante${regensLeft > 1 ? 's' : ''}</span>`
    const buildRegen = () => {
      const row = document.createElement('button')
      row.style.cssText = 'align-self:flex-end;display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#8a8c93;font-size:16px;padding:2px;margin-top:-4px;opacity:0;transition:opacity .4s ease'
      row.innerHTML = labelHtml()
      row.onclick = () => {
        if (busy || regensLeft <= 0) return
        regensLeft--
        row.style.opacity = '.4'; row.style.pointerEvents = 'none'
        card.scrollIntoView({ block: 'center' })
        generate(false, () => { if (regensLeft <= 0) row.remove(); else { row.innerHTML = labelHtml(); row.style.opacity = '1'; row.style.pointerEvents = 'auto' } })
      }
      chat.appendChild(row); requestAnimationFrame(() => { row.style.opacity = '1' }); scrollChat()
    }
    generate(true, () => { buildRegen(); opts.onReady() })
  }
  // Reconnaissance du domaine selon la société (Atlas « connaît » le terrain)
  const DOMAINS: Record<string, string> = {
    'herbalife': 'la nutrition et le bien-être',
    'forever living': "le bien-être à l'aloe vera",
    'amway': 'le bien-être et la maison',
    'oriflame': 'la beauté et la cosmétique',
    'nht global': 'le bien-être',
    'doterra': 'les huiles essentielles',
    'young living': 'les huiles essentielles',
    'mary kay': 'la cosmétique',
    'tupperware': "l'art de la table",
  }
  const ackSociete = (s: string) => {
    if (s.indexOf('Pas encore') >= 0) return "Pas de souci : tu ajouteras ta société dans ton tableau de bord quand tu veux. En attendant, tu peux déjà parler d'Atline à ceux qui font déjà du marketing de réseau. On s'y met."
    const d = DOMAINS[s.toLowerCase()]
    if (d) return `${s} — ${d}. Un terrain que je connais : j'adapterai mes conseils et tes scripts à ce marché.`
    return `${s}, noté. J'adapterai mes conseils à ton activité.`
  }
  // Société hors liste : le nom est déjà saisi (champ inline) → Atlas demande le secteur, puis adapte
  const SECTORS: { label: string; dom: string }[] = [
    { label: 'Santé & bien-être', dom: 'la santé et le bien-être' },
    { label: 'Beauté & cosmétique', dom: 'la beauté et la cosmétique' },
    { label: 'Maison & lifestyle', dom: 'la maison et le lifestyle' },
  ]
  function customSociete(name: string, then: () => void) {
    D.network = name
    const done = (val: string, known: boolean) => {
      const dom = known ? SECTORS.find((x) => x.label === val)!.dom : val.toLowerCase()
      const cap = `${dom.charAt(0).toUpperCase()}${dom.slice(1)}`
      const ack = known
        ? `${cap} — un terrain que je connais bien : j'adapterai mes conseils et tes scripts à ce marché.`
        : `${cap}, noté : j'adapterai mes conseils et tes scripts à ce marché.`
      chatAtlas(ack, () => askExperience(then))
    }
    chatAtlas(`${name}, je ne connais pas encore — c'est quel secteur ?`, () => {
      chatDropdown(SECTORS.map((s) => s.label), { trigger: 'Sélectionne ton secteur', otherInput: 'Ton secteur…' },
        (v) => done(v, true), (v) => done(v, false))
    })
  }
  // La conversation « Parlons de toi » : couleur → bulle → révélation → société → bulle → accusé domaine → Continuer
  function parlonsDeToi(then: () => void) {
    chatSetup('Parlons de toi'); setProgPct(15)
    chatAtlas(`Faisons connaissance. D'abord, je m'adresse à toi…`, () => {
      chatChoices([{ label: 'Au masculin' }, { label: 'Au féminin' }, { label: 'Au neutre' }], (g) => {
        D.gender = g.indexOf('fémin') >= 0 ? 'F' : g.indexOf('neutre') >= 0 ? 'N' : 'M'
        chatAtlas('Face à une opportunité, tu réagis comment ?', () => {
          chatChoices([
            { label: "Je fonce, résultats d'abord", color: '#EF4444' },
            { label: 'Je veux des preuves', color: '#22C55E' },
            { label: "Je pense d'abord aux gens", color: '#F4B342' },
            { label: "L'énergie et le plaisir d'abord", color: '#3B82F6' },
          ], (v) => {
            const c = v.indexOf('fonce') >= 0 ? 'rouge' : v.indexOf('preuve') >= 0 ? 'vert' : v.indexOf('gens') >= 0 ? 'jaune' : 'bleu'
            D.personality = c.toUpperCase()
            chatReveal(c, v, () => {
              chatAtlas('Et avec quelle société travailles-tu ?', () => {
                chatDropdown(MLM, { trigger: 'Sélectionne ta société', otherInput: 'Nom de ta société…', none: 'Pas encore de société' }, (v2) => {
                  if (v2.indexOf('Pas encore') < 0) D.network = v2; else D.mode = 'ATLINE'
                  chatAtlas(ackSociete(v2), () => {
                    if (D.mode === 'ATLINE') { D.experience = 'debutant'; chatCta('Continuer', then); return }
                    askExperience(then)
                  })
                }, (name) => customSociete(name, then))
              })
            })
          })
        })
      })
    })
  }
  // Aiguillage débutant/établi (nourrit le gate du plan : établi → session Diagnostic ; débutant → Bon Départ).
  // Posé quelle que soit la façon de renseigner la société (liste OU saisie libre « Autre… »).
  function askExperience(then: () => void) {
    chatAtlas('Et où tu en es avec cette activité ?', () => {
      chatChoices([{ label: 'Je démarre' }, { label: "J'ai déjà une activité qui tourne" }], (e) => {
        D.experience = e.indexOf('démarre') >= 0 ? 'debutant' : 'etabli'
        objectifs(then)
      })
    })
  }
  // Objectif de l'user (oriente Atlas : vente / recrutement / développement)
  function objectifs(then: () => void) {
    chatAtlas('Et ton objectif, en priorité ?', () => {
      chatChoices([
        { label: 'Trouver mes premiers clients' },
        { label: 'Trouver mes premiers partenaires' },
        { label: 'Développer mon réseau' },
      ], (o) => {
        D.objective = o.indexOf('clients') >= 0 ? 'CLIENTS' : o.indexOf('partenaires') >= 0 ? 'PARTENAIRES' : 'RESEAU'
        const ack = D.objective === 'CLIENTS' ? 'La vente, donc. On affûtera ton approche et tes preuves produit.'
          : D.objective === 'PARTENAIRES' ? 'Recruter tes premiers partenaires — on travaillera ton pitch d\'opportunité.'
          : 'Développer ton réseau : cap sur l\'équipe et la duplication.'
        chatAtlas(ack, () => chatCta('Continuer', then))
      })
    })
  }

  // Saisie texte libre DANS le fil (pastille app, sur place)
  function chatAskText(placeholder: string, onSend: (v: string) => void) {
    const r = takeReplay(); if (r.has) { const v = String(r.v); chatUser(v); onSend(v); return }
    const anchor = document.createElement('div'); chat.appendChild(anchor); scrollChat()
    inlineField(anchor, placeholder, (v, box) => { box.remove(); chatUser(v); recordAnswer(v); onSend(v) })
  }
  // La preuve : message Opus tapé en live dans une carte-brouillon, PUIS « prêt sur ton accueil » (pas d'envoi ici — B)
  function chatProof(then: () => void) {
    chatAtlas(`Voilà ce que j'enverrais à ${firstName}, à ta place :`, () => {
      streamCard({
        header: `Brouillon pour ${contactName}`,
        endpoint: '/api/onboarding/first-message',
        reqBody: () => ({ user_first_name: name, contact_name: contactName, market: String(D.market || ''), color: String(D.personality || ''), business: String(D.network || ''), contact_color: String(D.contactColor || ''), atline: D.mode === 'ATLINE' }),
        fallback: () => draftMessage(),
        store: (t) => { D.message = t },
        regenLabel: 'Une autre version',
        onReady: () => chatAtlas('Je te le garde sur ton tableau de bord, prêt à envoyer : WhatsApp, SMS ou e-mail.', () => chatCta('Continuer', then)),
      })
    })
  }
  // Accusé du tempérament du prospect (annonce comment Atlas va adapter le message)
  const ackContact = (c: string) => ({
    ROUGE: `Quelqu'un qui fonce : j'irai droit au but, du concret, zéro détour.`,
    VERT: `Quelqu'un qui veut des preuves : je resterai clair et précis, sans pression.`,
    JAUNE: `Quelqu'un tourné vers le lien : je miserai sur la chaleur et la sincérité.`,
    BLEU: `Quelqu'un qui déborde d'énergie : je garderai un ton vivant et positif.`,
  }[c] || `Pas de souci — je reste sur un ton naturel, qui passe avec tout le monde.`)
  // F2 — Ton premier prospect : prénom → relation (marché) → couleur → message déposé
  function tonPremierProspect(then: () => void) {
    chatSetup('Ton premier prospect'); setProgPct(42)
    chatAtlas(D.mode === 'ATLINE' ? 'Qui, dans ton entourage, fait déjà du marketing de réseau ?' : 'À qui penses-tu en premier ?', () => {
      chatAskText('Son prénom…', (v) => {
        firstName = titleCase(v.split(' ')[0]); contactName = firstName; D.contactFirstName = firstName
        chatAtlas(`${firstName}, c'est plutôt…`, () => {
          chatChoices([{ label: 'Famille' }, { label: 'Amis' }, { label: 'Connaissance' }], (rel) => {
            contactMarche = rel; D.market = marketCode(rel)
            chatAtlas(`Et ${firstName}, c'est quel tempérament ?`, () => {
              chatChoices([
                { label: 'Fonce, droit au but', color: '#EF4444' },
                { label: 'Veut des preuves', color: '#22C55E' },
                { label: 'Proche des gens', color: '#F4B342' },
                { label: "Déborde d'énergie", color: '#3B82F6' },
                { label: 'Je ne sais pas trop' },
              ], (desc) => {
                D.contactColor = desc.indexOf('Fonce') >= 0 ? 'ROUGE' : desc.indexOf('preuves') >= 0 ? 'VERT' : desc.indexOf('gens') >= 0 ? 'JAUNE' : desc.indexOf('énergie') >= 0 ? 'BLEU' : ''
                chatAtlas(ackContact(String(D.contactColor)), () => chatProof(then))
              })
            })
          })
        })
      })
    })
  }

  // F3 — Ton équipe : une page dédiée par agent (1 wow + 1 couleur chacun), bouchées live
  // Liste à puces (point coloré à l'accent de l'agent) — présentation scannable
  function chatList(items: string[]) {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'align-self:flex-start;display:flex;flex-direction:column;gap:9px;margin:2px 0 13px;opacity:0;transition:opacity .4s ease'
    items.forEach((t) => {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;font-size:18px;line-height:1.55;color:#26282d'
      row.innerHTML = `<span style="flex:0 0 auto;height:1.55em;display:flex;align-items:center"><span style="width:7px;height:7px;border-radius:50%;background:var(--ac)"></span></span><span>${frText(t)}</span>`
      wrap.appendChild(row)
    })
    tighten(wrap, 'atlas'); chat.appendChild(wrap); requestAnimationFrame(() => { wrap.style.opacity = '1' }); scrollChat()
  }
  function ariaPage(then: () => void) {
    chatSetup('Deviens imparable', 'aria'); setProgPct(62)
    chatAtlas(`Moi c'est Aria, ta coach terrain.`, () => {
      chatList([
        `Je simule ${firstName} et ses objections`,
        `On rejoue jusqu'au réflexe`,
        `Débrief : ton émotion, tes points à corriger`,
      ])
      const cc = String(D.contactColor || '')
      const setup = cc === 'ROUGE' ? `${firstName} fonce : attends-toi à du frontal, du chiffré.`
        : cc === 'VERT' ? `${firstName} veut des preuves : du scepticisme, du factuel.`
        : cc === 'JAUNE' ? `${firstName} mise sur le lien : du doux, du relationnel.`
        : cc === 'BLEU' ? `${firstName} déborde d'énergie : du spontané, ça va vite.`
        : `${firstName} — voici une objection probable :`
      chatAtlas(setup, () => {
        streamCard({
          header: `Simulation · appel avec ${firstName}`,
          endpoint: '/api/onboarding/agent-taste',
          reqBody: (priors) => ({ agent: 'aria', user_first_name: name, contact_name: contactName, market: String(D.market || ''), color: String(D.personality || ''), contact_color: String(D.contactColor || ''), business: String(D.network || ''), avoid: priors.join(' || '), atline: D.mode === 'ATLINE' }),
          fallback: () => `${firstName} : « j'ai pas le temps là. »\nToi : « Justement, 10 minutes cette semaine et tu juges par toi-même. »`,
          regenLabel: 'Une autre objection',
          spaceParagraphs: true,
          onReady: () => chatAtlas(`Première parade en poche. Je transmets ton débrief à Atlas, il ajuste ton plan.`, () => chatCta('Continuer', then)),
        })
      })
    })
  }
  function novaPage(then: () => void) {
    chatSetup('Plus de contacts', 'nova'); setProgPct(80)
    chatAtlas(`Moi c'est Nova, l'autre moitié de l'équipe.`, () => {
      chatList([
        `Je crée tes publications qui attirent`,
        `Je repère qui s'intéresse déjà à ton marché`,
        `Tes nouveaux contacts, direct dans ta liste`,
      ])
      chatAtlas(`Un exemple pour ton activité :`, () => {
        streamCard({
          header: `Publication · ${D.mode === 'ATLINE' ? 'Atline' : String(D.network || 'ton marché')}`,
          endpoint: '/api/onboarding/agent-taste',
          reqBody: (priors) => ({ agent: 'nova', business: String(D.network || ''), color: String(D.personality || ''), avoid: priors.join(' || '), atline: D.mode === 'ATLINE' }),
          fallback: () => `Et si on arrêtait de subir nos journées ?\n\nJe partage des routines simples qui changent tout. Curieux ? Écris-moi en message privé.`,
          regenLabel: 'Une autre idée',
          tightParagraphs: true,
          onReady: () => chatAtlas(`Leurs réponses, tous réseaux, au même endroit : ta messagerie unifiée.`, () => chatCta('Continuer', then)),
        })
      })
    })
  }

  // Pastille « action déposée » (icône à la couleur de l'agent qui la porte, pas d'emoji)
  function actionChip(icon: string, color: string, text: string) {
    const d = document.createElement('div')
    d.style.cssText = 'align-self:stretch;display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #ececf0;border-radius:14px;padding:13px 15px;box-shadow:0 4px 16px rgba(0,0,0,.06);opacity:0;transform:translateY(6px);transition:opacity .4s ease,transform .4s ease'
    d.innerHTML = `<span style="width:36px;height:36px;flex:0 0 auto;border-radius:10px;background:color-mix(in srgb,${color} 13%,#fff);color:${color};display:flex;align-items:center;justify-content:center"><span style="width:18px;height:18px;display:block">${svg(icon)}</span></span><span style="font-size:18px;line-height:1.4;font-weight:500;color:#26282d">${text}</span>`
    tighten(d, 'atlas'); chat.appendChild(d); requestAnimationFrame(() => { d.style.opacity = '1'; d.style.transform = 'translateY(0)' }); scrollChat()
  }
  // Page finale (hyper sobre) : titre → 3 actions déposées (couleur d'agent) → message de coach → lancement
  function cestParti() {
    chatSetup(`C'est parti, ${name}.`, 'atlas'); setProgPct(100)
    chatAtlas(`Ta première action est prête, il ne reste qu'à l'envoyer :`, () => {
      actionChip('send', AGC.atlas, `Ton message à ${firstName}, prêt à envoyer`)
      actionChip('mic', AGC.aria, `Aria t'entraîne quand tu veux répéter`)
      actionChip('squarePen', AGC.nova, `Nova te crée tes posts dès que tu es prêt`)
      chatAtlas(`Mon rôle désormais : que chaque jour te rapproche du but, et que tu ne doutes jamais du prochain pas. Avançons.`, () => {
        chatCta('Ouvrir Atline', finish)
      })
    })
  }

  // Page 0 (hero) — unique entrée ; tout le reste passe par runFamily
  function startHero() {
    R.title.innerHTML = ''
    R.back.style.display = 'none'
    setProgPct(5)
    setAg('atlas')
    heroIntro([
      `Bonjour ${name}`,
      "Moi c'est Atlas, ton coach IA en marketing de réseau. Je fais de toi un pro et je t'aide à développer ton business. Des preuves, pas des promesses.",
    ], 'On y va', () => runFamily(0))
  }
  // ── Familles + reprise FINE au refresh ──
  const families: ((then: () => void) => void)[] = [parlonsDeToi, tonPremierProspect, ariaPage, novaPage]
  function runFamily(i: number) {
    curFamilyIdx = i
    if (!replaying) { recAnswers = []; persistCkpt() }
    if (i < families.length) families[i](() => runFamily(i + 1)); else cestParti()
  }
  // Un vrai rechargement rejoue la famille en cours jusqu'à l'étape exacte ; une navigation fraîche repart de la page 0.
  const navType = (() => { try { return (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type } catch { return undefined } })()
  let resumed = false
  if (navType === 'reload') {
    try {
      const c = JSON.parse(sessionStorage.getItem(OB_CKPT) || 'null')
      if (c && typeof c.i === 'number' && c.i >= 0) {
        Object.assign(D, c.D || {}); firstName = c.firstName || firstName; contactName = c.contactName || contactName; contactMarche = c.contactMarche || contactMarche
        if (c.cards) Object.assign(cardStore, c.cards)
        recAnswers = Array.isArray(c.answers) ? c.answers : []
        replayQueue.push(...recAnswers)
        replaying = true // tourne en instantané jusqu'à la 1ʳᵉ étape vivante (réponse manquante ou CTA)
        runFamily(c.i); resumed = true
      }
    } catch { /* ignore */ }
  }
  if (!resumed) { try { sessionStorage.removeItem(OB_CKPT) } catch { /* ignore */ } ; startHero() }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { update } = useSession()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const chatRef = useRef<HTMLDivElement | null>(null)
  const actRef = useRef<HTMLDivElement | null>(null)
  const progRef = useRef<HTMLDivElement | null>(null)
  const backRef = useRef<HTMLButtonElement | null>(null)
  const scrollBtnRef = useRef<HTMLButtonElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const nameRef = useRef('là')
  const started = useRef(false)
  const previewRef = useRef(false)

  useEffect(() => {
    let active = true
    // Mode test (?preview=1) : on rejoue l'onboarding même si déjà complété, SANS rien réécrire en base.
    const preview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1'
    previewRef.current = preview
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then(async (u: { firstName?: string; onboardingCompleted?: boolean } | null) => {
      if (!active) return
      if (u?.onboardingCompleted && !preview) {
        // Déjà complété en base mais JWT périmé → on rafraîchit le token AVANT de naviguer,
        // sinon le middleware reboucle vers /onboarding = page blanche infinie.
        try { await update() } catch { /* ignore */ }
        window.location.href = '/welcome'
        return
      }
      if (u?.firstName) nameRef.current = u.firstName
      setLoaded(true)
    }).catch(() => { if (active) setLoaded(true) })
    return () => { active = false }
  }, [])

  // Attribution parrainage (cookie atline_ref) — couvre l'inscription Google
  useEffect(() => {
    fetch('/api/affiliation/attribute', { method: 'POST' }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!loaded || started.current) return
    if (!rootRef.current || !chatRef.current || !actRef.current || !progRef.current || !backRef.current || !scrollBtnRef.current || !titleRef.current) return
    started.current = true
    runEngine(
      { root: rootRef.current, chat: chatRef.current, act: actRef.current, prog: progRef.current, back: backRef.current, scrollBtn: scrollBtnRef.current, title: titleRef.current },
      nameRef.current,
      async (D) => {
        // Mode test : on ne réécrit rien, on revient juste à l'accueil
        if (previewRef.current) { window.location.href = '/welcome'; return }
        try { await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(D) }) } catch { /* non bloquant */ }
        // CRITIQUE : rafraîchir le JWT (onboardingCompleted) sinon le middleware re-redirige vers /onboarding → boucle
        try { await update() } catch { /* ignore */ }
        // Navigation dure : garantit que le middleware relit le cookie de session frais
        window.location.href = '/welcome'
      },
    )
  }, [loaded, router, update])

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', background: '#f5f4f1', display: 'flex', justifyContent: 'center', overflow: 'hidden', overscrollBehavior: 'none', fontFamily: 'var(--font-sans, inherit)' }}>
      <style>{`@keyframes obdot{0%,60%,100%{opacity:.25}30%{opacity:1}}.ob-noscroll{scrollbar-width:none}.ob-noscroll::-webkit-scrollbar{display:none}`}</style>
      <div ref={rootRef} style={{ ['--ac' as string]: '#F97316', position: 'relative', width: '100%', maxWidth: 480, height: '100dvh', display: 'flex', flexDirection: 'column', background: '#f5f4f1' } as React.CSSProperties}>
        <div style={{ height: 3, background: '#f0f0f2' }}><div ref={progRef} style={{ height: '100%', width: '5%', background: 'var(--ac)', transition: 'width .4s, background .5s' }} /></div>
        <button ref={backRef} aria-label="Retour" style={{ position: 'absolute', top: 'max(14px, calc(env(safe-area-inset-top) + 8px))', left: 12, zIndex: 5, display: 'none', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, border: 'none', background: 'none', color: '#b4b6bd', cursor: 'pointer' }}><span style={{ width: 22, height: 22, display: 'block' }} dangerouslySetInnerHTML={{ __html: svg('chevronLeft') }} /></button>
        <div ref={titleRef} style={{ flexShrink: 0, position: 'relative', zIndex: 3, background: '#f5f4f1', padding: '0 20px' }} />
        <div className="ob-noscroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'none', padding: '10px 20px 8px' }}>
          <div ref={chatRef} style={{ maxWidth: 360, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }} />
        </div>
        <button ref={scrollBtnRef} aria-label="Revenir en bas" style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 6, display: 'none', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', border: '1px solid #e6e7eb', background: '#fff', color: '#6b6d73', boxShadow: '0 4px 16px rgba(0,0,0,.14)', cursor: 'pointer' }}><span style={{ width: 20, height: 20, display: 'block' }} dangerouslySetInnerHTML={{ __html: svg('chevron') }} /></button>
        <div ref={actRef} style={{ padding: '10px 16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }} />
      </div>
    </div>
  )
}

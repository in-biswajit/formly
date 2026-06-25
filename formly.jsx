import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// ─── helpers ───────────────────────────────────────────────────────────────
const API = "/api";
const uid = () => Math.random().toString(36).slice(2, 9);
const TYPE_LABELS = {
  section: "Section header",
  short: "Short answer",
  long: "Paragraph",
  radio: "Multiple choice",
  checkbox: "Checkboxes",
  dropdown: "Dropdown",
  scale: "Linear scale",
  date: "Date",
};

// ─── BRUTALIST TOKENS ───────────────────────────────────────────────────────
const ACCENT   = "#FF2200";       // brutal red
const YELLOW   = "#FFE500";       // highlight yellow
const DARK     = "#0A0A0A";       // near-black
const BG       = "#FFFFF0";       // cream
const WHITE    = "#FFFFFF";
const BORDER   = `3px solid ${DARK}`;
const SHADOW   = `4px 4px 0 ${DARK}`;
const FONT     = "'Courier New', Courier, monospace";

const defaultQuestions = () => [
  { id: uid(), label: "Project Details", type: "section", options: [], required: false },
  { id: uid(), label: "Project Title", type: "short", options: [], required: true },
  { id: uid(), label: "Proposal Type", type: "checkbox", options: ["Business Proposal","Project Proposal","Startup Proposal","Technical Proposal","Research Proposal","Funding Proposal","Other"], required: false },
  { id: uid(), label: "Proposal Type Comments", type: "short", options: [], required: false },
  { id: uid(), label: "Industry", type: "checkbox", options: ["Software & IT","AI & Automation","E-commerce","Healthcare","Education","Finance","Real Estate","Manufacturing","Marketing","Construction","Agriculture","Other"], required: false },
  { id: uid(), label: "Industry Comments", type: "short", options: [], required: false },
  { id: uid(), label: "Describe Your Project", type: "long", options: [], required: true },
  { id: uid(), label: "Problem Statement", type: "long", options: [], required: true },
  { id: uid(), label: "Goals & Objectives", type: "long", options: [], required: true },
  { id: uid(), label: "Target Audience / Users", type: "short", options: [], required: false },
  { id: uid(), label: "Additional Project Details", type: "short", options: [], required: false },
  { id: uid(), label: "Requirements", type: "section", options: [], required: false },
  { id: uid(), label: "Services Needed", type: "checkbox", options: ["Web Development","Mobile App Development","UI/UX Design","AI Integration","Automation","Dashboard Development","API Development","Cloud Infrastructure","Digital Marketing","Consulting","Research","Other"], required: false },
  { id: uid(), label: "Services Comments", type: "short", options: [], required: false },
  { id: uid(), label: "Key Features / Deliverables", type: "long", options: [], required: true },
  { id: uid(), label: "Expected Outcomes", type: "short", options: [], required: false },
  { id: uid(), label: "Technical Requirements", type: "short", options: [], required: false },
  { id: uid(), label: "Additional Requirements Comments", type: "short", options: [], required: false },
  { id: uid(), label: "Final Notes", type: "section", options: [], required: false },
  { id: uid(), label: "Anything Else We Should Know?", type: "short", options: [], required: false },
  { id: uid(), label: "Final Notes & Special Instructions", type: "short", options: [], required: false },
];

let GLOBAL_QUESTIONS = defaultQuestions();
let GLOBAL_TITLE = "AI Proposal Requirement Form";
let GLOBAL_DESC = "Provide project requirements to generate a professional AI-powered proposal.";
let GLOBAL_RESPONSES = [];

// ─── ICONS ─────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, color, verticalAlign: "middle" }} aria-hidden="true" />
);

// ─── TOAST ─────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: DARK, color: YELLOW, border: `2px solid ${YELLOW}`,
      padding: "10px 20px", fontSize: 13, zIndex: 9999,
      boxShadow: `3px 3px 0 ${YELLOW}`,
      display: "flex", alignItems: "center", gap: 8,
      fontFamily: FONT, fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.04em"
    }}>
      <Icon name="check" size={14} color={YELLOW} /> {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW: BUILDER
// ═══════════════════════════════════════════════════════════════════════════
function Builder({ onShare, onViewResponses }) {
  const [questions, setQuestions] = useState(GLOBAL_QUESTIONS);
  const [title, setTitle]         = useState(GLOBAL_TITLE);
  const [desc, setDesc]           = useState(GLOBAL_DESC);
  const [activeId, setActiveId]   = useState(null);
  const [toast, setToast]         = useState(null);

  const saveTimer = useRef(null);
  useEffect(() => { GLOBAL_QUESTIONS = questions; }, [questions]);
  useEffect(() => { GLOBAL_TITLE = title; }, [title]);
  useEffect(() => { GLOBAL_DESC = desc; }, [desc]);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`${API}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, desc, questions }),
      });
    }, 800);
  }, [questions, title, desc]);

  const addQ      = () => { const q = { id: uid(), label: "", type: "short", options: [], required: false }; setQuestions(qs => [...qs, q]); setActiveId(q.id); };
  const deleteQ   = (id) => setQuestions(qs => qs.filter(q => q.id !== id));
  const dupQ      = (id) => { setQuestions(qs => { const idx = qs.findIndex(q => q.id === id); const copy = { ...qs[idx], id: uid(), options: [...qs[idx].options], label: qs[idx].label + " (copy)" }; const next = [...qs]; next.splice(idx + 1, 0, copy); return next; }); };
  const moveQ     = (id, dir) => { setQuestions(qs => { const idx = qs.findIndex(q => q.id === id); const newIdx = idx + dir; if (newIdx < 0 || newIdx >= qs.length) return qs; const next = [...qs]; [next[idx], next[newIdx]] = [next[newIdx], next[idx]]; return next; }); };
  const updateQ   = (id, patch) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
  const updateOpt = (id, oi, val) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, options: q.options.map((o, i) => i === oi ? val : o) } : q));
  const addOpt    = (id) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, options: [...q.options, "Option " + (q.options.length + 1)] } : q));
  const removeOpt = (id, oi) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, options: q.options.filter((_, i) => i !== oi) } : q));

  const handleShare = () => {
    const url = `${window.location.href.split("#")[0]}#fill`;
    navigator.clipboard.writeText(url).catch(() => {});
    setToast(`LINK COPIED: ${url}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 80, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        background: DARK, borderBottom: `4px solid ${DARK}`, position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", padding: "0 24px", height: 60, gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: ACCENT, border: `2px solid ${YELLOW}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="forms" size={18} color={WHITE} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: WHITE, letterSpacing: "0.06em", textTransform: "uppercase" }}>FORMLY</span>
        </div>
        <TabBar onViewResponses={onViewResponses} active="edit" />
        <div style={{ marginLeft: "auto" }}>
          <button onClick={handleShare} style={btnStyle("outline-inv")}>
            <Icon name="share" size={14} color={DARK} /> SHARE
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 0" }}>
        {/* Form header card */}
        <div style={{ background: WHITE, border: BORDER, boxShadow: SHADOW, padding: "22px 26px", marginBottom: 16 }}>
          <div style={{ borderLeft: `6px solid ${ACCENT}`, paddingLeft: 12, marginBottom: 12 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="FORM TITLE"
              style={headerInputStyle(20)} />
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Form description..."
              style={headerInputStyle(13, true)} />
          </div>
        </div>

        {questions.map((q, i) => (
          <QuestionCard key={q.id} q={q} idx={i} total={questions.length}
            active={activeId === q.id} onActivate={() => setActiveId(q.id)}
            onUpdate={patch => updateQ(q.id, patch)} onDelete={() => deleteQ(q.id)}
            onDup={() => dupQ(q.id)} onMove={dir => moveQ(q.id, dir)}
            onUpdateOpt={(oi, val) => updateOpt(q.id, oi, val)}
            onAddOpt={() => addOpt(q.id)} onRemoveOpt={oi => removeOpt(q.id, oi)}
          />
        ))}

        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <button onClick={addQ} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: WHITE, border: `2px dashed ${DARK}`, padding: "10px 28px",
            fontSize: 13, color: DARK, cursor: "pointer", fontWeight: 700,
            fontFamily: FONT, letterSpacing: "0.06em", textTransform: "uppercase"
          }}>
            <Icon name="plus" size={15} color={DARK} /> ADD QUESTION
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function TabBar({ active, onViewResponses, onEditForm }) {
  const tab = (label, isActive, onClick) => (
    <button onClick={onClick} style={{
      background: isActive ? YELLOW : "transparent",
      border: isActive ? `2px solid ${YELLOW}` : "2px solid transparent",
      borderBottom: isActive ? `2px solid ${YELLOW}` : "2px solid transparent",
      padding: "8px 16px", fontSize: 12, color: isActive ? DARK : "#aaa",
      cursor: isActive ? "default" : "pointer", fontWeight: 700,
      fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase"
    }}>{label}</button>
  );
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {tab("Questions", active === "edit",      active !== "edit"      ? onEditForm      : undefined)}
      {tab("Responses", active === "responses", active !== "responses" ? onViewResponses : undefined)}
    </div>
  );
}

function QuestionCard({ q, idx, total, active, onActivate, onUpdate, onDelete, onDup, onMove, onUpdateOpt, onAddOpt, onRemoveOpt }) {
  const needsOpts = ["radio", "checkbox", "dropdown"].includes(q.type);
  const isSection = q.type === "section";

  if (isSection) {
    return (
      <div onClick={onActivate} style={{
        background: YELLOW, border: BORDER, boxShadow: active ? SHADOW : "2px 2px 0 " + DARK,
        padding: "12px 18px", marginBottom: 12, cursor: "pointer"
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: DARK, letterSpacing: "0.1em" }}>§</span>
          <input value={q.label} onChange={e => onUpdate({ label: e.target.value })}
            onClick={e => e.stopPropagation()} placeholder="SECTION TITLE"
            style={{ flex: 1, fontSize: 13, fontWeight: 700, border: "none", outline: "none",
              background: "transparent", color: DARK, fontFamily: FONT, letterSpacing: "0.06em", textTransform: "uppercase" }}
          />
          <select value={q.type}
            onChange={e => { const t = e.target.value; onUpdate({ type: t, options: ["radio","checkbox","dropdown"].includes(t) && q.options.length === 0 ? ["Option 1","Option 2"] : q.options }); }}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, border: `2px solid ${DARK}`, padding: "3px 6px", background: WHITE, color: DARK, cursor: "pointer", outline: "none", fontFamily: FONT }}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {active && (
          <div style={{ display: "flex", gap: 4, marginTop: 10, paddingTop: 8, borderTop: `2px solid ${DARK}` }}>
            <button onClick={e => { e.stopPropagation(); onDup(); }} style={iconBtnStyle()} title="Duplicate"><Icon name="copy" size={14} color={DARK} /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} style={iconBtnStyle()} title="Delete"><Icon name="trash" size={14} color={ACCENT} /></button>
            <button onClick={e => { e.stopPropagation(); onMove(-1); }} disabled={idx === 0} style={iconBtnStyle()}><Icon name="arrow-up" size={14} color={idx === 0 ? "#aaa" : DARK} /></button>
            <button onClick={e => { e.stopPropagation(); onMove(1); }} disabled={idx === total - 1} style={iconBtnStyle()}><Icon name="arrow-down" size={14} color={idx === total - 1 ? "#aaa" : DARK} /></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div onClick={onActivate} style={{
      background: WHITE, border: BORDER,
      borderLeft: active ? `6px solid ${ACCENT}` : `6px solid ${DARK}`,
      boxShadow: active ? SHADOW : "2px 2px 0 " + DARK,
      padding: "18px 20px", marginBottom: 12, cursor: "pointer",
    }}>
      {/* top row */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input value={q.label} onChange={e => onUpdate({ label: e.target.value })}
          onClick={e => e.stopPropagation()} placeholder="Question text..."
          style={{ flex: 1, fontSize: 14, fontWeight: 700, border: "none",
            borderBottom: `2px solid ${DARK}`, outline: "none", padding: "4px 0",
            background: "transparent", color: DARK, fontFamily: FONT }}
        />
        <select value={q.type}
          onChange={e => { const t = e.target.value; onUpdate({ type: t, options: ["radio","checkbox","dropdown"].includes(t) && q.options.length === 0 ? ["Option 1","Option 2"] : q.options }); }}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 11, border: `2px solid ${DARK}`, padding: "5px 8px", background: BG,
            color: DARK, cursor: "pointer", outline: "none", fontFamily: FONT, fontWeight: 700 }}>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* body */}
      <div style={{ marginTop: 14 }}>
        {q.type === "short" && <div style={{ borderBottom: `2px dashed ${DARK}`, paddingBottom: 4, fontSize: 12, color: "#888", fontFamily: FONT }}>Short answer text</div>}
        {q.type === "long"  && <div style={{ borderBottom: `2px dashed ${DARK}`, paddingBottom: 18, fontSize: 12, color: "#888", fontFamily: FONT }}>Long answer text</div>}
        {q.type === "date"  && <div style={{ fontSize: 12, color: "#888", border: `2px solid ${DARK}`, padding: "6px 10px", width: 160, fontFamily: FONT }}>MM / DD / YYYY</div>}
        {q.type === "scale" && (
          <div style={{ display: "flex", gap: 6 }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ width: 36, height: 36, border: `2px solid ${DARK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: DARK, fontFamily: FONT }}>{n}</div>
            ))}
          </div>
        )}
        {needsOpts && (
          <div>
            {q.options.map((opt, oi) => (
              <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 14, height: 14, border: `2px solid ${DARK}`, background: WHITE, flexShrink: 0,
                  borderRadius: q.type === "checkbox" ? 0 : "50%" }} />
                <input value={opt} onChange={e => onUpdateOpt(oi, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ flex: 1, border: "none", borderBottom: `1px dashed ${DARK}`, fontSize: 13,
                    outline: "none", padding: "2px 0", background: "transparent", color: DARK, fontFamily: FONT }}
                />
                {q.options.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); onRemoveOpt(oi); }} style={iconBtnStyle()}>
                    <Icon name="x" size={12} color={ACCENT} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={e => { e.stopPropagation(); onAddOpt(); }}
              style={{ background: "none", border: "none", color: DARK, fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4, padding: "4px 0", fontFamily: FONT, fontWeight: 700 }}>
              <Icon name="plus" size={12} color={DARK} /> ADD OPTION
            </button>
          </div>
        )}
      </div>

      {/* footer */}
      {active && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, paddingTop: 10, borderTop: `2px solid ${DARK}` }}>
          <button onClick={e => { e.stopPropagation(); onDup(); }} style={iconBtnStyle()} title="Duplicate"><Icon name="copy" size={14} color={DARK} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={iconBtnStyle()} title="Delete"><Icon name="trash" size={14} color={ACCENT} /></button>
          <button onClick={e => { e.stopPropagation(); onMove(-1); }} disabled={idx === 0} style={iconBtnStyle()}><Icon name="arrow-up" size={14} color={idx === 0 ? "#bbb" : DARK} /></button>
          <button onClick={e => { e.stopPropagation(); onMove(1); }} disabled={idx === total - 1} style={iconBtnStyle()}><Icon name="arrow-down" size={14} color={idx === total - 1 ? "#bbb" : DARK} /></button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: DARK, fontFamily: FONT, fontWeight: 700 }}>
            REQUIRED
            <div onClick={e => { e.stopPropagation(); onUpdate({ required: !q.required }); }}
              style={{ width: 38, height: 20, border: `2px solid ${DARK}`, background: q.required ? ACCENT : WHITE,
                cursor: "pointer", position: "relative" }}>
              <div style={{ width: 14, height: 14, background: q.required ? WHITE : DARK,
                position: "absolute", top: 1, left: q.required ? 20 : 1, transition: "left .15s" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW: FORM FILL
// ═══════════════════════════════════════════════════════════════════════════
function FormFill({ onBack }) {
  const [answers, setAnswers]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors]     = useState({});
  const qs = GLOBAL_QUESTIONS;

  const setAns      = (id, val) => setAnswers(a => ({ ...a, [id]: val }));
  const toggleCheck = (id, opt) => { const cur = answers[id] || []; setAnswers(a => ({ ...a, [id]: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] })); };

  const validate = () => {
    const errs = {};
    qs.forEach(q => {
      if (q.type === "section") return;
      if (q.required) {
        const a = answers[q.id];
        if (!a || (Array.isArray(a) && a.length === 0) || (typeof a === "string" && !a.trim()))
          errs[q.id] = "THIS FIELD IS REQUIRED.";
      }
    });
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const row = { _id: uid(), _submittedAt: new Date().toLocaleString() };
    qs.forEach(q => { if (q.type !== "section") row[q.label || q.id] = Array.isArray(answers[q.id]) ? answers[q.id].join(", ") : (answers[q.id] || ""); });
    await fetch(`${API}/responses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });
    GLOBAL_RESPONSES = [...GLOBAL_RESPONSES, row];
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ background: WHITE, border: BORDER, boxShadow: `8px 8px 0 ${DARK}`, padding: "48px 40px", textAlign: "center", maxWidth: 460 }}>
        <div style={{ width: 64, height: 64, background: YELLOW, border: BORDER, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Icon name="check" size={30} color={DARK} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: DARK, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>SUBMITTED!</h2>
        <p style={{ fontSize: 14, color: "#555", marginBottom: 28 }}>Your response has been recorded. Thank you.</p>
        <button onClick={() => { setAnswers({}); setSubmitted(false); }} style={btnStyle("solid")}>
          SUBMIT ANOTHER
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 80, fontFamily: FONT }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px 0" }}>
        {/* Form header */}
        <div style={{ background: DARK, border: BORDER, boxShadow: SHADOW, padding: "24px 28px", marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>{GLOBAL_TITLE}</h1>
          {GLOBAL_DESC && <p style={{ fontSize: 13, color: "#ccc" }}>{GLOBAL_DESC}</p>}
          <div style={{ marginTop: 12, fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: "0.06em" }}>* REQUIRED FIELDS</div>
        </div>

        {qs.map(q => {
          if (q.type === "section") return (
            <div key={q.id} style={{ marginTop: 28, marginBottom: 8, display: "flex", alignItems: "center", gap: 0 }}>
              <div style={{ height: 3, width: 20, background: DARK }} />
              <div style={{ background: YELLOW, border: BORDER, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: DARK, letterSpacing: "0.1em" }}>
                {q.label.toUpperCase()}
              </div>
              <div style={{ height: 3, flex: 1, background: DARK }} />
            </div>
          );
          return (
            <div key={q.id} style={{
              background: WHITE, border: errors[q.id] ? `3px solid ${ACCENT}` : BORDER,
              boxShadow: errors[q.id] ? `4px 4px 0 ${ACCENT}` : SHADOW,
              padding: "18px 20px", marginBottom: 12
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 12, letterSpacing: "0.02em" }}>
                {q.label || "QUESTION"}{q.required && <span style={{ color: ACCENT, marginLeft: 4 }}>*</span>}
              </p>
              {renderFillInput(q, answers, setAns, toggleCheck)}
              {errors[q.id] && <p style={{ fontSize: 11, color: ACCENT, marginTop: 6, fontWeight: 700 }}>{errors[q.id]}</p>}
            </div>
          );
        })}

        <button onClick={submit} style={{ ...btnStyle("solid"), fontSize: 15, padding: "13px 40px", marginTop: 8 }}>
          SUBMIT →
        </button>
      </div>
    </div>
  );
}

function renderFillInput(q, answers, setAns, toggleCheck) {
  const val    = answers[q.id] || "";
  const common = { outline: "none", fontSize: 13, color: DARK, width: "100%", border: "none",
    borderBottom: `2px solid ${DARK}`, padding: "6px 0", background: "transparent", fontFamily: FONT };
  if (q.type === "section")  return null;
  if (q.type === "short")    return <input value={val} onChange={e => setAns(q.id, e.target.value)} placeholder="Your answer..." style={common} />;
  if (q.type === "long")     return <textarea value={val} onChange={e => setAns(q.id, e.target.value)} placeholder="Your answer..." rows={3}
    style={{ ...common, resize: "vertical", fontFamily: FONT, borderBottom: "none", border: `2px solid ${DARK}`, padding: 10 }} />;
  if (q.type === "date")     return <input type="date" value={val} onChange={e => setAns(q.id, e.target.value)} style={{ ...common, width: "auto" }} />;
  if (q.type === "dropdown") return (
    <select value={val} onChange={e => setAns(q.id, e.target.value)}
      style={{ ...common, borderBottom: `2px solid ${DARK}`, background: "transparent", fontFamily: FONT }}>
      <option value="">— Choose —</option>
      {q.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (q.type === "radio") return (
    <div>{q.options.map(o => (
      <label key={o} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: DARK, marginBottom: 8, cursor: "pointer", fontFamily: FONT }}>
        <input type="radio" name={q.id} value={o} checked={val === o} onChange={() => setAns(q.id, o)} style={{ accentColor: DARK }} />
        {o}
      </label>
    ))}</div>
  );
  if (q.type === "checkbox") {
    const cur = answers[q.id] || [];
    return (
      <div>{q.options.map(o => (
        <label key={o} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: DARK, marginBottom: 8, cursor: "pointer", fontFamily: FONT }}>
          <input type="checkbox" checked={cur.includes(o)} onChange={() => toggleCheck(q.id, o)} style={{ accentColor: DARK }} />
          {o}
        </label>
      ))}</div>
    );
  }
  if (q.type === "scale") return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {[1,2,3,4,5].map(n => (
        <label key={n} style={{ cursor: "pointer" }}>
          <input type="radio" name={q.id} value={n} checked={val === String(n)} onChange={() => setAns(q.id, String(n))} style={{ display: "none" }} />
          <div style={{ width: 44, height: 44, border: val === String(n) ? `3px solid ${ACCENT}` : BORDER,
            background: val === String(n) ? ACCENT : WHITE, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 14, fontWeight: 700, color: val === String(n) ? WHITE : DARK,
            fontFamily: FONT, boxShadow: val === String(n) ? `3px 3px 0 ${DARK}` : "none" }}>
            {n}
          </div>
        </label>
      ))}
    </div>
  );
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW: RESPONSES
// ═══════════════════════════════════════════════════════════════════════════
function Responses({ onEdit }) {
  const [responses, setResponses] = useState(GLOBAL_RESPONSES);
  const [view, setView]           = useState("summary");
  const [idx, setIdx]             = useState(0);
  const qs = GLOBAL_QUESTIONS;

  useEffect(() => {
    fetch(`${API}/responses`)
      .then(r => r.json())
      .then(data => { GLOBAL_RESPONSES = data; setResponses(data); })
      .catch(() => setResponses(GLOBAL_RESPONSES));
  }, []);

  const downloadExcel = () => {
    if (responses.length === 0) return;
    const headers = ["Submitted at", ...qs.filter(q => q.type !== "section").map(q => q.label || "Question")];
    const rows    = responses.map(r => [r._submittedAt, ...qs.filter(q => q.type !== "section").map(q => r[q.label || q.id] || "")]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Responses");
    XLSX.writeFile(wb, `${GLOBAL_TITLE.replace(/\s+/g, "_")}_responses.xlsx`);
  };

  const summaryData = qs.filter(q => q.type !== "section").map(q => {
    const vals = responses.map(r => r[q.label || q.id] || "").filter(Boolean);
    if (["radio","checkbox","dropdown","scale"].includes(q.type)) {
      const counts = {};
      vals.forEach(v => v.split(", ").forEach(s => { counts[s] = (counts[s] || 0) + 1; }));
      return { q, type: "chart", counts, total: vals.length };
    }
    return { q, type: "text", vals };
  });

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 80, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        background: DARK, borderBottom: `4px solid ${DARK}`, position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", padding: "0 24px", height: 60, gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: ACCENT, border: `2px solid ${YELLOW}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="forms" size={18} color={WHITE} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: WHITE, letterSpacing: "0.06em", textTransform: "uppercase" }}>FORMLY</span>
        </div>
        <TabBar active="responses" onViewResponses={() => {}} onEditForm={onEdit} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={btnStyle("outline-inv")}><Icon name="edit" size={13} color={DARK} /> EDIT</button>
          <button onClick={downloadExcel} style={btnStyle("solid")} disabled={responses.length === 0}>
            <Icon name="file-spreadsheet" size={13} color={DARK} /> DOWNLOAD
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 0" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "RESPONSES", value: responses.length, icon: "users" },
            { label: "QUESTIONS", value: qs.length, icon: "list" },
            { label: "REQUIRED",  value: qs.filter(q => q.required).length, icon: "asterisk" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: WHITE, border: BORDER, boxShadow: SHADOW, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#777", marginBottom: 6, fontWeight: 700, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name={s.icon} size={11} color="#777" /> {s.label}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: DARK }}>{s.value}</div>
            </div>
          ))}
        </div>

        {responses.length === 0 ? (
          <div style={{ background: WHITE, border: BORDER, boxShadow: SHADOW, padding: "56px 24px", textAlign: "center" }}>
            <Icon name="inbox" size={40} color="#ccc" />
            <p style={{ fontSize: 14, color: "#aaa", marginTop: 14, fontWeight: 700 }}>NO RESPONSES YET</p>
            <p style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>Share your form to start collecting data.</p>
          </div>
        ) : (
          <>
            {/* View toggle */}
            <div style={{ display: "inline-flex", border: BORDER, marginBottom: 16, overflow: "hidden" }}>
              {["summary","individual"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  border: "none", borderRight: v === "summary" ? `2px solid ${DARK}` : "none",
                  padding: "8px 20px", fontSize: 11, cursor: "pointer", fontWeight: 700,
                  background: view === v ? DARK : WHITE, color: view === v ? WHITE : DARK,
                  fontFamily: FONT, letterSpacing: "0.08em"
                }}>{v === "summary" ? "SUMMARY" : "INDIVIDUAL"}</button>
              ))}
            </div>

            {view === "summary" ? (
              summaryData.map(({ q, type, counts, vals, total }) => (
                <div key={q.id} style={{ background: WHITE, border: BORDER, boxShadow: "2px 2px 0 " + DARK, padding: "18px 20px", marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 14, letterSpacing: "0.02em" }}>{q.label}</p>
                  {type === "chart" ? (
                    <div>
                      {Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([label, count]) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={label} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: DARK, marginBottom: 4, fontWeight: 600 }}>
                              <span>{label}</span>
                              <span style={{ color: ACCENT, fontWeight: 700 }}>{count} ({pct}%)</span>
                            </div>
                            <div style={{ height: 10, background: BG, border: `2px solid ${DARK}` }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: ACCENT }} />
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(counts).length === 0 && <p style={{ fontSize: 12, color: "#aaa" }}>No answers yet.</p>}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {vals.length === 0 && <p style={{ fontSize: 12, color: "#aaa" }}>No answers yet.</p>}
                      {vals.slice(0, 5).map((v, i) => (
                        <div key={i} style={{ background: BG, border: `2px solid ${DARK}`, padding: "8px 12px", fontSize: 13, color: DARK }}>{v}</div>
                      ))}
                      {vals.length > 5 && <p style={{ fontSize: 11, color: "#aaa", fontWeight: 700 }}>+{vals.length - 5} MORE</p>}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, background: WHITE, border: BORDER, padding: "10px 16px" }}>
                  <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={iconBtnStyle()}>
                    <Icon name="chevron-left" size={15} color={idx === 0 ? "#ccc" : DARK} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{idx + 1} / {responses.length}</span>
                  <button onClick={() => setIdx(i => Math.min(responses.length - 1, i + 1))} disabled={idx === responses.length - 1} style={iconBtnStyle()}>
                    <Icon name="chevron-right" size={15} color={idx === responses.length - 1 ? "#ccc" : DARK} />
                  </button>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>{responses[idx]?._submittedAt}</span>
                </div>
                <div style={{ background: WHITE, border: BORDER, boxShadow: SHADOW, padding: "20px 22px" }}>
                  {qs.filter(q => q.type !== "section").map(q => (
                    <div key={q.id} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px dashed ${DARK}` }}>
                      <p style={{ fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 700, letterSpacing: "0.06em" }}>{q.label.toUpperCase()}</p>
                      <p style={{ fontSize: 14, color: DARK, fontWeight: 600 }}>{responses[idx]?.[q.label || q.id] || <span style={{ color: "#ccc" }}>—</span>}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const isFillRoute = window.location.hash === "#fill";
  const [view, setView]   = useState(isFillRoute ? "share" : "builder");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(`${API}/form`)
      .then(r => r.json())
      .then(data => {
        if (data.questions?.length) {
          GLOBAL_QUESTIONS = data.questions;
          GLOBAL_TITLE     = data.title || GLOBAL_TITLE;
          GLOBAL_DESC      = data.desc  || GLOBAL_DESC;
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: DARK, letterSpacing: "0.1em" }}>LOADING…</div>
    </div>
  );

  if (isFillRoute) return <FormFill onBack={null} />;
  if (view === "share")     return <FormFill onBack={() => setView("responses")} />;
  if (view === "responses") return <Responses onEdit={() => setView("builder")} />;
  return <Builder onShare={() => setView("share")} onViewResponses={() => setView("responses")} />;
}

// ─── shared styles ──────────────────────────────────────────────────────────
function btnStyle(variant) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px",
    fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: FONT,
    letterSpacing: "0.06em", textTransform: "uppercase" };
  if (variant === "solid")      return { ...base, background: YELLOW, border: `2px solid ${DARK}`, color: DARK, boxShadow: `2px 2px 0 ${DARK}` };
  if (variant === "outline-inv") return { ...base, background: YELLOW, border: `2px solid ${DARK}`, color: DARK, boxShadow: `2px 2px 0 ${DARK}` };
  return { ...base, background: "transparent", border: `2px solid ${DARK}`, color: DARK };
}
function iconBtnStyle() {
  return { background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
    display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT };
}
function headerInputStyle(size, muted) {
  return { fontSize: size, fontWeight: size > 16 ? 700 : 400, color: muted ? "#bbb" : WHITE,
    border: "none", outline: "none", padding: "4px 0", marginTop: muted ? 6 : 0,
    background: "transparent", width: "100%", fontFamily: FONT,
    letterSpacing: size > 16 ? "0.04em" : "0", textTransform: size > 16 ? "uppercase" : "none" };
}

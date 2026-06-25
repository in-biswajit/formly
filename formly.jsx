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

const ACCENT = "#6c63ff";
const ACCENT_LIGHT = "#ede9ff";

const defaultQuestions = () => [
  { id: uid(), label: "Project Details", type: "section", options: [], required: false },
  { id: uid(), label: "Project Title", type: "short", options: [], required: true },
  { id: uid(), label: "Proposal Type", type: "radio", options: ["Business Proposal","Project Proposal","Startup Proposal","Technical Proposal","Research Proposal","Funding Proposal","Other"], required: false },
  { id: uid(), label: "Proposal Type Comments", type: "short", options: [], required: false },
  { id: uid(), label: "Industry", type: "radio", options: ["Software & IT","AI & Automation","E-commerce","Healthcare","Education","Finance","Real Estate","Manufacturing","Marketing","Construction","Agriculture","Other"], required: false },
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

// Persist in memory across views
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
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "#222", color: "#fff", borderRadius: 10, padding: "10px 20px",
      fontSize: 14, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,.25)",
      display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap"
    }}>
      <Icon name="check" size={15} color="#7cfc00" /> {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW: BUILDER
// ═══════════════════════════════════════════════════════════════════════════
function Builder({ onShare, onViewResponses }) {
  const [questions, setQuestions] = useState(GLOBAL_QUESTIONS);
  const [title, setTitle] = useState(GLOBAL_TITLE);
  const [desc, setDesc] = useState(GLOBAL_DESC);
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState(null);

  // sync globals + auto-save to backend (debounced)
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

  const addQ = () => {
    const q = { id: uid(), label: "", type: "short", options: [], required: false };
    setQuestions(qs => [...qs, q]);
    setActiveId(q.id);
  };

  const deleteQ = (id) => setQuestions(qs => qs.filter(q => q.id !== id));
  const dupQ = (id) => {
    setQuestions(qs => {
      const idx = qs.findIndex(q => q.id === id);
      const copy = { ...qs[idx], id: uid(), options: [...qs[idx].options], label: qs[idx].label + " (copy)" };
      const next = [...qs]; next.splice(idx + 1, 0, copy); return next;
    });
  };
  const moveQ = (id, dir) => {
    setQuestions(qs => {
      const idx = qs.findIndex(q => q.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= qs.length) return qs;
      const next = [...qs]; [next[idx], next[newIdx]] = [next[newIdx], next[idx]]; return next;
    });
  };
  const updateQ = (id, patch) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
  const updateOpt = (id, oi, val) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, options: q.options.map((o, i) => i === oi ? val : o) } : q));
  const addOpt = (id) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, options: [...q.options, "Option " + (q.options.length + 1)] } : q));
  const removeOpt = (id, oi) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, options: q.options.filter((_, i) => i !== oi) } : q));

  const handleShare = () => {
    const url = `${window.location.href.split("#")[0]}#fill`;
    navigator.clipboard.writeText(url).catch(() => {});
    setToast(`Link copied: ${url}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0eef9", paddingBottom: 60 }}>
      {/* Top bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e0ddf7", position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", padding: "0 24px", height: 56, gap: 12
      }}>
        <div style={{ width: 32, height: 32, background: ACCENT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="forms" size={18} color="#fff" />
        </div>
        <span style={{ fontWeight: 600, fontSize: 17, color: "#333", flex: 1 }}>Formly</span>
        <TabBar onViewResponses={onViewResponses} active="edit" />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleShare} style={btnStyle("outline")}>
            <Icon name="share" size={15} /> Share
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 0" }}>
        {/* Form header card */}
        <div style={{
          background: "#fff", borderRadius: 12, border: "0.5px solid #ddd",
          borderTop: `8px solid ${ACCENT}`, padding: "20px 24px", marginBottom: 12
        }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Form title"
            style={headerInputStyle(22)}
          />
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Form description"
            style={headerInputStyle(14, true)}
          />
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            idx={i}
            total={questions.length}
            active={activeId === q.id}
            onActivate={() => setActiveId(q.id)}
            onUpdate={patch => updateQ(q.id, patch)}
            onDelete={() => deleteQ(q.id)}
            onDup={() => dupQ(q.id)}
            onMove={dir => moveQ(q.id, dir)}
            onUpdateOpt={(oi, val) => updateOpt(q.id, oi, val)}
            onAddOpt={() => addOpt(q.id)}
            onRemoveOpt={oi => removeOpt(q.id, oi)}
          />
        ))}

        {/* Add question */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button onClick={addQ} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#fff", border: "1px dashed #b0a8f5", borderRadius: 10,
            padding: "10px 24px", fontSize: 14, color: ACCENT, cursor: "pointer", fontWeight: 500
          }}>
            <Icon name="plus" size={16} color={ACCENT} /> Add question
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
      background: "none", border: "none", borderBottom: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
      padding: "16px 14px 14px", fontSize: 14, color: isActive ? ACCENT : "#666",
      cursor: isActive ? "default" : "pointer", fontWeight: isActive ? 600 : 400
    }}>{label}</button>
  );
  return (
    <div style={{ display: "flex" }}>
      {tab("Questions", active === "edit", active !== "edit" ? onEditForm : undefined)}
      {tab("Responses", active === "responses", active !== "responses" ? onViewResponses : undefined)}
    </div>
  );
}

function QuestionCard({ q, idx, total, active, onActivate, onUpdate, onDelete, onDup, onMove, onUpdateOpt, onAddOpt, onRemoveOpt }) {
  const needsOpts = ["radio", "checkbox", "dropdown"].includes(q.type);
  const isSection = q.type === "section";

  if (isSection) {
    return (
      <div
        onClick={onActivate}
        style={{
          background: ACCENT_LIGHT, borderRadius: 12, border: active ? `1.5px solid ${ACCENT}` : "1px solid #d5d0f7",
          padding: "14px 20px", marginBottom: 10, cursor: "pointer",
          boxShadow: active ? "0 2px 12px rgba(108,99,255,.1)" : "none"
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Icon name="layout-navbar" size={16} color={ACCENT} />
          <input
            value={q.label}
            onChange={e => onUpdate({ label: e.target.value })}
            onClick={e => e.stopPropagation()}
            placeholder="Section title"
            style={{
              flex: 1, fontSize: 15, fontWeight: 600, border: "none", borderBottom: "1px solid transparent",
              outline: "none", padding: "2px 0", background: "transparent", color: ACCENT
            }}
            onFocus={e => e.target.style.borderBottomColor = ACCENT}
            onBlur={e => e.target.style.borderBottomColor = "transparent"}
          />
          <select
            value={q.type}
            onChange={e => {
              const t = e.target.value;
              onUpdate({ type: t, options: ["radio","checkbox","dropdown"].includes(t) && q.options.length === 0 ? ["Option 1","Option 2"] : q.options });
            }}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 12, border: "1px solid #c0b8f0", borderRadius: 8, padding: "4px 8px", background: "#fff", color: ACCENT, cursor: "pointer", outline: "none" }}
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {active && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid #c8c2f0` }}>
            <button onClick={e => { e.stopPropagation(); onDup(); }} style={iconBtnStyle()} title="Duplicate"><Icon name="copy" size={15} color="#666" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} style={iconBtnStyle()} title="Delete"><Icon name="trash" size={15} color="#e53935" /></button>
            <button onClick={e => { e.stopPropagation(); onMove(-1); }} disabled={idx === 0} style={iconBtnStyle()} title="Move up"><Icon name="arrow-up" size={15} color={idx === 0 ? "#ccc" : "#666"} /></button>
            <button onClick={e => { e.stopPropagation(); onMove(1); }} disabled={idx === total - 1} style={iconBtnStyle()} title="Move down"><Icon name="arrow-down" size={15} color={idx === total - 1 ? "#ccc" : "#666"} /></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onActivate}
      style={{
        background: "#fff", borderRadius: 12, border: "0.5px solid #ddd",
        borderLeft: active ? `4px solid ${ACCENT}` : "4px solid transparent",
        padding: "18px 20px", marginBottom: 10, cursor: "pointer",
        transition: "border-left-color .15s, box-shadow .15s",
        boxShadow: active ? "0 2px 12px rgba(108,99,255,.1)" : "none"
      }}
    >
      {/* top row */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input
          value={q.label}
          onChange={e => onUpdate({ label: e.target.value })}
          onClick={e => e.stopPropagation()}
          placeholder="Question"
          style={{
            flex: 1, fontSize: 15, border: "none", borderBottom: "1px solid #ddd",
            outline: "none", padding: "4px 0", background: "transparent", color: "#222"
          }}
          onFocus={e => e.target.style.borderBottomColor = ACCENT}
          onBlur={e => e.target.style.borderBottomColor = "#ddd"}
        />
        <select
          value={q.type}
          onChange={e => {
            const t = e.target.value;
            onUpdate({ type: t, options: ["radio","checkbox","dropdown"].includes(t) && q.options.length === 0 ? ["Option 1","Option 2"] : q.options });
          }}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: 13, border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px",
            background: "#fafafa", color: "#333", cursor: "pointer", outline: "none"
          }}
        >
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* body */}
      <div style={{ marginTop: 14 }}>
        {q.type === "short" && <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 4, fontSize: 13, color: "#aaa" }}>Short answer text</div>}
        {q.type === "long" && <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 18, fontSize: 13, color: "#aaa" }}>Long answer text</div>}
        {q.type === "date" && <div style={{ fontSize: 13, color: "#aaa", border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", width: 160 }}>MM / DD / YYYY</div>}
        {q.type === "scale" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ width: 36, height: 36, border: `1px solid ${ACCENT}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: ACCENT }}>{n}</div>
            ))}
          </div>
        )}
        {needsOpts && (
          <div>
            {q.options.map((opt, oi) => (
              <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: q.type === "checkbox" ? 3 : "50%", border: `2px solid #bbb`, flexShrink: 0 }} />
                <input
                  value={opt}
                  onChange={e => onUpdateOpt(oi, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ flex: 1, border: "none", borderBottom: "1px solid #eee", fontSize: 14, outline: "none", padding: "2px 0", background: "transparent", color: "#333" }}
                  onFocus={e => e.target.style.borderBottomColor = ACCENT}
                  onBlur={e => e.target.style.borderBottomColor = "#eee"}
                />
                {q.options.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); onRemoveOpt(oi); }} style={iconBtnStyle()}>
                    <Icon name="x" size={13} color="#999" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={e => { e.stopPropagation(); onAddOpt(); }} style={{ background: "none", border: "none", color: ACCENT, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}>
              <Icon name="plus" size={13} color={ACCENT} /> Add option
            </button>
          </div>
        )}
      </div>

      {/* footer */}
      {active && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
          <button onClick={e => { e.stopPropagation(); onDup(); }} style={iconBtnStyle()} title="Duplicate">
            <Icon name="copy" size={15} color="#666" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={iconBtnStyle()} title="Delete">
            <Icon name="trash" size={15} color="#e53935" />
          </button>
          <button onClick={e => { e.stopPropagation(); onMove(-1); }} disabled={idx === 0} style={iconBtnStyle()} title="Move up">
            <Icon name="arrow-up" size={15} color={idx === 0 ? "#ccc" : "#666"} />
          </button>
          <button onClick={e => { e.stopPropagation(); onMove(1); }} disabled={idx === total - 1} style={iconBtnStyle()} title="Move down">
            <Icon name="arrow-down" size={15} color={idx === total - 1 ? "#ccc" : "#666"} />
          </button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555" }}>
            Required
            <div
              onClick={e => { e.stopPropagation(); onUpdate({ required: !q.required }); }}
              style={{
                width: 38, height: 20, borderRadius: 10, background: q.required ? ACCENT : "#ccc",
                cursor: "pointer", position: "relative", transition: "background .2s"
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2, left: q.required ? 20 : 2, transition: "left .2s"
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW: SHARE / FORM FILL
// ═══════════════════════════════════════════════════════════════════════════
function FormFill({ onBack }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const qs = GLOBAL_QUESTIONS;

  const setAns = (id, val) => setAnswers(a => ({ ...a, [id]: val }));
  const toggleCheck = (id, opt) => {
    const cur = answers[id] || [];
    setAnswers(a => ({ ...a, [id]: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] }));
  };

  const validate = () => {
    const errs = {};
    qs.forEach(q => {
      if (q.type === "section") return;
      if (q.required) {
        const a = answers[q.id];
        if (!a || (Array.isArray(a) && a.length === 0) || (typeof a === "string" && !a.trim())) {
          errs[q.id] = "This question is required.";
        }
      }
    });
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const row = { _id: uid(), _submittedAt: new Date().toLocaleString() };
    qs.forEach(q => { if (q.type !== "section") row[q.label || q.id] = Array.isArray(answers[q.id]) ? answers[q.id].join(", ") : (answers[q.id] || ""); });
    await fetch(`${API}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    GLOBAL_RESPONSES = [...GLOBAL_RESPONSES, row];
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ minHeight: "100vh", background: "#f0eef9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 36px", textAlign: "center", maxWidth: 440, boxShadow: "0 4px 32px rgba(108,99,255,.12)" }}>
        <div style={{ width: 64, height: 64, background: ACCENT_LIGHT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Icon name="check" size={30} color={ACCENT} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: "#222", marginBottom: 8 }}>Response submitted!</h2>
        <p style={{ fontSize: 15, color: "#666", marginBottom: 24 }}>Your response has been recorded. Thank you!</p>
        <button onClick={() => { setAnswers({}); setSubmitted(false); }} style={btnStyle("outline")}>Submit another response</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0eef9", paddingBottom: 60 }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px 0" }}>
        {/* Form header */}
        <div style={{ background: "#fff", borderRadius: 12, borderTop: `8px solid ${ACCENT}`, padding: "20px 24px", marginBottom: 14 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#222", marginBottom: 6 }}>{GLOBAL_TITLE}</h1>
          {GLOBAL_DESC && <p style={{ fontSize: 14, color: "#666" }}>{GLOBAL_DESC}</p>}
          <p style={{ fontSize: 12, color: "#e53935", marginTop: 8 }}>* Required</p>
        </div>

        {/* Questions */}
        {qs.map(q => {
          if (q.type === "section") {
            return (
              <div key={q.id} style={{ marginTop: 24, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ height: 1, flex: 1, background: ACCENT, opacity: 0.25 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em" }}>{q.label}</span>
                  <div style={{ height: 1, flex: 1, background: ACCENT, opacity: 0.25 }} />
                </div>
              </div>
            );
          }
          return (
            <div key={q.id} style={{ background: "#fff", borderRadius: 12, border: errors[q.id] ? "1.5px solid #e53935" : "0.5px solid #ddd", padding: "18px 20px", marginBottom: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#222", marginBottom: 12 }}>
                {q.label || "Question"}{q.required && <span style={{ color: "#e53935", marginLeft: 4 }}>*</span>}
              </p>
              {renderFillInput(q, answers, setAns, toggleCheck)}
              {errors[q.id] && <p style={{ fontSize: 12, color: "#e53935", marginTop: 6 }}>{errors[q.id]}</p>}
            </div>
          );
        })}

        <button onClick={submit} style={{ ...btnStyle("solid"), fontSize: 15, padding: "11px 32px" }}>
          Submit
        </button>
      </div>
    </div>
  );
}

function renderFillInput(q, answers, setAns, toggleCheck) {
  const val = answers[q.id] || "";
  const common = { outline: "none", fontSize: 14, color: "#333", width: "100%", border: "none", borderBottom: "1px solid #ccc", padding: "6px 0", background: "transparent" };
  if (q.type === "section") return null;
  if (q.type === "short") return <input value={val} onChange={e => setAns(q.id, e.target.value)} placeholder="Your answer" style={common} />;
  if (q.type === "long") return <textarea value={val} onChange={e => setAns(q.id, e.target.value)} placeholder="Your answer" rows={3} style={{ ...common, resize: "vertical", fontFamily: "inherit", borderBottom: "none", border: "1px solid #ddd", borderRadius: 6, padding: 10 }} />;
  if (q.type === "date") return <input type="date" value={val} onChange={e => setAns(q.id, e.target.value)} style={{ ...common, width: "auto" }} />;
  if (q.type === "dropdown") return (
    <select value={val} onChange={e => setAns(q.id, e.target.value)} style={{ ...common, borderBottom: "1px solid #ccc", background: "transparent" }}>
      <option value="">Choose an option</option>
      {q.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (q.type === "radio") return (
    <div>{q.options.map(o => (
      <label key={o} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#333", marginBottom: 8, cursor: "pointer" }}>
        <input type="radio" name={q.id} value={o} checked={val === o} onChange={() => setAns(q.id, o)} style={{ accentColor: ACCENT }} />
        {o}
      </label>
    ))}</div>
  );
  if (q.type === "checkbox") {
    const cur = answers[q.id] || [];
    return (
      <div>{q.options.map(o => (
        <label key={o} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#333", marginBottom: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={cur.includes(o)} onChange={() => toggleCheck(q.id, o)} style={{ accentColor: ACCENT }} />
          {o}
        </label>
      ))}</div>
    );
  }
  if (q.type === "scale") return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {[1,2,3,4,5].map(n => (
        <label key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="radio" name={q.id} value={n} checked={val === String(n)} onChange={() => setAns(q.id, String(n))} style={{ accentColor: ACCENT }} />
          <span style={{ fontSize: 13, color: "#555" }}>{n}</span>
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
  const [view, setView] = useState("summary"); // "summary" | "individual"
  const [idx, setIdx] = useState(0);
  const qs = GLOBAL_QUESTIONS;

  useEffect(() => {
    fetch(`${API}/responses`)
      .then(r => r.json())
      .then(data => { GLOBAL_RESPONSES = data; setResponses(data); })
      .catch(() => setResponses(GLOBAL_RESPONSES));
  }, []);

  const downloadExcel = () => {
    if (responses.length === 0) return;
    const headers = ["Submitted at", ...qs.map(q => q.label || "Question")];
    const rows = responses.map(r => [r._submittedAt, ...qs.map(q => r[q.label || q.id] || "")]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Style header row width
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
    <div style={{ minHeight: "100vh", background: "#f0eef9", paddingBottom: 60 }}>
      {/* Top bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e0ddf7", position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", padding: "0 24px", height: 56, gap: 12
      }}>
        <div style={{ width: 32, height: 32, background: ACCENT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="forms" size={18} color="#fff" />
        </div>
        <span style={{ fontWeight: 600, fontSize: 17, color: "#333", flex: 1 }}>Formly</span>
        <TabBar active="responses" onViewResponses={() => {}} onEditForm={onEdit} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={btnStyle("outline")}><Icon name="edit" size={15} /> Edit form</button>
          <button onClick={downloadExcel} style={btnStyle("solid")} disabled={responses.length === 0}>
            <Icon name="file-spreadsheet" size={15} color="#fff" /> Download Excel
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 0" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total responses", value: responses.length, icon: "users" },
            { label: "Questions", value: qs.length, icon: "list" },
            { label: "Required fields", value: qs.filter(q => q.required).length, icon: "asterisk" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: "#fff", borderRadius: 10, border: "0.5px solid #ddd", padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name={s.icon} size={13} color="#aaa" /> {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, color: ACCENT }}>{s.value}</div>
            </div>
          ))}
        </div>

        {responses.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 12, padding: "48px 24px", textAlign: "center", border: "0.5px solid #ddd" }}>
            <Icon name="inbox" size={40} color="#ccc" />
            <p style={{ fontSize: 15, color: "#aaa", marginTop: 12 }}>No responses yet.</p>
            <p style={{ fontSize: 13, color: "#bbb", marginTop: 4 }}>Share your form to start collecting data.</p>
          </div>
        ) : (
          <>
            {/* View toggle */}
            <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #ddd", display: "inline-flex", marginBottom: 14, overflow: "hidden" }}>
              {["summary","individual"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  border: "none", padding: "8px 18px", fontSize: 13, cursor: "pointer", fontWeight: 500,
                  background: view === v ? ACCENT : "transparent",
                  color: view === v ? "#fff" : "#555"
                }}>{v === "summary" ? "Summary" : "Individual"}</button>
              ))}
            </div>

            {view === "summary" ? (
              summaryData.map(({ q, type, counts, vals, total }) => (
                <div key={q.id} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #ddd", padding: "18px 20px", marginBottom: 10 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#222", marginBottom: 12 }}>{q.label}</p>
                  {type === "chart" ? (
                    <div>
                      {Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label, count]) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={label} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 4 }}>
                              <span>{label}</span>
                              <span style={{ color: ACCENT, fontWeight: 600 }}>{count} ({pct}%)</span>
                            </div>
                            <div style={{ height: 8, background: "#f0eef9", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: ACCENT, borderRadius: 4, transition: "width .5s" }} />
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(counts).length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No answers yet.</p>}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {vals.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No answers yet.</p>}
                      {vals.slice(0, 5).map((v, i) => (
                        <div key={i} style={{ background: "#f7f6ff", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#333" }}>{v}</div>
                      ))}
                      {vals.length > 5 && <p style={{ fontSize: 12, color: "#aaa" }}>+{vals.length - 5} more</p>}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div>
                {/* Nav */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, background: "#fff", borderRadius: 10, border: "0.5px solid #ddd", padding: "10px 16px" }}>
                  <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={iconBtnStyle()}>
                    <Icon name="chevron-left" size={16} color={idx === 0 ? "#ccc" : "#555"} />
                  </button>
                  <span style={{ fontSize: 14, color: "#555" }}>{idx + 1} of {responses.length}</span>
                  <button onClick={() => setIdx(i => Math.min(responses.length - 1, i + 1))} disabled={idx === responses.length - 1} style={iconBtnStyle()}>
                    <Icon name="chevron-right" size={16} color={idx === responses.length - 1 ? "#ccc" : "#555"} />
                  </button>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa" }}>{responses[idx]?._submittedAt}</span>
                </div>
                {/* Response detail */}
                <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #ddd", padding: "18px 20px" }}>
                  {qs.map(q => (
                    <div key={q.id} style={{ marginBottom: 18 }}>
                      <p style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{q.label}</p>
                      <p style={{ fontSize: 15, color: "#222" }}>{responses[idx]?.[q.label || q.id] || <span style={{ color: "#ccc" }}>—</span>}</p>
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
  const [view, setView] = useState(isFillRoute ? "share" : "builder");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(`${API}/form`)
      .then(r => r.json())
      .then(data => {
        if (data.questions?.length) {
          GLOBAL_QUESTIONS = data.questions;
          GLOBAL_TITLE = data.title || GLOBAL_TITLE;
          GLOBAL_DESC = data.desc || GLOBAL_DESC;
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: "#f0eef9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 15, color: "#888" }}>Loading…</div>
    </div>
  );

  // Respondents who open the #fill link see only the form — no admin nav
  if (isFillRoute) return <FormFill onBack={null} />;

  if (view === "share") return <FormFill onBack={() => setView("responses")} />;
  if (view === "responses") return <Responses onEdit={() => setView("builder")} />;
  return (
    <Builder
      onShare={() => setView("share")}
      onViewResponses={() => setView("responses")}
    />
  );
}

// ─── shared styles ──────────────────────────────────────────────────────────
function btnStyle(variant) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500, border: "none" };
  if (variant === "solid") return { ...base, background: ACCENT, color: "#fff" };
  return { ...base, background: "transparent", border: `1px solid #d0cdf5`, color: ACCENT };
}
function iconBtnStyle() {
  return { background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" };
}
function headerInputStyle(size, muted) {
  return {
    fontSize: size, fontWeight: size > 16 ? 600 : 400, color: muted ? "#666" : "#222",
    border: "none", borderBottom: "2px solid transparent", background: "transparent",
    width: "100%", outline: "none", padding: "4px 0", marginTop: muted ? 8 : 0,
    fontFamily: "inherit",
  };
}

"use client"

import { useState, useEffect, useRef } from "react"

type ErrorType = "vocabulary" | "grammar" | "particle" | "spacing" | "expression" | "suggestion"

interface InlineCorrection {
  id: string
  position: number
  wrong: string
  correct: string
  type: ErrorType
  explanation: string
  context: string
}

interface Score53 {
  type: "53"
  content: number
  vocabGrammar: number
  structureExpression: number
  total: number
}

interface Score54 {
  type: "54"
  content: number
  logicCoherence: number
  vocabulary: number
  grammar: number
  total: number
}

interface GradingResult {
  questionType: "53" | "54"
  scoreBreakdown: Score53 | Score54
  generalFeedback: {
    overview: string
    strengths: string[]
    weaknesses: string[]
    teacherComment: string
  }
  inlineCorrections: InlineCorrection[]
  originalEssay: string
  logicFeedback: {
    structure: string
    coherence: string
    argumentation: string
    suggestions: string[]
  }
  suggestedEssay: string
  topicVocabulary?: {
    words: { word: string; meaning: string; example: string }[]
    structures: { structure: string; meaning: string; example: string }[]
    expressions: { expression: string; usage: string }[]
  }
}

const errorColors: Record<ErrorType, { bg: string; text: string; border: string; label: string }> = {
  vocabulary: { bg: "#EBF5FF", text: "#1B6CA8", border: "#90CAF9", label: "Từ vựng" },
  grammar: { bg: "#F3E8FF", text: "#6B21A8", border: "#C084FC", label: "Ngữ pháp" },
  particle: { bg: "#FFF3E0", text: "#B45309", border: "#FCD34D", label: "Trợ từ" },
  spacing: { bg: "#E8F5E9", text: "#166534", border: "#86EFAC", label: "띄어쓰기" },
  expression: { bg: "#FCE4EC", text: "#9B1C40", border: "#F48FB1", label: "Diễn đạt" },
  suggestion: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", label: "Đề xuất" },
}

function AnimatedScore({ score, max, color }: { score: number; max: number; color: string }) {
  const [displayed, setDisplayed] = useState(0)
  const pct = Math.round((score / max) * 100)
  useEffect(() => {
    let start = 0
    const step = score / 40
    const timer = setInterval(() => {
      start += step
      if (start >= score) { setDisplayed(score); clearInterval(timer) }
      else setDisplayed(Math.floor(start))
    }, 30)
    return () => clearInterval(timer)
  }, [score])
  const r = 54
  const circ = 2 * Math.PI * r
  const [dashOffset, setDashOffset] = useState(circ)
  useEffect(() => { setTimeout(() => setDashOffset(circ - (pct / 100) * circ), 100) }, [pct, circ])
  return (
    <div style={{ position: "relative", width: 128, height: 128 }}>
      <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="#E8F5EC" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#2D5A3D", lineHeight: 1 }}>{displayed}</span>
        <span style={{ fontSize: 12, color: "#6B9E7A" }}>/ {max}</span>
      </div>
    </div>
  )
}

export function TopikGrader() {
  const [questionType, setQuestionType] = useState("")
  const [topic, setTopic] = useState("")
  const [essayText, setEssayText] = useState("")
  const [isGrading, setIsGrading] = useState(false)
  const [result, setResult] = useState<GradingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedCorrection, setSelectedCorrection] = useState<InlineCorrection | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const charHint = questionType === "53" ? { min: 200, max: 300 } : questionType === "54" ? { min: 600, max: 700 } : null
  const charColor = charHint ? (essayText.length >= charHint.min && essayText.length <= charHint.max ? "#4A7C59" : essayText.length > 0 ? "#D97706" : "#A3C4AC") : "#A3C4AC"

  const handleGrade = async () => {
    if (!questionType || !essayText.trim()) return
    setIsGrading(true); setError(null); setResult(null)
    setSelectedCorrection(null); setAcceptedIds(new Set()); setRejectedIds(new Set())
    try {
      const res = await fetch("/api/grade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionType, topic, essay: essayText }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Đã có lỗi xảy ra") }
      const data: GradingResult = await res.json()
      setResult(data); setActiveTab("overview")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã có lỗi xảy ra")
    } finally { setIsGrading(false) }
  }

  useEffect(() => {
    const handler = () => setSelectedCorrection(null)
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  const renderEssay = () => {
    if (!result) return null
    const essay = result.originalEssay || essayText
    const corrections = (result.inlineCorrections || []).filter(c =>
      c?.wrong && typeof c.position === "number" && c.position >= 0 && c.position < essay.length &&
      essay.substring(c.position, c.position + c.wrong.length) === c.wrong
    ).sort((a, b) => a.position - b.position)
    if (!corrections.length) return <span style={{ whiteSpace: "pre-wrap" }}>{essay}</span>
    const parts: React.ReactNode[] = []
    let last = 0
    corrections.forEach((c, i) => {
      if (c.position < last) return
      if (c.position > last) parts.push(<span key={"t" + i} style={{ whiteSpace: "pre-wrap" }}>{essay.substring(last, c.position)}</span>)
      const col = errorColors[c.type] || errorColors.grammar
      const isAcc = acceptedIds.has(c.id)
      const isRej = rejectedIds.has(c.id)
      parts.push(
        <span key={"c" + c.id} onClick={(e) => { e.stopPropagation(); setSelectedCorrection(selectedCorrection?.id === c.id ? null : c) }}
          style={{ cursor: "pointer", display: "inline", borderRadius: 4, padding: "1px 2px", outline: selectedCorrection?.id === c.id ? "2px solid " + col.border : "none", outlineOffset: 1 }}>
          {!isAcc && !isRej && <span style={{ background: col.bg, color: col.text, textDecoration: "line-through", borderBottom: "2px solid " + col.border, borderRadius: "3px 3px 0 0", padding: "1px 3px" }}>{c.wrong}</span>}
          {!isRej && <span style={{ background: "#E8F5EC", color: "#2D5A3D", fontWeight: 600, borderRadius: "0 0 3px 3px", border: "1px solid #86EFAC", padding: "1px 4px", marginLeft: 1 }}>{c.correct}</span>}
          {isRej && <span style={{ whiteSpace: "pre-wrap" }}>{c.wrong}</span>}
        </span>
      )
      last = c.position + c.wrong.length
    })
    if (last < essay.length) parts.push(<span key="end" style={{ whiteSpace: "pre-wrap" }}>{essay.substring(last)}</span>)
    return parts
  }

  const getScoreItems = () => {
    if (!result) return []
    const sb = result.scoreBreakdown
    if (sb.type === "53") return [
      { label: "Nội dung (내용)", score: sb.content, max: 10, color: "#4A7C59" },
      { label: "Từ vựng & Ngữ pháp (어휘·문법)", score: sb.vocabGrammar, max: 10, color: "#7B9E6B" },
      { label: "Bố cục & Diễn đạt (구성·표현)", score: sb.structureExpression, max: 10, color: "#A8D5B5" },
    ]
    return [
      { label: "Nội dung (내용)", score: sb.content, max: 15, color: "#4A7C59" },
      { label: "Lập luận & Mạch lạc (구성·논리)", score: sb.logicCoherence, max: 15, color: "#7B9E6B" },
      { label: "Từ vựng (어휘)", score: sb.vocabulary, max: 10, color: "#A8D5B5" },
      { label: "Ngữ pháp (문법)", score: sb.grammar, max: 10, color: "#C5E8D0" },
    ]
  }

  const tabs = [
    { id: "overview", label: "Nhận xét chung" },
    { id: "corrections", label: "Từ vựng & Ngữ pháp" },
    { id: "logic", label: "Lập luận & Mạch lạc" },
    { id: "vocabulary", label: "Từ vựng theo chủ đề" },
    { id: "suggested", label: "Bài viết đề xuất" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#F7FBF8", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #2D5A3D 0%, #4A7C59 50%, #7B9E6B 100%)", padding: "48px 24px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(168,213,181,0.15) 0%, transparent 50%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", borderRadius: 99, padding: "6px 18px", marginBottom: 20, border: "1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 500, letterSpacing: 1 }}>✦ CHIXIEUNHAN</span>
          </div>
          <h1 style={{ fontSize: "clamp(24px, 5vw, 38px)", fontWeight: 800, color: "#ffffff", margin: "0 0 8px", letterSpacing: -0.5 }}>AI Chấm Bài TOPIK</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, margin: "0 0 6px" }}>TOPIK II 쓰기 자동 첨삭 서비스</p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0 }}>Chấm điểm & nhận xét chi tiết theo tiêu chí TOPIK II</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ background: "#ffffff", borderRadius: 20, boxShadow: "0 4px 24px rgba(45,90,61,0.08)", padding: 32, marginBottom: 24, border: "1px solid #E8F5EC" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D5A3D", margin: "0 0 24px" }}>✏️ Nhập bài viết</h2>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#4A7C59", marginBottom: 8 }}>Loại câu hỏi</label>
            <div style={{ display: "flex", gap: 12 }}>
              {["53", "54"].map(q => (
                <button key={q} onClick={() => setQuestionType(q)} style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: questionType === q ? "2px solid #4A7C59" : "2px solid #E8F5EC", background: questionType === q ? "#F0FAF4" : "#FAFAFA", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontWeight: 700, color: questionType === q ? "#2D5A3D" : "#6B9E7A", fontSize: 15 }}>Câu {q}</div>
                  <div style={{ fontSize: 12, color: "#A3C4AC", marginTop: 2 }}>{q === "53" ? "200~300 ký tự · 30 điểm" : "600~700 ký tự · 50 điểm"}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#4A7C59", marginBottom: 8 }}>Chủ đề <span style={{ fontWeight: 400, color: "#A3C4AC" }}>(không bắt buộc)</span></label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ví dụ: 기술 발전의 영향..." style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #E8F5EC", fontSize: 15, color: "#2D5A3D", background: "#FAFFFE", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#4A7C59", marginBottom: 8 }}>Bài viết của học viên</label>
            <textarea value={essayText} onChange={e => setEssayText(e.target.value)} placeholder="Dán bài viết tiếng Hàn vào đây..." rows={8} style={{ width: "100%", padding: "16px", borderRadius: 12, border: "1.5px solid #E8F5EC", fontSize: 15, color: "#2D5A3D", background: "#FAFFFE", outline: "none", resize: "vertical", lineHeight: 1.8, boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 13, color: "#A3C4AC" }}>Số ký tự: <strong style={{ color: "#4A7C59" }}>{essayText.length}</strong></span>
              {charHint && <span style={{ fontSize: 13, fontWeight: 600, color: charColor }}>Khuyến nghị: {charHint.min}~{charHint.max} ký tự</span>}
            </div>
          </div>
          <button onClick={handleGrade} disabled={!questionType || !essayText.trim() || isGrading} style={{ width: "100%", padding: "16px", borderRadius: 14, background: !questionType || !essayText.trim() || isGrading ? "#C5E8D0" : "linear-gradient(135deg, #2D5A3D, #4A7C59)", color: "#ffffff", border: "none", cursor: !questionType || !essayText.trim() || isGrading ? "not-allowed" : "pointer", fontSize: 17, fontWeight: 700, boxShadow: "0 8px 24px rgba(45,90,61,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {isGrading ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>✦</span> AI đang phân tích...</> : <>✦ Chấm bài ngay</>}
          </button>
          {error && <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 14 }}>⚠️ {error}</div>}
        </div>

        {result && (
          <div style={{ background: "#ffffff", borderRadius: 20, boxShadow: "0 4px 24px rgba(45,90,61,0.08)", border: "1px solid #E8F5EC", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #2D5A3D, #4A7C59)", padding: "32px 32px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
                <AnimatedScore score={result.scoreBreakdown.total} max={result.questionType === "53" ? 30 : 50} color="#A8D5B5" />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4 }}>Điểm câu {result.questionType}</div>
                  <div style={{ color: "#ffffff", fontSize: 32, fontWeight: 800, lineHeight: 1, marginBottom: 16 }}>
                    {result.scoreBreakdown.total}<span style={{ fontSize: 18, fontWeight: 400, color: "rgba(255,255,255,0.6)" }}>/{result.questionType === "53" ? 30 : 50}</span>
                  </div>
                  {getScoreItems().map(item => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", minWidth: 200 }}>{item.label}</span>
                      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: item.color, borderRadius: 99, width: (item.score / item.max * 100) + "%" }} />
                      </div>
                      <span style={{ fontSize: 13, color: "#ffffff", fontWeight: 700, minWidth: 40, textAlign: "right" }}>{item.score}/{item.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", overflowX: "auto", borderBottom: "2px solid #E8F5EC", background: "#FAFFFE" }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: "14px 20px", border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? "#2D5A3D" : "#A3C4AC", borderBottom: activeTab === tab.id ? "2px solid #4A7C59" : "2px solid transparent", marginBottom: -2 }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding: 28 }}>
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ padding: 20, background: "#F7FBF8", borderRadius: 14, border: "1px solid #E8F5EC" }}>
                    <p style={{ margin: 0, color: "#4A7C59", lineHeight: 1.8, fontSize: 15 }}>{result.generalFeedback.overview}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ padding: 20, background: "#F0FAF4", borderRadius: 14, border: "1px solid #C5E8D0" }}>
                      <div style={{ fontWeight: 700, color: "#2D5A3D", marginBottom: 14, fontSize: 15 }}>✅ Điểm mạnh</div>
                      {result.generalFeedback.strengths.map((s, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ color: "#4A7C59" }}>◆</span><span style={{ fontSize: 14, color: "#4A7C59", lineHeight: 1.6 }}>{s}</span></div>)}
                    </div>
                    <div style={{ padding: 20, background: "#FFFBF0", borderRadius: 14, border: "1px solid #FCD34D" }}>
                      <div style={{ fontWeight: 700, color: "#92400E", marginBottom: 14, fontSize: 15 }}>⚠️ Cần cải thiện</div>
                      {result.generalFeedback.weaknesses.map((w, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ color: "#D97706" }}>◆</span><span style={{ fontSize: 14, color: "#92400E", lineHeight: 1.6 }}>{w}</span></div>)}
                    </div>
                  </div>
                  <div style={{ padding: 20, background: "#F7FBF8", borderRadius: 14, border: "1px solid #E8F5EC", borderLeft: "4px solid #4A7C59" }}>
                    <div style={{ fontWeight: 700, color: "#2D5A3D", marginBottom: 10, fontSize: 15 }}>💬 Lời nhận xét của giáo viên</div>
                    <p style={{ margin: 0, color: "#4A7C59", lineHeight: 1.8, fontSize: 15, fontStyle: "italic" }}>"{result.generalFeedback.teacherComment}"</p>
                  </div>
                </div>
              )}

              {activeTab === "corrections" && (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                    {Object.entries(errorColors).map(([type, col]) => (
                      <span key={type} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, background: col.bg, color: col.text, border: "1px solid " + col.border }}>{col.label}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ flex: 2, minWidth: 280 }}>
                      <div style={{ fontSize: 13, color: "#A3C4AC", marginBottom: 10 }}>Nhấn vào phần tô màu để xem chi tiết</div>
                      <div style={{ padding: 20, background: "#FAFFFE", borderRadius: 14, border: "1px solid #E8F5EC", fontSize: 16, lineHeight: 2, color: "#2D5A3D" }}>{renderEssay()}</div>
                      <div style={{ marginTop: 12, display: "flex", gap: 20, fontSize: 13 }}>
                        <span style={{ color: "#6B9E7A" }}>Tổng lỗi: <strong>{result.inlineCorrections.length}</strong></span>
                        <span style={{ color: "#4A7C59" }}>Đã chấp nhận: <strong>{acceptedIds.size}</strong></span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      {selectedCorrection ? (() => {
                        const col = errorColors[selectedCorrection.type] || errorColors.grammar
                        return (
                          <div style={{ padding: 20, background: "#ffffff", borderRadius: 14, border: "1.5px solid " + col.border, boxShadow: "0 4px 20px rgba(45,90,61,0.1)", position: "sticky", top: 20 }} onClick={e => e.stopPropagation()}>
                            <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 99, background: col.bg, color: col.text, fontSize: 12, border: "1px solid " + col.border, marginBottom: 14 }}>{col.label}</span>
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 12, color: "#A3C4AC", marginBottom: 4 }}>Lỗi gốc</div>
                              <div style={{ padding: "8px 12px", background: "#FEF2F2", borderRadius: 8, color: "#991B1B", fontWeight: 600, textDecoration: "line-through", fontSize: 15 }}>{selectedCorrection.wrong}</div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 12, color: "#A3C4AC", marginBottom: 4 }}>Sửa thành</div>
                              <div style={{ padding: "8px 12px", background: "#F0FAF4", borderRadius: 8, color: "#2D5A3D", fontWeight: 600, fontSize: 15 }}>{selectedCorrection.correct}</div>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, color: "#A3C4AC", marginBottom: 4 }}>Giải thích</div>
                              <div style={{ padding: "10px 12px", background: "#F7FBF8", borderRadius: 8, color: "#4A7C59", fontSize: 13, lineHeight: 1.7, borderLeft: "3px solid #4A7C59" }}>{selectedCorrection.explanation}</div>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                              <button onClick={() => { setAcceptedIds(p => { const n = new Set(p); n.add(selectedCorrection.id); return n }); setRejectedIds(p => { const n = new Set(p); n.delete(selectedCorrection.id); return n }) }} style={{ flex: 1, padding: 10, borderRadius: 10, background: acceptedIds.has(selectedCorrection.id) ? "#2D5A3D" : "#F0FAF4", color: acceptedIds.has(selectedCorrection.id) ? "#ffffff" : "#2D5A3D", border: "1.5px solid #4A7C59", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>✓ Chấp nhận</button>
                              <button onClick={() => { setRejectedIds(p => { const n = new Set(p); n.add(selectedCorrection.id); return n }); setAcceptedIds(p => { const n = new Set(p); n.delete(selectedCorrection.id); return n }) }} style={{ flex: 1, padding: 10, borderRadius: 10, background: rejectedIds.has(selectedCorrection.id) ? "#6B7280" : "#F9FAFB", color: rejectedIds.has(selectedCorrection.id) ? "#ffffff" : "#6B7280", border: "1.5px solid #D1D5DB", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>✕ Từ chối</button>
                            </div>
                          </div>
                        )
                      })() : (
                        <div style={{ padding: 32, textAlign: "center", background: "#F7FBF8", borderRadius: 14, border: "1px dashed #C5E8D0", color: "#A3C4AC" }}>
                          <div style={{ fontSize: 32, marginBottom: 12 }}>✏️</div>
                          <div style={{ fontSize: 14 }}>Nhấn vào phần được tô màu để xem chi tiết</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "logic" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { icon: "🏗️", title: "Cấu trúc bài viết", content: result.logicFeedback.structure, color: "#EBF5FF", border: "#BFDBFE", text: "#1E40AF" },
                    { icon: "🔗", title: "Tính mạch lạc", content: result.logicFeedback.coherence, color: "#F3E8FF", border: "#DDD6FE", text: "#5B21B6" },
                    { icon: "💡", title: "Lập luận", content: result.logicFeedback.argumentation, color: "#F0FAF4", border: "#C5E8D0", text: "#2D5A3D" },
                  ].map(item => (
                    <div key={item.title} style={{ padding: 20, background: item.color, borderRadius: 14, border: "1px solid " + item.border }}>
                      <div style={{ fontWeight: 700, color: item.text, fontSize: 15, marginBottom: 10 }}>{item.icon} {item.title}</div>
                      <p style={{ margin: 0, color: item.text, lineHeight: 1.8, fontSize: 14 }}>{item.content}</p>
                    </div>
                  ))}
                  <div style={{ padding: 20, background: "#FFFBF0", borderRadius: 14, border: "1px solid #FCD34D" }}>
                    <div style={{ fontWeight: 700, color: "#92400E", fontSize: 15, marginBottom: 14 }}>📝 Gợi ý cải thiện</div>
                    {result.logicFeedback.suggestions.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 99, background: "#F59E0B", color: "#ffffff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: 14, color: "#92400E", lineHeight: 1.7 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "vocabulary" && (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "#A3C4AC" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                  <div style={{ fontSize: 15, marginBottom: 8, color: "#6B9E7A" }}>Tính năng đang được phát triển</div>
                  <div style={{ fontSize: 13 }}>Sắp có: từ vựng hay, cấu trúc ngữ pháp điểm cao và cách diễn đạt tự nhiên theo từng chủ đề TOPIK</div>
                </div>
              )}

              {activeTab === "suggested" && (
                <div>
                  <div style={{ padding: 20, background: "#F7FBF8", borderRadius: 14, border: "1px solid #E8F5EC", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>💡</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#2D5A3D", marginBottom: 4 }}>Bài viết mẫu tham khảo</div>
                      <div style={{ fontSize: 13, color: "#6B9E7A", lineHeight: 1.6 }}>Đây là phiên bản đã chỉnh sửa. Chỉ mang tính tham khảo — không sao chép nguyên văn.</div>
                    </div>
                  </div>
                  <div style={{ padding: 24, background: "#ffffff", borderRadius: 14, border: "1.5px solid #E8F5EC", fontSize: 16, lineHeight: 2, color: "#2D5A3D", whiteSpace: "pre-line", marginBottom: 16 }}>{result.suggestedEssay}</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={async () => { await navigator.clipboard.writeText(result.suggestedEssay); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ padding: "12px 24px", borderRadius: 10, background: copied ? "#2D5A3D" : "#F0FAF4", color: copied ? "#ffffff" : "#2D5A3D", border: "1.5px solid #4A7C59", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                      {copied ? "✓ Đã sao chép!" : "📋 Sao chép"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "32px 0 16px", color: "#A3C4AC", fontSize: 13 }}>
          <div>✦ Chixieunhan · AI Chấm Bài TOPIK · Kết quả chỉ mang tính tham khảo</div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } * { box-sizing: border-box }`}</style>
    </div>
  )
}

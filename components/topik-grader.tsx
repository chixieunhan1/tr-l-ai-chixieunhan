"use client"

import { useState, useEffect } from "react"

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
}

const errorColors: Record<ErrorType, { bg: string; text: string; border: string; label: string }> = {
  vocabulary: { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD", label: "Từ vựng" },
  grammar: { bg: "#EDE9FE", text: "#6D28D9", border: "#C4B5FD", label: "Ngữ pháp" },
  particle: { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D", label: "Trợ từ" },
  spacing: { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7", label: "띄어쓰기" },
  expression: { bg: "#FFE4E6", text: "#9F1239", border: "#FDA4AF", label: "Diễn đạt" },
  suggestion: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", label: "Đề xuất" },
}

function AnimatedScore({ score, max }: { score: number; max: number }) {
  const [displayed, setDisplayed] = useState(0)
  const [dashOffset, setDashOffset] = useState(339.3)
  const r = 54
  const circ = 2 * Math.PI * r
  const pct = score / max

  useEffect(() => {
    let s = 0
    const step = score / 50
    const timer = setInterval(() => {
      s += step
      if (s >= score) { setDisplayed(score); clearInterval(timer) }
      else setDisplayed(Math.floor(s))
    }, 25)
    return () => clearInterval(timer)
  }, [score])

  useEffect(() => {
    setTimeout(() => setDashOffset(circ * (1 - pct)), 200)
  }, [pct, circ])

  const color = pct >= 0.7 ? "#22C55E" : pct >= 0.5 ? "#F59E0B" : "#EF4444"

  return (
    <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#374151" strokeWidth="12" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>{displayed}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>/ {max}</span>
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
  const charOk = charHint ? essayText.length >= charHint.min && essayText.length <= charHint.max : false
  const canGrade = questionType && essayText.trim() && !isGrading

  const handleGrade = async () => {
    if (!canGrade) return
    setIsGrading(true); setError(null); setResult(null)
    setSelectedCorrection(null); setAcceptedIds(new Set()); setRejectedIds(new Set())
    try {
      const res = await fetch("/api/grade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionType, topic, essay: essayText }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Lỗi") }
      const data: GradingResult = await res.json()
      setResult(data); setActiveTab("overview")
      setTimeout(() => document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" }), 100)
    } catch (e) { setError(e instanceof Error ? e.message : "Đã có lỗi") }
    finally { setIsGrading(false) }
  }

  useEffect(() => {
    const h = () => setSelectedCorrection(null)
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
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
      const isAcc = acceptedIds.has(c.id), isRej = rejectedIds.has(c.id)
      const isSel = selectedCorrection?.id === c.id
      parts.push(
        <span key={"c" + c.id} onClick={e => { e.stopPropagation(); setSelectedCorrection(isSel ? null : c) }}
          style={{ cursor: "pointer", display: "inline", borderRadius: 4, outline: isSel ? "2.5px solid " + col.border : "none", outlineOffset: 2 }}>
          {!isAcc && !isRej && (
            <span style={{ background: col.bg, color: col.text, textDecoration: "line-through", textDecorationColor: col.text, padding: "2px 4px", borderRadius: "4px 4px 0 0" }}>{c.wrong}</span>
          )}
          {!isRej && (
            <span style={{ background: "#DCFCE7", color: "#166534", fontWeight: 700, padding: "2px 5px", borderRadius: isAcc ? 6 : "0 0 4px 4px", marginLeft: 1 }}>{c.correct}</span>
          )}
          {isRej && <span>{c.wrong}</span>}
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
      { label: "Nội dung (내용)", score: sb.content, max: 10, color: "#22C55E" },
      { label: "Từ vựng & Ngữ pháp (어휘·문법)", score: sb.vocabGrammar, max: 10, color: "#F59E0B" },
      { label: "Bố cục & Diễn đạt (구성·표현)", score: sb.structureExpression, max: 10, color: "#EC4899" },
    ]
    return [
      { label: "Nội dung (내용)", score: sb.content, max: 15, color: "#22C55E" },
      { label: "Lập luận & Mạch lạc (구성·논리)", score: sb.logicCoherence, max: 15, color: "#F59E0B" },
      { label: "Từ vựng (어휘)", score: sb.vocabulary, max: 10, color: "#8B5CF6" },
      { label: "Ngữ pháp (문법)", score: sb.grammar, max: 10, color: "#EC4899" },
    ]
  }

  const tabs = [
    { id: "overview", label: "📊 Nhận xét chung" },
    { id: "corrections", label: "✏️ Từ vựng & Ngữ pháp" },
    { id: "logic", label: "🧠 Lập luận" },
    { id: "suggested", label: "💡 Bài đề xuất" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Nunito', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#2D5A3D", padding: "0 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#F25C54", borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
            <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 18 }}>Chixieunhan</span>
          </div>
          <span style={{ background: "#FFD600", color: "#1F2937", fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 99 }}>AI Chấm Bài TOPIK</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(160deg, #2D5A3D 0%, #3B7A57 100%)", padding: "48px 24px 44px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#FFD600", color: "#1F2937", fontSize: 13, fontWeight: 800, padding: "6px 18px", borderRadius: 99, marginBottom: 18 }}>
          🎯 TOPIK II 쓰기 자동 첨삭
        </div>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 900, color: "#ffffff", margin: "0 0 10px", letterSpacing: -1 }}>
          AI Chấm Bài TOPIK
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: 0 }}>
          Nhận điểm số & nhận xét chi tiết như giáo viên thật — chỉ trong 30 giây
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px" }}>
        {/* Input Card */}
        <div style={{ background: "#ffffff", borderRadius: 20, border: "2px solid #F3F4F6", padding: 28, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, background: "#FEF3C7", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✏️</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F2937", margin: 0 }}>Nhập bài viết</h2>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Loại câu hỏi</label>
            <div style={{ display: "flex", gap: 12 }}>
              {[{ q: "53", desc: "200~300 ký tự · 30 điểm", emoji: "📝" }, { q: "54", desc: "600~700 ký tự · 50 điểm", emoji: "📄" }].map(({ q, desc, emoji }) => (
                <button key={q} onClick={() => setQuestionType(q)} style={{ flex: 1, padding: "14px 16px", borderRadius: 14, border: questionType === q ? "2.5px solid #2D5A3D" : "2px solid #E5E7EB", background: questionType === q ? "#F0FDF4" : "#ffffff", cursor: "pointer", textAlign: "left", boxShadow: questionType === q ? "0 0 0 4px rgba(45,90,61,0.08)" : "none", fontFamily: "inherit" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
                  <div style={{ fontWeight: 800, color: questionType === q ? "#2D5A3D" : "#374151", fontSize: 15 }}>Câu {q}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Chủ đề <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(không bắt buộc)</span></label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ví dụ: 기술 발전의 영향..." style={{ width: "100%", padding: "12px 16px", borderRadius: 14, border: "2px solid #E5E7EB", fontSize: 15, color: "#1F2937", background: "#FAFAFA", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Bài viết của học viên</label>
            <textarea value={essayText} onChange={e => setEssayText(e.target.value)} placeholder="Dán bài viết tiếng Hàn vào đây..." rows={8} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "2px solid #E5E7EB", fontSize: 15, color: "#1F2937", background: "#FAFAFA", outline: "none", resize: "vertical", lineHeight: 1.8, boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>Số ký tự: <strong style={{ color: "#374151" }}>{essayText.length}</strong></span>
              {charHint && <span style={{ fontSize: 13, fontWeight: 700, color: charOk ? "#16A34A" : essayText.length > 0 ? "#D97706" : "#9CA3AF" }}>{charOk ? "✓ " : ""}Khuyến nghị: {charHint.min}~{charHint.max}</span>}
            </div>
          </div>

          <button onClick={handleGrade} disabled={!canGrade} style={{ width: "100%", padding: "16px", borderRadius: 16, background: canGrade ? "#F25C54" : "#E5E7EB", color: canGrade ? "#ffffff" : "#9CA3AF", border: "none", cursor: canGrade ? "pointer" : "not-allowed", fontSize: 17, fontWeight: 800, boxShadow: canGrade ? "0 8px 20px rgba(242,92,84,0.35)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit" }}>
            {isGrading ? <><span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>⏳</span> AI đang phân tích...</> : <>🎯 Chấm bài ngay</>}
          </button>

          {error && <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 14, background: "#FEF2F2", border: "2px solid #FECACA", color: "#DC2626", fontSize: 14, fontWeight: 600 }}>⚠️ {error}</div>}
        </div>

        {/* Results */}
        {result && (
          <div id="result-section">
            <div style={{ background: "#ffffff", borderRadius: 20, border: "2px solid #F3F4F6", overflow: "hidden", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              {/* Score header */}
              <div style={{ background: "linear-gradient(135deg, #1F2937 0%, #374151 100%)", padding: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                  <AnimatedScore score={result.scoreBreakdown.total} max={result.questionType === "53" ? 30 : 50} />
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>KẾT QUẢ · CÂU {result.questionType}</div>
                    <div style={{ color: "#ffffff", fontSize: 34, fontWeight: 900, lineHeight: 1, marginBottom: 20 }}>
                      {result.scoreBreakdown.total}<span style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>/{result.questionType === "53" ? 30 : 50} điểm</span>
                    </div>
                    {getScoreItems().map(item => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", minWidth: 210, fontWeight: 500 }}>{item.label}</span>
                        <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden", minWidth: 60 }}>
                          <div style={{ height: "100%", background: item.color, borderRadius: 99, width: (item.score / item.max * 100) + "%", transition: "width 1.2s ease" }} />
                        </div>
                        <span style={{ fontSize: 13, color: "#ffffff", fontWeight: 800, minWidth: 36, textAlign: "right" }}>{item.score}/{item.max}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", overflowX: "auto", borderBottom: "2px solid #F3F4F6", padding: "0 8px" }}>
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: "14px 18px", border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14, fontWeight: activeTab === tab.id ? 800 : 500, color: activeTab === tab.id ? "#2D5A3D" : "#9CA3AF", borderBottom: activeTab === tab.id ? "3px solid #2D5A3D" : "3px solid transparent", marginBottom: -2, fontFamily: "inherit" }}>{tab.label}</button>
                ))}
              </div>

              <div style={{ padding: 28 }}>
                {activeTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ padding: 20, background: "#F9FAFB", borderRadius: 16, border: "2px solid #F3F4F6" }}>
                      <div style={{ fontWeight: 800, color: "#1F2937", marginBottom: 8 }}>📝 Nhận xét tổng quan</div>
                      <p style={{ margin: 0, color: "#4B5563", lineHeight: 1.8, fontSize: 15 }}>{result.generalFeedback.overview}</p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div style={{ padding: 20, background: "#F0FDF4", borderRadius: 16, border: "2px solid #BBF7D0" }}>
                        <div style={{ fontWeight: 800, color: "#166534", marginBottom: 12 }}>✅ Điểm mạnh</div>
                        {result.generalFeedback.strengths.map((s, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ color: "#22C55E" }}>◆</span><span style={{ fontSize: 14, color: "#166534", lineHeight: 1.6 }}>{s}</span></div>)}
                      </div>
                      <div style={{ padding: 20, background: "#FFFBEB", borderRadius: 16, border: "2px solid #FDE68A" }}>
                        <div style={{ fontWeight: 800, color: "#92400E", marginBottom: 12 }}>⚠️ Cần cải thiện</div>
                        {result.generalFeedback.weaknesses.map((w, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ color: "#F59E0B" }}>◆</span><span style={{ fontSize: 14, color: "#92400E", lineHeight: 1.6 }}>{w}</span></div>)}
                      </div>
                    </div>
                    <div style={{ padding: 20, background: "#EFF6FF", borderRadius: 16, border: "2px solid #BFDBFE" }}>
                      <div style={{ fontWeight: 800, color: "#1E40AF", marginBottom: 8 }}>💬 Nhận xét của giáo viên</div>
                      <p style={{ margin: 0, color: "#1E40AF", lineHeight: 1.8, fontSize: 15, fontStyle: "italic" }}>"{result.generalFeedback.teacherComment}"</p>
                    </div>
                  </div>
                )}

                {activeTab === "corrections" && (
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {Object.entries(errorColors).map(([type, col]) => (
                        <span key={type} style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: col.bg, color: col.text, border: "1.5px solid " + col.border }}>{col.label}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ flex: 2, minWidth: 260 }}>
                        <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 10, fontWeight: 600 }}>👆 Nhấn vào phần tô màu để xem chi tiết</div>
                        <div style={{ padding: 20, background: "#F9FAFB", borderRadius: 16, border: "2px solid #F3F4F6", fontSize: 16, lineHeight: 2, color: "#1F2937" }}>{renderEssay()}</div>
                        <div style={{ marginTop: 12, display: "flex", gap: 20, fontSize: 13, fontWeight: 700 }}>
                          <span style={{ color: "#6B7280" }}>Tổng: <span style={{ color: "#1F2937" }}>{result.inlineCorrections.length} lỗi</span></span>
                          <span style={{ color: "#16A34A" }}>✓ {acceptedIds.size}</span>
                          <span style={{ color: "#DC2626" }}>✕ {rejectedIds.size}</span>
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        {selectedCorrection ? (() => {
                          const col = errorColors[selectedCorrection.type] || errorColors.grammar
                          return (
                            <div style={{ padding: 20, background: "#ffffff", borderRadius: 16, border: "2.5px solid " + col.border, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", position: "sticky", top: 20 }} onClick={e => e.stopPropagation()}>
                              <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 99, background: col.bg, color: col.text, fontSize: 12, fontWeight: 800, marginBottom: 16 }}>{col.label}</span>
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Lỗi gốc</div>
                                <div style={{ padding: "10px 14px", background: "#FEF2F2", borderRadius: 10, color: "#DC2626", fontWeight: 800, textDecoration: "line-through", fontSize: 16 }}>{selectedCorrection.wrong}</div>
                              </div>
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Sửa thành</div>
                                <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 10, color: "#166534", fontWeight: 800, fontSize: 16 }}>{selectedCorrection.correct}</div>
                              </div>
                              <div style={{ marginBottom: 18 }}>
                                <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Giải thích</div>
                                <div style={{ padding: "12px 14px", background: "#F9FAFB", borderRadius: 10, color: "#374151", fontSize: 13, lineHeight: 1.7, borderLeft: "4px solid " + col.border }}>{selectedCorrection.explanation}</div>
                              </div>
                              <div style={{ display: "flex", gap: 10 }}>
                                <button onClick={() => { setAcceptedIds(p => { const n = new Set(p); n.add(selectedCorrection.id); return n }); setRejectedIds(p => { const n = new Set(p); n.delete(selectedCorrection.id); return n }) }} style={{ flex: 1, padding: "11px", borderRadius: 12, background: acceptedIds.has(selectedCorrection.id) ? "#16A34A" : "#F0FDF4", color: acceptedIds.has(selectedCorrection.id) ? "#fff" : "#16A34A", border: "2px solid #22C55E", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>✓ Chấp nhận</button>
                                <button onClick={() => { setRejectedIds(p => { const n = new Set(p); n.add(selectedCorrection.id); return n }); setAcceptedIds(p => { const n = new Set(p); n.delete(selectedCorrection.id); return n }) }} style={{ flex: 1, padding: "11px", borderRadius: 12, background: rejectedIds.has(selectedCorrection.id) ? "#6B7280" : "#F9FAFB", color: rejectedIds.has(selectedCorrection.id) ? "#fff" : "#6B7280", border: "2px solid #D1D5DB", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>✕ Từ chối</button>
                              </div>
                            </div>
                          )
                        })() : (
                          <div style={{ padding: 32, textAlign: "center", background: "#F9FAFB", borderRadius: 16, border: "2px dashed #E5E7EB", color: "#9CA3AF" }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>Nhấn vào phần tô màu<br />để xem chi tiết lỗi</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "logic" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { icon: "🏗️", title: "Cấu trúc bài viết", content: result.logicFeedback.structure, bg: "#EFF6FF", border: "#BFDBFE", color: "#1E40AF" },
                      { icon: "🔗", title: "Tính mạch lạc", content: result.logicFeedback.coherence, bg: "#F5F3FF", border: "#DDD6FE", color: "#5B21B6" },
                      { icon: "💡", title: "Lập luận", content: result.logicFeedback.argumentation, bg: "#F0FDF4", border: "#BBF7D0", color: "#166534" },
                    ].map(item => (
                      <div key={item.title} style={{ padding: 20, background: item.bg, borderRadius: 16, border: "2px solid " + item.border }}>
                        <div style={{ fontWeight: 800, color: item.color, fontSize: 15, marginBottom: 8 }}>{item.icon} {item.title}</div>
                        <p style={{ margin: 0, color: item.color, lineHeight: 1.8, fontSize: 14 }}>{item.content}</p>
                      </div>
                    ))}
                    <div style={{ padding: 20, background: "#FFFBEB", borderRadius: 16, border: "2px solid #FDE68A" }}>
                      <div style={{ fontWeight: 800, color: "#92400E", fontSize: 15, marginBottom: 14 }}>📌 Gợi ý cải thiện</div>
                      {result.logicFeedback.suggestions.map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                          <span style={{ width: 24, height: 24, borderRadius: 99, background: "#F59E0B", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: 14, color: "#92400E", lineHeight: 1.7 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "suggested" && (
                  <div>
                    <div style={{ padding: 18, background: "#FFFBEB", borderRadius: 16, border: "2px solid #FDE68A", marginBottom: 18, display: "flex", gap: 12 }}>
                      <span style={{ fontSize: 24 }}>💡</span>
                      <div>
                        <div style={{ fontWeight: 800, color: "#92400E", marginBottom: 4 }}>Bài viết mẫu tham khảo</div>
                        <div style={{ fontSize: 13, color: "#B45309", lineHeight: 1.6 }}>Chỉ mang tính tham khảo — học hỏi cách diễn đạt, không sao chép nguyên văn nhé!</div>
                      </div>
                    </div>
                    <div style={{ padding: 24, background: "#F9FAFB", borderRadius: 16, border: "2px solid #F3F4F6", fontSize: 16, lineHeight: 2, color: "#1F2937", whiteSpace: "pre-line", marginBottom: 16 }}>{result.suggestedEssay}</div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={async () => { await navigator.clipboard.writeText(result.suggestedEssay); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ padding: "12px 24px", borderRadius: 12, background: copied ? "#16A34A" : "#F0FDF4", color: copied ? "#fff" : "#16A34A", border: "2px solid #22C55E", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>
                        {copied ? "✓ Đã sao chép!" : "📋 Sao chép"}
                      </button>
                      <button onClick={() => { const b = new Blob([result.suggestedEssay], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "topik_suggested.txt"; a.click(); URL.revokeObjectURL(u) }} style={{ padding: "12px 24px", borderRadius: 12, background: "#F0F9FF", color: "#0369A1", border: "2px solid #7DD3FC", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>
                        ⬇️ Tải xuống
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", color: "#D1D5DB", fontSize: 13, padding: "8px 0 24px", fontWeight: 600 }}>
          ✦ Chixieunhan · AI Chấm Bài TOPIK · Kết quả chỉ mang tính tham khảo
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } * { box-sizing: border-box } button:active { transform: scale(0.97) }`}</style>
    </div>
  )
}

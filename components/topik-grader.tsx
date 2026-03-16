"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb, 
  Sparkles, 
  PenLine, 
  Copy, 
  Download,
  Award,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  X,
  Check,
  HelpCircle,
  Layers
} from "lucide-react"

// Error types for inline corrections
// "suggestion" is NOT an error - it's a style improvement recommendation
type ErrorType = "vocabulary" | "grammar" | "particle" | "spacing" | "expression" | "suggestion"

interface InlineCorrection {
  id: string
  position: number // position in the original text
  wrong: string
  correct: string
  type: ErrorType
  explanation: string
  context: string // surrounding sentence fragment
}

// Score breakdown for TOPIK 53 (30 points total)
// Format: 내용 (10), 문법 (10), 어휘 (10)
interface Score53 {
  type: "53"
  content: number // 내용 - max 10
  grammar: number // 문법 - max 10
  vocabulary: number // 어휘 - max 10
  total: number // max 30
}

// Score breakdown for TOPIK 54 (50 points total)
interface Score54 {
  type: "54"
  content: number // 내용 - max 15
  logicCoherence: number // 구성·논리 - max 15
  vocabulary: number // 어휘 - max 10
  grammar: number // 문법 - max 10
  total: number // max 50
}

type ScoreBreakdown = Score53 | Score54

interface GradingResult {
  questionType: "53" | "54"
  scoreBreakdown: ScoreBreakdown
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

// Mock result for TOPIK 54
const mockGradingResult54: GradingResult = {
  questionType: "54",
  scoreBreakdown: {
    type: "54",
    content: 12,
    logicCoherence: 11,
    vocabulary: 7,
    grammar: 6,
    total: 36,
  },
  generalFeedback: {
    overview: "Bài viết của em hoàn thành khá tốt với cấu trúc rõ ràng và luận điểm cụ thể. Tuy nhiên, còn một số lỗi ngữ pháp và từ vựng cần khắc phục để đạt điểm cao hơn.",
    strengths: [
      "Cấu trúc bài viết rõ ràng với mở bài, thân bài và kết luận",
      "Sử dụng các liên từ phù hợp để kết nối các ý",
      "Đưa ra được luận điểm và dẫn chứng cụ thể",
      "Từ vựng đa dạng, phù hợp với chủ đề"
    ],
    weaknesses: [
      "Một số lỗi ngữ pháp cơ bản cần khắc phục",
      "Phần kết luận có thể mạnh mẽ hơn",
      "Cần sử dụng thêm các cấu trúc câu nâng cao"
    ],
    teacherComment: "Em đã hoàn thành bài viết khá tốt với điểm số 36/50. Cô thấy em đã nắm được cách triển khai ý và sử dụng từ vựng phù hợp. Tuy nhiên, em cần chú ý hơn đến việc chia động từ và sử dụng các trợ từ chính xác. Đặc biệt cần luyện tập thêm về 띄어쓰기 (cách viết tách) và các biểu hiện tự nhiên trong tiếng Hàn. Nếu em luyện tập thêm phần ngữ pháp, điểm số sẽ cải thiện đáng kể. Cố lên em nhé!"
  },
  originalEssay: `요즘 현대 사회에서 기술의 발전이 우리 생활에 미치는 영향에 대한 논의가 활발합니다. 저는 기술 발전이 우리 삶에 긍정적인 영향을 더 많이 준다고 생각을 합니다.

첫째, 기술의 발전으로 인해 의사소통이 더욱 편리해졌습니다. 스마트폰과 인터넷의 보급으로 우리는 언제 어디서나 가족, 친구들과 연락할수 있게 되었습니다. 많은 사람 해외에 있어도 화상 통화를 통해 얼굴을 보며 대화할 수 있습니다.

둘째, 기술의 발전은 교육 분야에도 큰 변화를 가져왔습니다. 온라인 강의와 교육 플랫폼의 등장으로 시간과 장소에 구애받지않고 학습할 수 있게 되었습니다. 때문에 그러므로 교육의 기회가 더욱 평등해졌습니다.

물론 기술 발전에 따른 좋은 점만 있는 것은 아닙니다. 나쁜 점도 있습니다. 개인 정보 유출, 디지털 중독 등의 문제가 아주 많이 발생합니다. 그러나 이러한 문제들은 적절한 규제와 교육을 통해 해결할 수 있습니다.

결론적으로, 기술의 발전은 나쁜 점보다 좋은 점이 더 많다고 생각합니다. 공부하는 것은 중요한다. 우리는 기술을 현명하게 활용하여 더 나은 삶을 영위해야 합니다.`,
  inlineCorrections: [
    {
      id: "1",
      position: 142,
      wrong: "생각을 합니다",
      correct: "생각합니다",
      type: "suggestion",
      explanation: "Cấu trúc 'N+을/를 하다' (생각을 하다, 공부를 하다, 이야기를 하다) là đúng ngữ pháp. Tuy nhiên, trong văn viết học thuật, dạng rút gọn '생각합니다' có thể gọn gàng hơn. Đây chỉ là đề xuất về phong cách, không phải lỗi.",
      context: "...긍정적인 영향을 더 많이 준다고 생각을 합니다."
    },
    {
      id: "2",
      position: 245,
      wrong: "연락할수",
      correct: "연락할 수",
      type: "spacing",
      explanation: "Cần có khoảng cách giữa '연락할' và '수'. Trong tiếng Hàn, '-ㄹ 수 있다' luôn viết tách '수'.",
      context: "...가족, 친구들과 연락할수 있게 되었습니다."
    },
    {
      id: "3",
      position: 280,
      wrong: "많은 사람",
      correct: "많은 사람들이",
      type: "grammar",
      explanation: "Cần thêm trợ từ chủ ngữ '이' và dùng '사람들' (số nhiều) để câu hoàn chỉnh về mặt ngữ pháp.",
      context: "많은 사람 해외에 있어도 화상 통화를..."
    },
    {
      id: "4",
      position: 420,
      wrong: "구애받지않고",
      correct: "구애받지 않고",
      type: "spacing",
      explanation: "'않고' phải viết tách với động từ phía trước. Đây là lỗi 띄어쓰기 thường gặp.",
      context: "...시간과 장소에 구애받지않고 학습할 수 있게..."
    },
    {
      id: "5",
      position: 460,
      wrong: "때문에 그러므로",
      correct: "그러므로",
      type: "grammar",
      explanation: "Không dùng '때문에' và '그러므로' cùng lúc vì cả hai đều diễn đạt quan hệ nhân quả. Chỉ cần dùng một trong hai.",
      context: "때문에 그러므로 교육의 기회가 더욱 평등해졌습니다."
    },
    {
      id: "6",
      position: 520,
      wrong: "좋은 점",
      correct: "장점",
      type: "vocabulary",
      explanation: "'장점' là từ vựng học thuật hơn, phù hợp với văn phong TOPIK. Nên dùng '장점/단점' thay vì '좋은 점/나쁜 점'.",
      context: "...기����� 발전에 따른 좋은 점만 있는 것은 아닙니다."
    },
    {
      id: "7",
      position: 545,
      wrong: "나쁜 점",
      correct: "단점",
      type: "vocabulary",
      explanation: "Tương tự, '단점' là cách diễn đạt chuẩn mực hơn trong bài luận học thuật.",
      context: "나쁜 점도 있습니다."
    },
    {
      id: "8",
      position: 590,
      wrong: "아주 많이",
      correct: "상당히",
      type: "vocabulary",
      explanation: "'상당히' mang tính học thuật cao hơn, phù hợp với bài viết chính thức. '아주 많이' có phần khẩu ngữ.",
      context: "...등의 문제가 아주 많이 발생합니다."
    },
    {
      id: "9",
      position: 720,
      wrong: "공부하는 것은 중요한다",
      correct: "공부하는 것은 중요하다",
      type: "grammar",
      explanation: "'중요한다' là cách chia sai. Tính từ '중요하다' không thêm '-ㄴ다' như động từ. Tính từ giữ nguyên dạng기본형.",
      context: "공부하는 것은 중요한다."
    }
  ],
  logicFeedback: {
    structure: "Bài viết có cấu trúc 3 phần rõ ràng: Mở bài nêu quan điểm, Thân bài triển khai 2 luận điểm chính với dẫn chứng, và Kết bài tóm tắt. Tuy nhiên, phần kết luận hơi ngắn và thiếu sự liên kết với các luận điểm đã nêu.",
    coherence: "Các ý trong bài được kết nối khá tốt nhờ sử dụng các liên từ như '첫째', '둘째', '물론', '그러나'. Tuy nhiên, đoạn cuối thân bài chuyển đột ngột từ ưu điểm sang nhược điểm.",
    argumentation: "Luận điểm 1 (giao tiếp) và luận điểm 2 (giáo dục) được triển khai khá đầy đủ với ví dụ cụ thể. Phần nêu mặt trái của công nghệ còn sơ sài, chỉ liệt kê mà không phân tích sâu.",
    suggestions: [
      "Thêm 1-2 câu phân tích sâu hơn về nhược điểm của công nghệ",
      "Kết luận nên nhắc lại các luận điểm chính một cách ngắn gọn",
      "Có thể thêm câu hỏi tu từ hoặc lời kêu gọi hành động ở cuối bài",
      "Đoạn chuyển tiếp giữa ưu điểm và nhược điểm cần mượt mà hơn"
    ]
  },
  suggestedEssay: `요즘 현대 사회에서 기술의 발전이 우리 생활에 미치는 영향에 대한 논의가 활발합니다. 저는 기술 발전이 우리 삶에 긍정적인 영향을 더 많이 준다고 생각합니다.

첫째, 기술의 발전으로 인해 의사소통이 더욱 편리해졌습니다. 스마트폰과 인터넷의 보급으로 우리는 언제 어디서나 가족, 친구들과 연락할 수 있게 되었습니다. 특히 해외에 있는 사람들과도 화상 통화를 통해 얼굴을 보며 대화할 수 있습니다.

둘째, 기술의 발전은 교육 분야에도 큰 변화를 가져왔습니다. 온라인 강의와 교육 플랫폼의 등장으로 시간과 장소에 구애받지 않고 학습할 수 있게 되었습니다. 이로 인해 교육의 기회가 더욱 평등해졌습니다.

물론 기술 발전에 따른 부작용도 존재합니다. 개인 정보 유출, 디지털 중독 등의 문제가 상당히 발생하고 있습니다. 그러나 이러한 문제들은 적절한 규제와 교육을 통해 해결할 수 있습니다.

결론적으로, 기술의 발전은 단점보다 장점이 더 많다고 생각합니다. 우리는 기술을 현명하게 활용하여 더 나은 삶을 영위해야 합니다.`,
}

// Mock result for TOPIK 53
const mockGradingResult53: GradingResult = {
  questionType: "53",
  scoreBreakdown: {
    type: "53",
    content: 8,
    vocabGrammar: 7,
    structureExpression: 9,
    total: 24,
  },
  generalFeedback: {
    overview: "Bài viết ngắn của em đã trả lời đúng yêu cầu đề bài. Cần chú ý hơn về việc sử dụng từ vựng chính xác và tránh các lỗi ngữ pháp cơ bản.",
    strengths: [
      "Trả lời đúng trọng tâm câu hỏi",
      "Diễn đạt ý rõ ràng, dễ hiểu",
      "Sử dụng liên từ phù hợp"
    ],
    weaknesses: [
      "Một số lỗi 띄어쓰기 cần khắc phục",
      "Cần sử dụng từ vựng đa dạng hơn"
    ],
    teacherComment: "Em đã hoàn thành bài viết câu 53 với điểm số 24/30. Bài viết trả lời đúng yêu cầu đề, nhưng còn một số lỗi nhỏ về cách viết. Hãy chú ý hơn về 띄어쓰기 nhé!"
  },
  originalEssay: `저는 한국어를 배우기 시작한 지 2년이 되었습니다. 처음에는 한글을 읽는 것도 어려웠지만 지금은 한국 드라마를 자막없이 볼수 있게 되었습니다. 한국어를 배우면서 가장 좋았던 점은 한국 친구들과 직접 대화할수 있게 된 것입니다. 앞으로도 계속 열심히 공부해서 한국에서 살고 싶습니다.`,
  inlineCorrections: [
    {
      id: "53-1",
      position: 85,
      wrong: "볼수",
      correct: "볼 수",
      type: "spacing",
      explanation: "'-ㄹ 수 있다' 구문에서 '수'는 항상 띄어 씁니다.",
      context: "...한국 드라마를 자막없이 볼수 있게 되었습니다."
    },
    {
      id: "53-2",
      position: 75,
      wrong: "자막없이",
      correct: "자막 없이",
      type: "spacing",
      explanation: "'없이'는 명사와 띄어 씁니다.",
      context: "...한국 드라마를 자막없이 볼 수 있게..."
    },
    {
      id: "53-3",
      position: 160,
      wrong: "대화할수",
      correct: "대화할 수",
      type: "spacing",
      explanation: "'-ㄹ 수 있다' 구문에서 '수'는 항상 띄어 씁니다.",
      context: "...친구들과 직접 대화할수 있게 된 것입니다."
    }
  ],
  logicFeedback: {
    structure: "Bài viết ngắn gọn với cấu trúc: giới thiệu (thời gian học) → quá trình (từ khó đến dễ) → kết quả (giao tiếp được) → mục tiêu tương lai.",
    coherence: "Các ý được kết nối logic và tự nhiên.",
    argumentation: "Luận điểm rõ ràng với ví dụ cụ thể về việc xem phim không phụ đề.",
    suggestions: [
      "Có thể thêm chi tiết về phương pháp học để bài viết phong phú hơn"
    ]
  },
  suggestedEssay: `저는 한국어를 배우기 시작한 지 2년이 되었습니다. 처음에는 한글을 읽는 것도 어려웠지만 지금은 한국 드라마를 자막 없이 볼 수 있게 되었습니다. 한국어를 배우면서 가장 좋았던 점은 한국 친구들과 직접 대화할 수 있게 된 것입니다. 앞으로도 계속 열심히 공부해서 한국에서 살고 싶습니다.`
}

const errorTypeLabels: Record<ErrorType, { label: string; color: string; bgColor: string; isError: boolean }> = {
  vocabulary: { label: "Từ vựng", color: "text-blue-700", bgColor: "bg-blue-100", isError: true },
  grammar: { label: "Ngữ pháp", color: "text-purple-700", bgColor: "bg-purple-100", isError: true },
  particle: { label: "Trợ từ (조사)", color: "text-orange-700", bgColor: "bg-orange-100", isError: true },
  spacing: { label: "Cách viết (띄어쓰기)", color: "text-teal-700", bgColor: "bg-teal-100", isError: true },
  expression: { label: "Diễn đạt tự nhiên", color: "text-pink-700", bgColor: "bg-pink-100", isError: true },
  suggestion: { label: "Đề xuất diễn đạt gọn hơn", color: "text-gray-600", bgColor: "bg-gray-100", isError: false },
}

export function TopikGrader() {
  const [selectedQuestion, setSelectedQuestion] = useState<string>("")
  const [topic, setTopic] = useState<string>("")
  const [essayText, setEssayText] = useState<string>("")
  const [isGrading, setIsGrading] = useState(false)
  const [result, setResult] = useState<GradingResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedCorrection, setSelectedCorrection] = useState<InlineCorrection | null>(null)
  const [acceptedCorrections, setAcceptedCorrections] = useState<Set<string>>(new Set())
  const [rejectedCorrections, setRejectedCorrections] = useState<Set<string>>(new Set())

  const [gradingError, setGradingError] = useState<string | null>(null)

  const handleGrade = async () => {
    if (!selectedQuestion || !essayText.trim()) return

    setIsGrading(true)
    setGradingError(null)
    setSelectedCorrection(null)
    setAcceptedCorrections(new Set())
    setRejectedCorrections(new Set())

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: selectedQuestion,
          topic: topic,
          essay: essayText,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Đã có lỗi xảy ra")
      }

      const gradingResult: GradingResult = await response.json()
      setResult(gradingResult)
    } catch (error) {
      console.error("Grading error:", error)
      setGradingError(
        error instanceof Error ? error.message : "Đã có lỗi xảy ra khi chấm bài. Vui lòng thử lại."
      )
    } finally {
      setIsGrading(false)
    }
  }

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result.suggestedEssay)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result.suggestedEssay], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `topik_suggested_essay_${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleAcceptCorrection = (id: string) => {
    setAcceptedCorrections(prev => new Set(prev).add(id))
    setRejectedCorrections(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }

  const handleRejectCorrection = (id: string) => {
    setRejectedCorrections(prev => new Set(prev).add(id))
    setAcceptedCorrections(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }

  const getCharacterHint = () => {
    if (selectedQuestion === "53") {
      return { min: 200, max: 300, label: "200~300 ký tự" }
    }
    if (selectedQuestion === "54") {
      return { min: 600, max: 700, label: "600~700 ký tự" }
    }
    return null
  }

  const characterHint = getCharacterHint()

  // Render essay with inline corrections
  const renderCorrectedEssay = () => {
    if (!result) return null

    const essay = result.originalEssay || essayText || ""
    const corrections = result.inlineCorrections || []
    
    if (!essay) return <span>{essayText}</span>

    const validCorrections = corrections.filter((c: any) => 
      c && c.wrong && typeof c.position === "number" &&
      c.position >= 0 && c.position < essay.length &&
      essay.substring(c.position, c.position + c.wrong.length) === c.wrong
    )

    if (validCorrections.length === 0) {
      return <span>{essay}</span>
    }

    const segments: React.ReactNode[] = []
    let lastIndex = 0

    const sortedCorrections = [...validCorrections].sort((a: any, b: any) => a.position - b.position)

    sortedCorrections.forEach((correction: any, idx: number) => {
      if (correction.position < lastIndex) return

      const textBefore = essay.substring(lastIndex, correction.position)
      if (textBefore) {
        segments.push(<span key={`text-${idx}`}>{textBefore}</span>)
      }

      const isAccepted = acceptedCorrections.has(correction.id)
      const isRejected = rejectedCorrections.has(correction.id)
      const isSelected = selectedCorrection?.id === correction.id

      const isSuggestion = correction.type === "suggestion"
      const typeInfo = errorTypeLabels[correction.type as ErrorType] || errorTypeLabels["grammar"]
      
      segments.push(
        <span
          key={`correction-${correction.id}`}
          className={`
            inline cursor-pointer transition-all duration-200
            ${isSelected ? "ring-2 ring-primary ring-offset-1 rounded" : ""}
          `}
          onClick={() => setSelectedCorrection(correction)}
        >
          {/* Wrong text - red background with strikethrough */}
          {!isAccepted && !isRejected && (
            <span
              className={`
                px-1 rounded-sm
                ${isSuggestion
                  ? "bg-blue-100 text-blue-700 line-through decoration-blue-500 decoration-2"
                  : "bg-red-100 text-red-600 line-through decoration-red-500 decoration-2"
                }
              `}
            >
              {correction.wrong}
            </span>
          )}
          {/* Correct text - green/blue text directly after (no brackets) */}
          {!isRejected && (
            <span
              className={`
                px-1 rounded-sm font-medium
                ${isSuggestion
                  ? "bg-cyan-100 text-cyan-700"
                  : "bg-green-100 text-green-700"
                }
              `}
            >
              {correction.correct}
            </span>
          )}
          {/* Show only wrong text when rejected */}
          {isRejected && (
            <span className="text-foreground">
              {correction.wrong}
            </span>
          )}
        </span>
      )

      lastIndex = correction.position + correction.wrong.length
    })

    // Add remaining text
    if (lastIndex < essay.length) {
      segments.push(<span key="text-end">{essay.substring(lastIndex)}</span>)
    }

    return segments
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Premium Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
                <PenLine className="w-10 h-10 text-primary" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-balance">
            AI TOPIK Writing Grader
          </h1>
          <p className="text-primary font-medium text-lg mb-3">
            TOPIK 쓰기 자동 첨삭 서비스
          </p>
          <p className="text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed">
            Hệ thống chấm điểm và nhận xét bài viết TOPIK tự động bằng AI. 
            Nhận phản hồi chi tiết như giáo viên thực sự.
          </p>
          
          <Badge variant="secondary" className="bg-secondary/80 text-secondary-foreground px-4 py-1.5 text-sm font-medium">
            <Award className="w-4 h-4 mr-1.5" />
            Dành cho TOPIK 53 & 54
          </Badge>
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Form Card */}
          <Card className="border-border/40 shadow-lg shadow-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <BookOpen className="w-5 h-5 text-primary" />
                Nhập bài viết
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Question Type Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Loại câu hỏi
                </Label>
                <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                  <SelectTrigger className="w-full bg-input/50 border-border/50 h-12 text-base">
                    <SelectValue placeholder="Chọn loại câu hỏi TOPIK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="53">
                      <span className="font-medium">TOPIK 53</span>
                      <span className="text-muted-foreground ml-2">- Điền vào chỗ trống (200~300 ký tự)</span>
                    </SelectItem>
                    <SelectItem value="54">
                      <span className="font-medium">TOPIK 54</span>
                      <span className="text-muted-foreground ml-2">- Bài luận (600~700 ký tự)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Topic Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Chủ đề bài viết <span className="text-muted-foreground font-normal">(không bắt buộc)</span>
                </Label>
                <Input
                  placeholder="Ví dụ: 기술 발전의 영향, 환경 보호의 중요성..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bg-input/50 border-border/50 h-11"
                />
              </div>

              {/* Essay Textarea */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Bài viết của học viên
                </Label>
                <Textarea
                  placeholder="Dán bài viết tiếng Hàn của học viên vào đây..."
                  className="min-h-[220px] bg-input/50 border-border/50 resize-none text-base leading-relaxed"
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Số ký tự: <span className="font-medium text-foreground">{essayText.length}</span>
                  </span>
                  {characterHint && (
                    <span className={`font-medium ${
                      essayText.length >= characterHint.min && essayText.length <= characterHint.max
                        ? "text-green-600"
                        : essayText.length > 0
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}>
                      Khuyến nghị: {characterHint.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Grade Button */}
              <Button
                onClick={handleGrade}
                disabled={!selectedQuestion || !essayText.trim() || isGrading}
                className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/20"
              >
                {isGrading ? (
                  <>
                    <div className="relative mr-3">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <div className="absolute inset-0 animate-ping">
                        <Sparkles className="w-5 h-5 opacity-50" />
                      </div>
                    </div>
                    AI đang phân tích bài viết...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Chấm bài ngay
                  </>
                )}
              </Button>

              {/* Error Display */}
              {gradingError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800 mb-1">Lỗi chấm bài</p>
                    <p className="text-sm text-red-700">{gradingError}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Card */}
          {result && (
            <Card className="border-border/40 shadow-lg shadow-primary/5 overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-secondary/50 to-accent/20 border-b border-border/30">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Kết quả chấm bài
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-muted/20 p-0 h-auto flex-wrap">
                    <TabsTrigger
                      value="general"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 md:px-6 py-3.5 font-medium"
                    >
                      <MessageSquare className="w-4 h-4 mr-1.5 hidden sm:inline" />
                      Nhận xét chung
                    </TabsTrigger>
                    <TabsTrigger
                      value="corrections"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 md:px-6 py-3.5 font-medium"
                    >
                      <PenLine className="w-4 h-4 mr-1.5 hidden sm:inline" />
                      Từ vựng & Ngữ pháp
                    </TabsTrigger>
                    <TabsTrigger
                      value="logic"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 md:px-6 py-3.5 font-medium"
                    >
                      <Layers className="w-4 h-4 mr-1.5 hidden sm:inline" />
                      Lập luận & Mạch lạc
                    </TabsTrigger>
                    <TabsTrigger
                      value="suggested"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 md:px-6 py-3.5 font-medium"
                    >
                      <Lightbulb className="w-4 h-4 mr-1.5 hidden sm:inline" />
                      Bài viết đề xuất
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: General Feedback */}
                  <TabsContent value="general" className="p-6 mt-0 space-y-5">
                    {/* Overview */}
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-foreground leading-relaxed">{result.generalFeedback.overview}</p>
                    </div>

                    {/* Score Breakdown Card */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 border border-primary/20">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-primary/10">
                        <div className="p-2.5 bg-primary/15 rounded-xl">
                          <Award className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Điểm câu {result.questionType}</p>
                          <p className="text-3xl font-bold text-primary">
                            {result.scoreBreakdown.total} / {result.questionType === "53" ? "30" : "50"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Detailed Score Breakdown */}
                      <div className="space-y-3">
                        {result.scoreBreakdown.type === "53" ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">Nội dung (내용)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all" 
                                    style={{ width: `${(result.scoreBreakdown.content / 10) * 100}%` }} 
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{result.scoreBreakdown.content}/10</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">Từ vựng & Ngữ pháp (어휘·문법)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all" 
                                    style={{ width: `${(result.scoreBreakdown.vocabGrammar / 10) * 100}%` }} 
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{result.scoreBreakdown.vocabGrammar}/10</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">Bố cục & Diễn đạt (구성·표현)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all" 
                                    style={{ width: `${(result.scoreBreakdown.structureExpression / 10) * 100}%` }} 
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{result.scoreBreakdown.structureExpression}/10</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">Nội dung (내용)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all" 
                                    style={{ width: `${(result.scoreBreakdown.content / 15) * 100}%` }} 
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{result.scoreBreakdown.content}/15</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">Lập luận & Mạch lạc (구성·논리)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all" 
                                    style={{ width: `${(result.scoreBreakdown.logicCoherence / 15) * 100}%` }} 
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{result.scoreBreakdown.logicCoherence}/15</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">Từ vựng (어휘)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all" 
                                    style={{ width: `${(result.scoreBreakdown.vocabulary / 10) * 100}%` }} 
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{result.scoreBreakdown.vocabulary}/10</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">Ngữ pháp (문법)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all" 
                                    style={{ width: `${(result.scoreBreakdown.grammar / 10) * 100}%` }} 
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{result.scoreBreakdown.grammar}/10</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-green-800">Điểm mạnh</h4>
                      </div>
                      <ul className="space-y-2">
                        {result.generalFeedback.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2 text-green-700">
                            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-amber-800">Cần cải thiện</h4>
                      </div>
                      <ul className="space-y-2">
                        {result.generalFeedback.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-start gap-2 text-amber-700">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Teacher Comment */}
                    <div className="p-4 rounded-xl bg-secondary/50 border border-secondary">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-5 h-5 text-secondary-foreground" />
                        <h4 className="font-semibold text-secondary-foreground">Nhận xét của giáo viên</h4>
                      </div>
                      <p className="text-secondary-foreground leading-relaxed italic">
                        "{result.generalFeedback.teacherComment}"
                      </p>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Vocabulary & Grammar - Interactive Inline Correction */}
                  <TabsContent value="corrections" className="mt-0">
                    <div className="flex flex-col lg:flex-row min-h-[500px]">
                      {/* Left Column - Corrected Essay Viewer */}
                      <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-border/30">
                        <div className="mb-4">
                          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            <PenLine className="w-4 h-4 text-primary" />
                            Bài viết đã được đánh dấu lỗi
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Nhấn vào các phần được đánh dấu để xem chi tiết và chấp nhận/từ chối sửa lỗi.
                          </p>
                        </div>

{/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                              <span className="text-xs text-muted-foreground mr-2">Chú thích:</span>
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded line-through decoration-2">Lỗi sai</span>
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">Sửa thành</span>
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded line-through decoration-2">Đề xuất</span>
                              <span className="text-xs px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded font-medium">Gợi ý</span>
                            </div>

                        {/* Essay with Inline Corrections */}
                        <div className="p-5 bg-card rounded-xl border border-border/50 shadow-sm">
                          <div className="text-base leading-loose whitespace-pre-line text-foreground">
                            {renderCorrectedEssay()}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Tổng số lỗi: <span className="font-semibold text-foreground">{result.inlineCorrections.length}</span>
                          </span>
                          <span className="text-green-600">
                            Đã chấp nhận: <span className="font-semibold">{acceptedCorrections.size}</span>
                          </span>
                          <span className="text-red-600">
                            Đã từ chối: <span className="font-semibold">{rejectedCorrections.size}</span>
                          </span>
                        </div>
                      </div>

                      {/* Right Column - Detail Panel */}
                      <div className="w-full lg:w-96 p-6 bg-muted/10">
                        {selectedCorrection ? (
                          <div className="sticky top-4">
                            {(() => {
                              const isSuggestion = selectedCorrection.type === "suggestion"
                              const typeInfo = errorTypeLabels[selectedCorrection.type]
                              return (
                                <>
                                  {/* Panel Header */}
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-foreground">
                                      {isSuggestion ? "Chi tiết đề xuất" : "Chi tiết lỗi"}
                                    </h3>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => setSelectedCorrection(null)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  {/* Detail Card */}
                                  <div className="bg-card rounded-xl border border-border/50 shadow-lg overflow-hidden">
                                    {/* Error Type Badge */}
                                    <div className={`p-4 border-b border-border/30 ${isSuggestion ? "bg-gradient-to-r from-blue-50 to-transparent" : "bg-gradient-to-r from-muted/50 to-transparent"}`}>
                                      <Badge className={`${typeInfo.bgColor} ${typeInfo.color} border-0`}>
                                        {typeInfo.label}
                                      </Badge>
                                      {isSuggestion && (
                                        <p className="text-xs text-blue-600 mt-2">
                                          Cấu trúc hiện tại đúng ngữ pháp. Đây chỉ là gợi ý về phong cách.
                                        </p>
                                      )}
                                    </div>

                                    <div className="p-4 space-y-4">
                                      {/* Context */}
                                      <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                                          Ngữ cảnh
                                        </label>
                                        <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg italic">
                                          "...{selectedCorrection.context}..."
                                        </p>
                                      </div>

                                      {/* Wrong/Original */}
                                      <div>
                                        <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${isSuggestion ? "text-blue-600" : "text-red-600"}`}>
                                          {isSuggestion ? "Cách viết hiện tại" : "Lỗi gốc"}
                                        </label>
                                        <div className={`px-4 py-3 rounded-lg ${isSuggestion ? "bg-blue-50 border border-blue-200" : "bg-red-50 border border-red-200"}`}>
                                          <span className={`font-medium text-lg ${isSuggestion ? "text-blue-700" : "text-red-700 line-through decoration-2"}`}>
                                            {selectedCorrection.wrong}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Correct/Suggested */}
                                      <div>
                                        <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${isSuggestion ? "text-blue-600" : "text-green-600"}`}>
                                          {isSuggestion ? "Đề xuất gọn hơn" : "Sửa thành"}
                                        </label>
                                        <div className={`px-4 py-3 rounded-lg ${isSuggestion ? "bg-blue-50 border border-blue-200" : "bg-green-50 border border-green-200"}`}>
                                          <span className={`font-medium text-lg ${isSuggestion ? "text-blue-700" : "text-green-700"}`}>
                                            {selectedCorrection.correct}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Explanation */}
                                      <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                                          Giải thích
                                        </label>
                                        <p className={`text-sm text-foreground leading-relaxed p-3 rounded-lg border-l-4 ${isSuggestion ? "bg-blue-50 border-blue-300" : "bg-primary/5 border-primary/30"}`}>
                                          {selectedCorrection.explanation}
                                        </p>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex gap-2 pt-2">
                                        <Button
                                          size="sm"
                                          variant={acceptedCorrections.has(selectedCorrection.id) ? "default" : "outline"}
                                          className={`flex-1 ${
                                            acceptedCorrections.has(selectedCorrection.id) 
                                              ? isSuggestion ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700" 
                                              : isSuggestion ? "border-blue-300 text-blue-700 hover:bg-blue-50" : "border-green-300 text-green-700 hover:bg-green-50"
                                          }`}
                                          onClick={() => handleAcceptCorrection(selectedCorrection.id)}
                                        >
                                          <Check className="w-4 h-4 mr-1.5" />
                                          {isSuggestion ? "Áp dụng" : "Chấp nhận"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={rejectedCorrections.has(selectedCorrection.id) ? "default" : "outline"}
                                          className={`flex-1 ${rejectedCorrections.has(selectedCorrection.id) ? "bg-gray-600 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                                          onClick={() => handleRejectCorrection(selectedCorrection.id)}
                                        >
                                          <X className="w-4 h-4 mr-1.5" />
                                          {isSuggestion ? "Giữ nguyên" : "Từ chối"}
                                        </Button>
                                      </div>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full text-muted-foreground hover:text-foreground"
                                      >
                                        <HelpCircle className="w-4 h-4 mr-1.5" />
                                        Hỏi AI thêm
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="p-4 bg-muted/30 rounded-full mb-4">
                              <PenLine className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h4 className="font-semibold text-foreground mb-2">Chọn một mục để xem chi tiết</h4>
                            <p className="text-sm text-muted-foreground">
                              Nhấn vào bất kỳ phần được đánh dấu trong bài viết để xem giải thích và tùy chọn chỉnh sửa.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 3: Logic & Coherence */}
                  <TabsContent value="logic" className="p-6 mt-0 space-y-5">
                    {/* Structure */}
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-800">Cấu trúc bài viết</h4>
                      </div>
                      <p className="text-blue-700 leading-relaxed">
                        {result.logicFeedback.structure}
                      </p>
                    </div>

                    {/* Coherence */}
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-800">Tính mạch lạc</h4>
                      </div>
                      <p className="text-purple-700 leading-relaxed">
                        {result.logicFeedback.coherence}
                      </p>
                    </div>

                    {/* Argumentation */}
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-5 h-5 text-teal-600" />
                        <h4 className="font-semibold text-teal-800">Lập luận</h4>
                      </div>
                      <p className="text-teal-700 leading-relaxed">
                        {result.logicFeedback.argumentation}
                      </p>
                    </div>

                    {/* Suggestions */}
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-amber-800">Gợi ý cải thiện</h4>
                      </div>
                      <ul className="space-y-2">
                        {result.logicFeedback.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2 text-amber-700">
                            <span className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                              {index + 1}
                            </span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  {/* Tab 4: Suggested Essay */}
                  <TabsContent value="suggested" className="p-6 mt-0">
                    {/* Header Note */}
                    <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Lightbulb className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Bài viết mẫu tham khảo</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Đây là phiên bản đã được chỉnh sửa và cải thiện dựa trên bài viết của học viên. 
                          Bài viết này chỉ mang tính chất tham khảo - học viên nên học hỏi cách diễn đạt và cấu trúc, 
                          không nên sao chép nguyên văn.
                        </p>
                      </div>
                    </div>
                    
                    {/* Essay Content - Premium Style */}
                    <div className="relative mb-6">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-sm" />
                      <div className="relative p-6 md:p-8 rounded-xl bg-card border border-border/60 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/40">
                          <PenLine className="w-5 h-5 text-primary" />
                          <span className="font-semibold text-foreground">Bài viết đề xuất</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Mẫu tham khảo
                          </Badge>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-line text-foreground leading-loose text-base">
                            {result.suggestedEssay}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={handleCopy}
                        className="flex-1 sm:flex-none h-11 px-6 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            <span className="text-green-600">Đã sao chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Sao chép bài viết
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDownload}
                        className="flex-1 sm:flex-none h-11 px-6 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Tải xuống (.txt)
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Hệ thống sử dụng AI để phân tích và nhận xét. 
            Kết quả chỉ mang tính chất tham khảo và có thể khác với đánh giá thực tế của kỳ thi TOPIK.
          </p>
        </footer>
      </div>
    </div>
  )
}

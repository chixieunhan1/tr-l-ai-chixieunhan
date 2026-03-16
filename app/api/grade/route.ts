import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { questionType, topic, essay } = await request.json()
    if (!essay || !questionType) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 })
    }
    const isQ53 = questionType === "53"
    const system = isQ53
      ? `Chấm bài TOPIK II câu 53. Chỉ trả về JSON, không có text khác. JSON: {"questionType":"53","scoreBreakdown":{"type":"53","content":0,"vocabGrammar":0,"structureExpression":0,"total":0},"generalFeedback":{"overview":"","strengths":[],"weaknesses":[],"teacherComment":""},"inlineCorrections":[{"id":"","wrong":"","correct":"","type":"","explanation":"","context":""}],"logicFeedback":{"structure":"","coherence":"","argumentation":"","suggestions":[]},"originalEssay":"","suggestedEssay":""}. Điểm: content tối đa 10, vocabGrammar tối đa 10, structureExpression tối đa 10, total tối đa 30. Tối đa 8 lỗi. Tất cả nhận xét bằng tiếng Việt.`
      : `Chấm bài TOPIK II câu 54. Chỉ trả về JSON, không có text khác. JSON: {"questionType":"54","scoreBreakdown":{"type":"54","content":0,"logicCoherence":0,"vocabulary":0,"grammar":0,"total":0},"generalFeedback":{"overview":"","strengths":[],"weaknesses":[],"teacherComment":""},"inlineCorrections":[{"id":"","wrong":"","correct":"","type":"","explanation":"","context":""}],"logicFeedback":{"structure":"","coherence":"","argumentation":"","suggestions":[]},"originalEssay":"","suggestedEssay":""}. Điểm: content tối đa 15, logicCoherence tối đa 15, vocabulary tối đa 10, grammar tối đa 10, total tối đa 50. Tối đa 8 lỗi. Tất cả nhận xét bằng tiếng Việt.`

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system,
      messages: [{
        role: "user",
        content: "Chủ đề: " + (topic || "không có") + "\n\nBài viết:\n" + essay + "\n\nTrả về JSON. Trường wrong phải là chuỗi CHÍNH XÁC có trong bài viết."
      }],
    })

    const raw = msg.content[0].type === "text" ? msg.content[0].text : ""
    const s = raw.indexOf("{")
    const e = raw.lastIndexOf("}")
    if (s === -1 || e === -1) {
      return NextResponse.json({ error: "AI trả về không hợp lệ. Thử lại." }, { status: 500 })
    }

    const result = JSON.parse(raw.substring(s, e + 1))

    if (!result.originalEssay) result.originalEssay = essay

    if (!Array.isArray(result.inlineCorrections)) {
      result.inlineCorrections = []
    } else {
      result.inlineCorrections = result.inlineCorrections
        .map((c: any, i: number) => {
          if (!c?.wrong) return null
          const pos = essay.indexOf(c.wrong)
          if (pos === -1) return null
          return { ...c, id: String(i + 1), position: pos }
        })
        .filter(Boolean)
        .filter((c: any, i: number, arr: any[]) =>
          arr.findIndex((x: any) => x.position === c.position) === i
        )
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Đã có lỗi. Thử lại." }, { status: 500 })
  }
}

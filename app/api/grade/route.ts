import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { questionType, topic, essay } = await request.json()

    if (!essay || !questionType) {
      return NextResponse.json({ error: "Thiếu thông tin bài viết" }, { status: 400 })
    }

    const isQ53 = questionType === "53"

    const systemPrompt = isQ53
      ? `Bạn là giáo viên chấm bài TOPIK II. Trả về JSON hợp lệ duy nhất, không có text khác. JSON gồm: questionType("53"), scoreBreakdown(type:"53", content:0-10, vocabGrammar:0-10, structureExpression:0-10, total:0-30), generalFeedback(overview, strengths:[], weaknesses:[], teacherComment), inlineCorrections(id,position,wrong,correct,type,explanation,context), logicFeedback(structure,coherence,argumentation,suggestions:[]), originalEssay, suggestedEssay. Tối đa 8 lỗi inline. Nhận xét bằng tiếng Việt.`
      : `Bạn là giáo viên chấm bài TOPIK II. Trả về JSON hợp lệ duy nhất, không có text khác. JSON gồm: questionType("54"), scoreBreakdown(type:"54", content:0-15, logicCoherence:0-15, vocabulary:0-10, grammar:0-10, total:0-50), generalFeedback(overview, strengths:[], weaknesses:[], teacherComment), inlineCorrections(id,position,wrong,correct,type,explanation,context), logicFeedback(structure,coherence,argumentation,suggestions:[]), originalEssay, suggestedEssay. Tối đa 8 lỗi inline. Nhận xét bằng tiếng Việt.`

    const userMessage = "Chủ đề: " + (topic || "không có") + "\n\nBài viết câu " + questionType + ":\n" + essay + "\n\nTrả về JSON."

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })

    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    let gradingResult
    let cleaned = responseText

    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1)
    }

    try {
      gradingResult = JSON.parse(cleaned)
    } catch (e) {
      console.error("Parse error:", e)
      console.error("Raw:", responseText.substring(0, 300))
      return NextResponse.json(
        { error: "AI trả về định dạng không hợp lệ. Vui lòng thử lại." },
        { status: 500 }
      )
    }

    if (!gradingResult.originalEssay) {
      gradingResult.originalEssay = essay
    }
    if (!Array.isArray(gradingResult.inlineCorrections)) {
      gradingResult.inlineCorrections = []
    }

    return NextResponse.json(gradingResult)

  } catch (error) {
    console.error("Grading error:", error)
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi chấm bài. Vui lòng thử lại." },
      { status: 500 }
    )
  }
}

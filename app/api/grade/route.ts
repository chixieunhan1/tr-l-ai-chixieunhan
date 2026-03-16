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
      ? `Bạn là giáo viên chấm bài TOPIK II. Trả về JSON hợp lệ duy nhất, không có text khác ngoài JSON. JSON gồm: questionType("53"), scoreBreakdown(type:"53", content:0-10, vocabGrammar:0-10, structureExpression:0-10, total:0-30), generalFeedback(overview, strengths:[], weaknesses:[], teacherComment), inlineCorrections(id,wrong,correct,type,explanation,context), logicFeedback(structure,coherence,argumentation,suggestions:[]), originalEssay, suggestedEssay. Tối đa 8 lỗi inline. Tất cả nhận xét PHẢI bằng tiếng Việt. KHÔNG dùng tiếng Hàn trong các trường nhận xét.`
      : `Bạn là giáo viên chấm bài TOPIK II. Trả về JSON hợp lệ duy nhất, không có text khác ngoài JSON. JSON gồm: questionType("54"), scoreBreakdown(type:"54", content:0-15, logicCoherence:0-15, vocabulary:0-10, grammar:0-10, total:0-50), generalFeedback(overview, strengths:[], weaknesses:[], teacherComment), inlineCorrections(id,wrong,correct,type,explanation,context), logicFeedback(structure,coherence,argumentation,suggestions:[]), originalEssay, suggestedEssay. Tối đa 8 lỗi inline. Tất cả nhận xét PHẢI bằng tiếng Việt. KHÔNG dùng tiếng Hàn trong các trường nhận xét.`

    const userMessage = "Chủ đề: " + (topic || "không có") + "\n\nBài viết câu " + questionType + ":\n" + essay + "\n\nTrả về JSON. Lưu ý: trường 'wrong' phải là chuỗi ký tự CHÍNH XÁC xuất hiện trong bài viết trên."

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })

    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    let gradingResult
    const start = responseText.indexOf("{")
    const end = responseText.lastIndexOf("}")

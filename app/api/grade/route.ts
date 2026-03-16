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

    const scoreSchema = isQ53
      ? `"scoreBreakdown": { "type": "53", "content": 0-10, "vocabGrammar": 0-10, "structureExpression": 0-10, "total": 0-30 }`
      : `"scoreBreakdown": { "type": "54", "content": 0-15, "logicCoherence": 0-15, "vocabulary": 0-10, "grammar": 0-10, "total": 0-50 }`

    const systemPrompt = `Bạn là giáo viên chuyên gia chấm bài thi TOPIK II phần viết. Trả về JSON hợp lệ, không có text nào khác ngoài JSON.

Schema JSON:
{
  "questionType": "${questionType}",
  ${scoreSchema},
  "generalFeedback": {
    "overview": "string",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "teacherComment": "string"
  },
  "inlineCorrections": [
    {
      "id": "string",
      "position": number,
      "wrong": "string",
      "correct": "string",
      "type": "vocabulary|grammar|particle|spacing|expression|suggestion",
      "explanation": "string",
      "context": "string"
    }
  ],
  "logicFeedback": {
    "structure": "string",
    "coherence": "string",
    "argumentation": "string",
    "suggestions": ["string"]
  },
  "originalEssay": "bài viết gốc của học viên",
  "suggestedEssay": "string"
}

Tiêu chí chấm điểm:
${isQ53
  ? "Câu 53 (30đ): Nội dung 내용 (10đ), Từ vựng Ngữ pháp 어휘문법 (10đ), Bố cục Diễn đạt 구성표현 (10đ)"
  : "Câu 54 (50đ): Nội dung 내용 (15đ), Lập luận Mạch lạc 구성논리 (15đ), Từ vựng 어휘 (10đ), Ngữ pháp 문법 (10đ)"}

Quy tắc inlineCorrections:
- position = vị trí byte chính xác của "wrong" trong bài gốc (đếm từ 0)
- wrong = chuỗi ký tự CHÍNH XÁC xuất hiện trong bài viết
- Tối đa 8 lỗi quan trọng nhất
- originalEssay phải là bài viết gốc không thay đổi
- Tất cả nhận xét bằng tiếng Việt`

    const userMessage = `Chủ đề: ${topic || "không có"}

Bài viết câu ${questionType}:
${essay}

Trả về JSON.`

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })

    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    let gradingResult

    try {
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      gradingResult = JSON.parse(cleaned)
    } catch {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          gradingResult = JSON.parse(jsonMatch[0])
        }
      } catch {
        console.error("Raw response:", responseText.substring(0, 500))
        return NextResponse.json(
          { error: "AI trả về định dạng không hợp lệ. Vui lòng thử lại." },
          { status: 500 }
        )
      }
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

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

    const systemPrompt = `Bạn là giáo viên chuyên gia chấm bài thi TOPIK II phần viết (쓰기), có kinh nghiệm nhiều năm.
Bạn sẽ phân tích và chấm điểm bài viết tiếng Hàn theo tiêu chí chính thức của TOPIK.

QUAN TRỌNG: Bạn phải trả về JSON hợp lệ, KHÔNG có markdown backtick, KHÔNG có text ngoài JSON.

Cấu trúc JSON cần trả về:
${isQ53 ? `{
  "questionType": "53",
  "scoreBreakdown": {
    "type": "53",
    "content": <số từ 0-10>,
    "vocabGrammar": <số từ 0-10>,
    "structureExpression": <số từ 0-10>,
    "total": <tổng 3 mục trên, max 30>
  },
  "generalFeedback": {
    "overview": "<nhận xét tổng quan 2-3 câu bằng tiếng Việt>",
    "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>", "<điểm mạnh 3>"],
    "weaknesses": ["<điểm yếu 1>", "<điểm yếu 2>"],
    "teacherComment": "<lời nhận xét của giáo viên, thân thiện, bằng tiếng Việt, 3-4 câu>"
  },
  "inlineCorrections": [
    {
      "id": "1",
      "position": <vị trí ký tự trong bài gốc, số nguyên>,
      "wrong": "<đoạn sai trong bài>,
      "correct": "<sửa thành>",
      "type": "<vocabulary|grammar|particle|spacing|expression|suggestion>",
      "explanation": "<giải thích bằng tiếng Việt, rõ ràng>",
      "context": "<câu hoặc đoạn xung quanh lỗi>"
    }
  ],
  "logicFeedback": {
    "structure": "<phân tích cấu trúc bài viết bằng tiếng Việt>",
    "coherence": "<tính mạch lạc>",
    "argumentation": "<lập luận>",
    "suggestions": ["<gợi ý 1>", "<gợi ý 2>"]
  },
  "suggestedEssay": "<bài viết đề xuất đã sửa hoàn chỉnh>"
}` : `{
  "questionType": "54",
  "scoreBreakdown": {
    "type": "54",
    "content": <số từ 0-15>,
    "logicCoherence": <số từ 0-15>,
    "vocabulary": <số từ 0-10>,
    "grammar": <số từ 0-10>,
    "total": <tổng 4 mục trên, max 50>
  },
  "generalFeedback": {
    "overview": "<nhận xét tổng quan 2-3 câu bằng tiếng Việt>",
    "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>", "<điểm mạnh 3>"],
    "weaknesses": ["<điểm yếu 1>", "<điểm yếu 2>", "<điểm yếu 3>"],
    "teacherComment": "<lời nhận xét của giáo viên, thân thiện, bằng tiếng Việt, 3-4 câu>"
  },
  "inlineCorrections": [
    {
      "id": "1",
      "position": <vị trí ký tự trong bài gốc, số nguyên>,
      "wrong": "<đoạn sai trong bài>",
      "correct": "<sửa thành>",
      "type": "<vocabulary|grammar|particle|spacing|expression|suggestion>",
      "explanation": "<giải thích bằng tiếng Việt, rõ ràng>",
      "context": "<câu hoặc đoạn xung quanh lỗi>"
    }
  ],
  "logicFeedback": {
    "structure": "<phân tích cấu trúc bài viết bằng tiếng Việt>",
    "coherence": "<tính mạch lạc>",
    "argumentation": "<lập luận>",
    "suggestions": ["<gợi ý 1>", "<gợi ý 2>", "<gợi ý 3>"]
  },
  "suggestedEssay": "<bài viết đề xuất đã sửa hoàn chỉnh>"
}`}

Tiêu chí chấm điểm TOPIK:
${isQ53 ? `- Câu 53 (30 điểm): Nội dung 내용 (10đ), Từ vựng & Ngữ pháp 어휘·문법 (10đ), Bố cục & Diễn đạt 구성·표현 (10đ)` 
: `- Câu 54 (50 điểm): Nội dung 내용 (15đ), Lập luận & Mạch lạc 구성·논리 (15đ), Từ vựng 어휘 (10đ), Ngữ pháp 문법 (10đ)`}

Lưu ý khi tìm lỗi inline:
- Chỉ đánh dấu lỗi thực sự tồn tại trong bài
- "position" phải là vị trí chính xác của chuỗi "wrong" trong bài viết gốc (đếm từ 0)
- "wrong" phải là chuỗi ký tự CHÍNH XÁC có trong bài viết
- Tối đa 10 lỗi, ưu tiên lỗi quan trọng nhất
- Loại lỗi: vocabulary=từ vựng, grammar=ngữ pháp, particle=trợ từ, spacing=띄어쓰기, expression=diễn đạt tự nhiên, suggestion=đề xuất cải thiện (không phải lỗi)`

    const userMessage = `Chủ đề bài viết: ${topic || "(không có chủ đề cụ thể)"}

Bài viết câu ${questionType} của học viên:
${essay}

Hãy chấm điểm và phân tích chi tiết bài viết này theo định dạng JSON đã quy định.`

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: "user", content: userMessage }
      ],
    })

    const responseText = message.content[0].type === "text" ? message.content[0].text : ""
    
    // Clean and parse JSON
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    const gradingResult = JSON.parse(cleanedResponse)

    return NextResponse.json(gradingResult)

  } catch (error) {
    console.error("Grading error:", error)
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Lỗi phân tích kết quả AI. Vui lòng thử lại." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi chấm bài. Vui lòng thử lại." },
      { status: 500 }
    )
  }
}

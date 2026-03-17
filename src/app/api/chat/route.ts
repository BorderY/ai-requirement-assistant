import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.PACKYCODE_API_KEY,
  baseURL: process.env.PACKYCODE_BASE_URL, // 关键：改成第三方网关
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = String(body.input ?? "").trim();

    if (!input) {
      return Response.json({ error: "input is required" }, { status: 400 });
    }

    const response = await client.responses.create({
      model: process.env.PACKYCODE_MODEL || "gpt-5-mini",
      input,
      store: false,
    });

    return Response.json({ text: response.output_text, responseId: response.id });
  } catch (error) {
    console.error("[/api/chat] error:", error);
    return Response.json({ error: "model call failed" }, { status: 500 });
  }
}

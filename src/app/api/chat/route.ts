import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

const client = apiKey
  ? new OpenAI({
      apiKey,
    })
  : null;

type ChatRequestBody = {
  input?: unknown;
};

export async function POST(request: Request) {
  try {
    if (!client) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing on the server" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as ChatRequestBody;
    const input = typeof body.input === "string" ? body.input.trim() : "";

    if (!input) {
      return Response.json({ error: "input is required" }, { status: 400 });
    }

    console.log("[/api/chat] request input:", input);

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input,
      store: false,
    });

    console.log("[/api/chat] response id:", response.id);
    console.log("[/api/chat] output text:", response.output_text);

    return Response.json({
      text: response.output_text,
      responseId: response.id,
    });
  } catch (error) {
    console.error("[/api/chat] error:", error);

    return Response.json({ error: "model call failed" }, { status: 500 });
  }
}

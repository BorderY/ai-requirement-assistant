import OpenAI from "openai";

const apiKey = process.env.PACKYCODE_API_KEY;
const baseURL = process.env.PACKYCODE_BASE_URL;
const model = process.env.PACKYCODE_MODEL || "gpt-5.4";
const timeout = Number(process.env.PACKYCODE_TIMEOUT_MS || 60000);

const client = new OpenAI({
  apiKey,
  baseURL,
  timeout,
  maxRetries: 0,
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Request timed out.") {
      return "Request timed out. Check proxy/network for Node.js runtime.";
    }
    return error.message;
  }
  return "unknown error";
}

async function callModel(input: string) {
  const chat = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: input }],
  });

  return {
    text: chat.choices[0]?.message?.content ?? "",
    responseId: chat.id,
  };
}

export async function POST(request: Request) {
  try {
    if (!apiKey) {
      return Response.json({ error: "PACKYCODE_API_KEY is missing" }, { status: 500 });
    }

    const body = await request.json();
    const input = String(body.input ?? "").trim();

    if (!input) {
      return Response.json({ error: "input is required" }, { status: 400 });
    }

    const result = await callModel(input);
    return Response.json(result);
  } catch (error) {
    console.error("[/api/chat] error:", error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

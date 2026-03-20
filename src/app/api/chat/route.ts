import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const apiKey = process.env.PACKYCODE_API_KEY;
const baseURL = process.env.PACKYCODE_BASE_URL;
const model = process.env.PACKYCODE_MODEL || "gpt-5.4";

export const maxDuration = 30;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Request timed out.") {
      return "Request timed out. Check proxy/network for Node.js runtime.";
    }

    return error.message;
  }

  return "unknown error";
}

function createErrorAwareTextResponse(result: ReturnType<typeof streamText>) {
  const textStream = new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            controller.enqueue(part.text);
            continue;
          }

          if (part.type === "error") {
            throw new Error(getErrorMessage(part.error));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(textStream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body.prompt ?? "").trim();

    if (!apiKey) {
      return Response.json({ error: "PACKYCODE_API_KEY is missing" }, { status: 500 });
    }

    if (!baseURL) {
      return Response.json({ error: "PACKYCODE_BASE_URL is missing" }, { status: 500 });
    }

    if (!prompt) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const packycode = createOpenAICompatible({
      name: "packycode",
      apiKey,
      baseURL,
    });

    const result = streamText({
      model: packycode.chatModel(model),
      prompt,
      onError(event) {
        console.error("[/api/chat] stream error:", event.error);
      },
      onFinish() {
        // console.log("[/api/chat] finish");
        // console.log("[/api/chat] prompt:", prompt);
      },
    });

    return createErrorAwareTextResponse(result);
  } catch (error) {
    console.error("[/api/chat] error:", error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

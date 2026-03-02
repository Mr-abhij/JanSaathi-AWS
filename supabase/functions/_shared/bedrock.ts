// Shared Amazon Bedrock helper for all edge functions
// Uses AWS Signature V4 to call Amazon Bedrock's Converse API

const encoder = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(encoder.encode("AWS4" + key), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export interface BedrockMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BedrockOptions {
  messages: BedrockMessage[];
  systemPrompt: string;
  modelId?: string;
  maxTokens?: number;
  stream?: boolean;
}

// Models that support system prompts in the Converse API
const SYSTEM_PROMPT_MODELS = [
  "anthropic.", "us.anthropic.", "meta.", "us.meta.",
  "cohere.command-r", "mistral.", "us.mistral.",
  "amazon.nova",
];

function supportsSystemPrompt(modelId: string): boolean {
  return SYSTEM_PROMPT_MODELS.some(prefix => modelId.startsWith(prefix));
}

export async function callBedrock(options: BedrockOptions): Promise<Response> {
  const {
    messages,
    systemPrompt,
    modelId = "amazon.nova-micro-v1:0",
    maxTokens = 2048,
    stream = false,
  } = options;

  const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID")!;
  const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
  const region = Deno.env.get("AWS_REGION") || "us-east-1";
  const service = "bedrock";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);

  const apiPath = stream
    ? `/model/${modelId}/converse-stream`
    : `/model/${modelId}/converse`;

  const host = `bedrock-runtime.${region}.amazonaws.com`;
  const endpoint = `https://${host}${apiPath}`;

  // For SigV4, canonical URI must be URI-encoded (single encoding)
  const canonicalUri = apiPath.split("/").map(segment => encodeURIComponent(segment)).join("/");

  // For models that don't support system prompts (like Amazon Titan),
  // prepend the system prompt as the first user message
  const useSystemPrompt = supportsSystemPrompt(modelId);

  // Ensure messages alternate roles (merge consecutive same-role messages)
  function ensureAlternating(msgs: BedrockMessage[]): BedrockMessage[] {
    const result: BedrockMessage[] = [];
    for (const m of msgs) {
      const last = result[result.length - 1];
      if (last && last.role === m.role) {
        last.content += "\n" + m.content;
      } else {
        result.push({ ...m });
      }
    }
    // Bedrock requires first message to be "user"
    if (result.length > 0 && result[0].role !== "user") {
      result.unshift({ role: "user", content: "Hello" });
    }
    return result;
  }

  let finalMessages: BedrockMessage[];
  if (useSystemPrompt) {
    finalMessages = ensureAlternating(messages);
  } else {
    finalMessages = ensureAlternating([
      { role: "user", content: `[System Instructions]\n${systemPrompt}\n\n[End System Instructions]` },
      { role: "assistant", content: "Understood. I will follow these instructions." },
      ...messages,
    ]);
  }

  const bedrockMessages = finalMessages.map(m => ({
    role: m.role,
    content: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    messages: bedrockMessages,
    inferenceConfig: { maxTokens, temperature: 0.7 },
  };

  if (useSystemPrompt) {
    body.system = [{ text: systemPrompt }];
  }

  const bodyStr = JSON.stringify(body);

  const payloadHash = await sha256(bodyStr);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = `POST\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signatureBuffer = await hmac(signingKey, stringToSign);
  const signature = [...new Uint8Array(signatureBuffer)].map(b => b.toString(16).padStart(2, "0")).join("");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Amz-Date": amzDate,
      Authorization: authHeader,
    },
    body: bodyStr,
  });
}

// Non-streaming helper that returns the text response
export async function callBedrockText(options: BedrockOptions): Promise<string> {
  const resp = await callBedrock({ ...options, stream: false });
  if (!resp.ok) {
    const err = await resp.text();
    console.error("Bedrock error:", resp.status, err);
    throw new Error(`Bedrock API error: ${resp.status}`);
  }
  const data = await resp.json();
  return data.output?.message?.content?.[0]?.text || "";
}

// Streaming helper that uses non-streaming Converse and emits as SSE chunks
// (Bedrock's converse-stream uses binary event stream format which is hard to parse in Deno)
export async function streamBedrockAsSSE(options: BedrockOptions): Promise<Response> {
  const text = await callBedrockText({ ...options, stream: false });

  // Split into small chunks and stream as SSE
  const words = text.split(/(\s+)/);
  let i = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (i >= words.length) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      // Send a few words per chunk for natural feel
      const chunk = words.slice(i, i + 3).join("");
      i += 3;
      const sseData = JSON.stringify({
        choices: [{ delta: { content: chunk } }],
      });
      controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

export const runtime = "edge";

function systemPrompt(name: string, userName: string, tone: string) {
  const you = userName ? userName : "love";
  return `You are ${name}, a warm, respectful, supportive AI companion.
- Tone: ${tone}, attentive, affectionate yet appropriate. Avoid explicit content.
- Goals: listen deeply, validate feelings, offer gentle encouragement, ask thoughtful questions.
- Boundaries: no sexual or explicit content; keep conversation caring and safe.
- Style: brief paragraphs, natural, emoji sparingly (like ??, ??) only when it helps.
Always address the user by name when known (${you}).`;
}

async function streamFromOpenAI(messages: Array<{ role: string; content: string }>, key: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages
    })
  });

  if (!res.ok || !res.body) {
    throw new Error(`OpenAI error: ${res.status}`);
  }

  const encoder = new TextEncoder();
  const reader = res.body.getReader();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const text = new TextDecoder().decode(value);
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const json = trimmed.slice(5).trim();
        if (json === "[DONE]") continue;
        try {
          const payload = JSON.parse(json);
          const delta: string | undefined = payload.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        } catch {
          // ignore
        }
      }
    }
  });
}

function fallbackStream(userText: string, name: string, userName: string, tone: string) {
  const encoder = new TextEncoder();
  const templates = [
    `${userName || "Hey"}, I'm here for you. It sounds important. What feels most present right now?`,
    `Thank you for sharing that${userName ? ", " + userName : ""}. I'm listening. What would feel supportive in this moment?`,
    `I hear you. Would you like a gentle nudge forward, or just a caring ear today?`
  ];
  const pick = templates[(userText.length + tone.length) % templates.length];
  const content = `${pick}`;

  let i = 0;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const id = setInterval(() => {
        if (i >= content.length) {
          clearInterval(id);
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(content.slice(i, i + 8)));
        i += 8;
      }, 20);
    }
  });
}

export async function POST(req: Request) {
  try {
    const { messages, personaName, userName, tone } = await req.json();
    const name = typeof personaName === "string" && personaName.trim() ? personaName.trim() : "Luna";
    const uName = typeof userName === "string" ? userName.trim() : "";
    const t = typeof tone === "string" && tone ? tone : "gentle";

    const sys = { role: "system", content: systemPrompt(name, uName, t) };
    const all = [sys, ...(Array.isArray(messages) ? messages : [])];

    const key = process.env.OPENAI_API_KEY;
    const lastUser = (all as any[]).reverse().find((m) => m.role === "user");

    const stream = key
      ? await streamFromOpenAI(all as any, key)
      : fallbackStream(lastUser?.content || "", name, uName, t);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    return new Response("Sorry, something went wrong.", { status: 500 });
  }
}

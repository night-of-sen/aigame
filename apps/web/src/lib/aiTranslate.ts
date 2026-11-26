import type { GameTranslationEntry } from "@synthplay/db";

export function isAiTranslateConfigured(): boolean {
  const key = process.env.AI_TRANSLATE_API_KEY || "";
  return Boolean(key && !key.startsWith("your_"));
}

export function getAiTranslateProvider(): "gemini" | "deepseek" | "openai" {
  const p = (process.env.AI_TRANSLATE_PROVIDER || "gemini").toLowerCase();
  if (p === "deepseek") return "deepseek";
  if (p === "openai") return "openai";
  return "gemini";
}

function parseJsonObject(raw: string): Record<string, GameTranslationEntry> | null {
  try {
    const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object") return null;
    const result: Record<string, GameTranslationEntry> = {};
    for (const loc of ["en", "zh-CN", "ja", "es"]) {
      const entry = parsed[loc];
      if (entry && typeof entry === "object" && typeof entry.title === "string" && typeof entry.tagline === "string") {
        result[loc] = {
          title: entry.title.trim().slice(0, 100),
          tagline: entry.tagline.trim().slice(0, 260),
          aiPromptNote: typeof entry.aiPromptNote === "string" ? entry.aiPromptNote.trim().slice(0, 400) : undefined
        };
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Translates a game's title, tagline, and optional AI creation story into English, Simplified Chinese,
 * Japanese, and Spanish using Gemini Flash or DeepSeek / OpenAI-compatible APIs.
 * Always fails soft (never blocks game publishing if API key is missing or provider times out).
 */
export async function translateGameMetadata(input: {
  title: string;
  tagline: string;
  aiPromptNote?: string;
}): Promise<{
  provider: string;
  translated: boolean;
  translations: Record<string, GameTranslationEntry>;
}> {
  const fallback: Record<string, GameTranslationEntry> = {
    en: { title: input.title, tagline: input.tagline, aiPromptNote: input.aiPromptNote || undefined },
    "zh-CN": { title: input.title, tagline: input.tagline, aiPromptNote: input.aiPromptNote || undefined },
    ja: { title: input.title, tagline: input.tagline, aiPromptNote: input.aiPromptNote || undefined },
    es: { title: input.title, tagline: input.tagline, aiPromptNote: input.aiPromptNote || undefined }
  };

  if (!isAiTranslateConfigured()) {
    return { provider: "none", translated: false, translations: fallback };
  }

  const provider = getAiTranslateProvider();
  const apiKey = process.env.AI_TRANSLATE_API_KEY!;
  const prompt = [
    "You are a game localization specialist for SYNTHPLAY, a global cyberpunk indie arcade platform.",
    "Translate the following game metadata into 4 locales: en, zh-CN, ja, es.",
    "Keep game titles punchy and arcade-styled; keep taglines concise and exciting.",
    "Return ONLY valid JSON with exact keys: \"en\", \"zh-CN\", \"ja\", \"es\".",
    "Each key must map to {\"title\": string, \"tagline\": string, \"aiPromptNote\": string}.",
    "",
    `Source Title: ${input.title}`,
    `Source Tagline: ${input.tagline}`,
    `Source Creation Note: ${input.aiPromptNote || ""}`
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    let rawText = "";

    if (provider === "gemini") {
      const model = process.env.AI_TRANSLATE_MODEL || "gemini-2.0-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } else {
      const endpoint =
        provider === "deepseek"
          ? "https://api.deepseek.com/chat/completions"
          : "https://api.openai.com/v1/chat/completions";
      const model =
        process.env.AI_TRANSLATE_MODEL ||
        (provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Return strictly valid JSON." },
            { role: "user", content: prompt }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        rawText = data?.choices?.[0]?.message?.content || "";
      }
    }

    const parsed = parseJsonObject(rawText);
    if (parsed) {
      return {
        provider,
        translated: true,
        translations: { ...fallback, ...parsed }
      };
    }
  } catch {
    // Fail soft: do not block game publishing on translation timeout
  } finally {
    clearTimeout(timeout);
  }

  return { provider, translated: false, translations: fallback };
}

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { clientConfig } from "@/client.config";

export type Provider = "gemini" | "anthropic";

/** Má poskytovatel z configu nastavený API klíč? (jinak běží demo režim) */
export function hasApiKey(): boolean {
  return clientConfig.ai.provider === "gemini"
    ? Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY);
}

export function envKeyName(): string {
  return clientConfig.ai.provider === "gemini" ? "GOOGLE_GENERATIVE_AI_API_KEY" : "ANTHROPIC_API_KEY";
}

/** Vrátí AI model podle `ai.provider` v client.config.ts */
export function getModel(): LanguageModel {
  const { provider, models } = clientConfig.ai;
  if (provider === "gemini") {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    return google(models.gemini);
  }
  const anthropic = createAnthropic({
    // nutné jen u klíče, který není přiřazený k workspace
    headers: process.env.ANTHROPIC_WORKSPACE_ID
      ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID }
      : undefined,
  });
  return anthropic(models.anthropic);
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clientConfig, type Locale, type ProfileId } from "@/client.config";

/* Minimální typy pro Web Speech API (nejsou ve standardních TS lib). */
type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const LANG_TAG: Record<Locale, string> = { cs: "cs-CZ", en: "en-US" };

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Odstraní markdown a emoji, aby se text dobře četl nahlas. */
export function toSpeakable(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const prefix = lang.slice(0, 2);
  const matching = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(prefix));
  // preferuj kvalitnější (neuronové / „Premium“ / Google) hlasy
  return (
    matching.find((v) => /premium|enhanced|natural|neural|google/i.test(v.name)) ??
    matching.find((v) => v.lang.replace("_", "-") === lang) ??
    matching[0]
  );
}

export function useVoice(locale: Locale, profileId: ProfileId, onFinalText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [canListen] = useState(() => getRecognitionCtor() !== null);
  const [canSpeak] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const canSpeakAny = canSpeak || clientConfig.voice.tts.engine === "gemini";
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reqRef = useRef<AbortController | null>(null);
  const finalRef = useRef("");
  const onFinalRef = useRef(onFinalText);

  useEffect(() => {
    onFinalRef.current = onFinalText;
  }, [onFinalText]);

  // načtení hlasů (Chrome je načítá asynchronně)
  useEffect(() => {
    if (!canSpeak) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
  }, [canSpeak]);

  const stopSpeaking = useCallback(() => {
    reqRef.current?.abort();
    reqRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [canSpeak]);

  /** Záložní hlas prohlížeče */
  const speakBrowser = useCallback(
    (clean: string) => {
      if (!canSpeak) {
        setSpeaking(false);
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = LANG_TAG[locale];
      const voice = pickVoice(u.lang);
      if (voice) u.voice = voice;
      u.rate = 1.03;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [canSpeak, locale],
  );

  /** Přirozený hlas (Gemini TTS přes /api/tts), při chybě hlas prohlížeče */
  const speak = useCallback(
    async (text: string) => {
      const clean = toSpeakable(text);
      if (!clean) return;
      stopSpeaking();
      if (clientConfig.voice.tts.engine !== "gemini") return speakBrowser(clean);
      setSpeaking(true);
      const ctrl = new AbortController();
      reqRef.current = ctrl;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, locale, profile: profileId }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const blob = await res.blob();
        if (ctrl.signal.aborted) return;
        const audio = new Audio(URL.createObjectURL(blob));
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(audio.src);
          if (audioRef.current === audio) audioRef.current = null;
          setSpeaking(false);
        };
        audio.onerror = () => speakBrowser(clean);
        await audio.play();
      } catch (e) {
        if ((e as Error)?.name === "AbortError" || ctrl.signal.aborted) return;
        speakBrowser(clean);
      }
    },
    [locale, profileId, speakBrowser, stopSpeaking],
  );

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    stopSpeaking();
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = LANG_TAG[locale];
    rec.interimResults = true;
    rec.continuous = false;
    finalRef.current = "";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim((finalRef.current + interimText).trim());
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      setInterim("");
      if (text) onFinalRef.current(text);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [locale, stopSpeaking]);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
  }, []);

  useEffect(
    () => () => {
      recRef.current?.abort();
      reqRef.current?.abort();
      audioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return { canListen, canSpeak: canSpeakAny, listening, interim, speaking, startListening, stopListening, speak, stopSpeaking };
}

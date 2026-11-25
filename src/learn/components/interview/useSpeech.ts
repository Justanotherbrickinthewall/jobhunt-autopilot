import { useCallback, useEffect, useRef, useState } from "react";

// SpeechRecognition is not in the TypeScript DOM lib everywhere, so this stays loose.
function getCtor(): any {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(onFinal: (text: string) => void) {
  const supported = typeof window !== "undefined" && !!getCtor();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<any>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = "en-GB";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) cb.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") setError(`Speech recognition stopped: ${e.error}.`);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(() => () => rec.current?.abort?.(), []);
  return { supported, listening, interim, error, start, stop };
}

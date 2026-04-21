import type { ParsedField } from "@pearl/shared";
import { hasAttachmentSyntax, parseField, parseFieldAsync } from "@pearl/shared";
import { useEffect, useState } from "react";

interface ParseFieldResult {
  parsed: ParsedField | null;
  isParsing: boolean;
  error?: string;
}

const EMPTY_PARSED: ParsedField = {
  prose: "",
  blocks: new Map(),
  refsInProse: [],
  broken: [],
};

export function useParseField(text: string | undefined | null): ParseFieldResult {
  const [result, setResult] = useState<ParseFieldResult>({ parsed: null, isParsing: false });

  useEffect(() => {
    if (!text || !hasAttachmentSyntax(text)) {
      setResult({ parsed: text ? { ...EMPTY_PARSED, prose: text } : null, isParsing: false });
      return;
    }

    try {
      const parsed = parseField(text);
      setResult({ parsed, isParsing: false });
    } catch (err) {
      setResult({
        parsed: null,
        isParsing: false,
        error: err instanceof Error ? err.message : "Parse failed",
      });
    }
  }, [text]);

  return result;
}

export function useParseFieldAsync(text: string | undefined | null): ParseFieldResult {
  const [result, setResult] = useState<ParseFieldResult>({ parsed: null, isParsing: false });

  useEffect(() => {
    if (!text || !hasAttachmentSyntax(text)) {
      setResult({ parsed: text ? { ...EMPTY_PARSED, prose: text } : null, isParsing: false });
      return;
    }

    let cancelled = false;
    setResult({ parsed: null, isParsing: true });

    parseFieldAsync(text)
      .then((parsed) => {
        if (!cancelled) setResult({ parsed, isParsing: false });
      })
      .catch((err) => {
        if (!cancelled)
          setResult({
            parsed: null,
            isParsing: false,
            error: err instanceof Error ? err.message : "Parse failed",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  return result;
}

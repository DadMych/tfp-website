"use client";

import { useSyncExternalStore } from "react";

const SESSION_KEY = "tfp-lab-session";
let cachedSession: string | null = null;

function readSession(): string {
  if (!cachedSession) {
    let v = window.localStorage.getItem(SESSION_KEY);
    if (!v) {
      v = crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, v);
    }
    cachedSession = v;
  }
  return cachedSession;
}

/** One UUID per browser, generated lazily. Scopes a visitor's sandbox rows. null on the server. */
export function useLabSession(): string | null {
  return useSyncExternalStore(
    () => () => {},
    readSession,
    () => null
  );
}

export function labHeaders(session: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Lab-Source": "button",
    ...(session ? { "X-Lab-Session": session } : {}),
  };
}

export class LabRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readError(res: Response): Promise<LabRequestError> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    message = body.message ?? body.error ?? message;
  } catch {
    /* no body */
  }
  return new LabRequestError(res.status, message);
}

/** JSON POST with lab headers. Throws LabRequestError on non-2xx. */
export async function labPost<T>(url: string, session: string | null, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: labHeaders(session), body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw await readError(res);
  return (await res.json()) as T;
}

export async function labGet<T>(url: string, session: string | null): Promise<T> {
  const res = await fetch(url, { headers: labHeaders(session), cache: "no-store" });
  if (!res.ok) throw await readError(res);
  return (await res.json()) as T;
}

/**
 * POST and consume a Server-Sent Events body. EventSource is GET-only, so
 * this parses the stream by hand. Resolves when the server closes it.
 */
export async function labStream(
  url: string,
  session: string | null,
  body: unknown,
  onEvent: (event: string, data: unknown) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(url, { method: "POST", headers: labHeaders(session), body: JSON.stringify(body), signal });
  if (!res.ok) throw await readError(res);
  if (!res.body) throw new LabRequestError(0, "no response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      if (dataLines.length === 0) continue;
      let data: unknown = dataLines.join("\n");
      try {
        data = JSON.parse(data as string);
      } catch {
        /* keep raw */
      }
      onEvent(event, data);
    }
  }
}

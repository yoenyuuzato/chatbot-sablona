"use client";

import { startTransition, useActionState, useState } from "react";
import { addBlockAction, saveScrapedAction, scrapeAction, updateBlockAction, type FormState } from "../../../../actions";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

/** Formulář bez automatického resetu – při chybě se rozepsaný text neztratí. */
function useNoResetSubmit(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

function Status({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-700">{state.ok}</p>;
  return null;
}

function BlockFields({ title, content, rows = 12 }: { title: string; content: string; rows?: number }) {
  const [text, setText] = useState(content);
  return (
    <>
      <div>
        <label className="label">Název bloku</label>
        <input name="title" className="input" defaultValue={title} required maxLength={200} placeholder="Otevírací doba" />
      </div>
      <div>
        <label className="label">Obsah (Markdown)</label>
        <textarea
          name="contentMd"
          className="input font-mono text-xs leading-relaxed"
          rows={rows}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          placeholder={"## Otevírací doba\n- Po–Pá: 11:00–22:00\n- So–Ne: 12:00–20:00"}
        />
        <p className="hint">{text.length.toLocaleString("cs-CZ")} znaků</p>
      </div>
    </>
  );
}

export function EditBlockForm({ id, title, content }: { id: number; title: string; content: string }) {
  const [state, action, pending] = useActionState(updateBlockAction as Action, undefined);
  const onSubmit = useNoResetSubmit(action);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <BlockFields title={title} content={content} rows={Math.min(30, Math.max(8, content.split("\n").length + 2))} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "Ukládám…" : "Uložit blok"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function AddBlockForm({ profileId }: { profileId: string }) {
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const res = await addBlockAction(prev, fd);
    if (res?.ok) setFormKey((k) => k + 1); // po přidání prázdný formulář
    return res;
  }, undefined);
  const onSubmit = useNoResetSubmit(action);
  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="profileId" value={profileId} />
      <BlockFields title="" content="" rows={8} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "Přidávám…" : "Přidat blok"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ImportFromWeb({ profileId, defaultUrl }: { profileId: string; defaultUrl: string }) {
  const [scrape, scrapeFormAction, scraping] = useActionState(scrapeAction, undefined);
  const [saved, saveAction, saving] = useActionState(saveScrapedAction as Action, undefined);
  const [savedKey, setSavedKey] = useState("");
  const onScrape = useNoResetSubmit(scrapeFormAction);
  const preview = scrape?.preview;
  const previewKey = preview ? `${preview.url}:${preview.text.length}:${preview.pages.length}` : "";
  const onSave = useNoResetSubmit((fd) => {
    setSavedKey(previewKey);
    saveAction(fd);
  });
  const isSaved = Boolean(saved?.ok) && savedKey === previewKey;

  return (
    <div className="space-y-4">
      <form onSubmit={onScrape} className="flex flex-wrap gap-2">
        <input
          name="url"
          type="url"
          aria-label="URL webu"
          className="input min-w-0 flex-1"
          defaultValue={defaultUrl}
          required
          placeholder="https://www.example.cz"
        />
        <button className="btn whitespace-nowrap" disabled={scraping}>
          {scraping ? "Stahuji… (až 1 min)" : "Načíst z webu"}
        </button>
      </form>
      <p className="hint">
        Stáhne text až 10 stránek ze stejné domény (sitemap.xml, jinak odkazy z úvodní stránky; respektuje robots.txt). Nic se
        neuloží, dokud náhled nepotvrdíte. Text před uložením projděte a smažte, co bot vědět nemá.
      </p>
      {scrape?.error && <p className="text-sm text-red-600">{scrape.error}</p>}

      {preview && !isSaved && (
        <form key={previewKey} onSubmit={onSave} className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <input type="hidden" name="profileId" value={profileId} />
          <div className="text-sm text-neutral-700">
            Načteno <strong>{preview.pages.length}</strong> stránek, {preview.text.length.toLocaleString("cs-CZ")} znaků (
            {preview.notes.join(", ")}).
          </div>
          <details className="text-xs text-neutral-600">
            <summary className="cursor-pointer">Seznam stránek</summary>
            <ul className="mt-1 list-disc pl-5">
              {preview.pages.map((p) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noreferrer" className="underline">
                    {p.title || p.url}
                  </a>{" "}
                  · {p.chars.toLocaleString("cs-CZ")} znaků
                </li>
              ))}
            </ul>
          </details>
          <BlockFields title={preview.title} content={preview.text} rows={18} />
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn" disabled={saving}>
              {saving ? "Ukládám…" : "Potvrdit a uložit jako znalost"}
            </button>
            <Status state={saved} />
          </div>
        </form>
      )}
      {isSaved && <Status state={saved} />}
    </div>
  );
}

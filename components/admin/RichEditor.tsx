"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const blockFormats = [
  ["p", "Paragraphe"],
  ["h2", "Titre 2"],
  ["h3", "Titre 3"],
  ["blockquote", "Citation"],
];

export default function RichEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  function sync() {
    onChange(ref.current?.innerHTML || "");
  }

  function command(name: string, value?: string) {
    document.execCommand(name, false, value);
    ref.current?.focus();
    sync();
  }

  function createLink() {
    const url = prompt("URL du lien");
    if (url) command("createLink", url);
  }

  function insertImage() {
    const url = prompt("URL de l'image a inserer dans le contenu");
    if (url) command("insertImage", url);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b bg-slate-50 p-2">
        <select onChange={event => command("formatBlock", event.target.value)} defaultValue="p" className="rounded-lg border bg-white px-2 py-1 text-xs font-bold">
          {blockFormats.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <ToolbarButton label="Gras" onClick={() => command("bold")} className="font-black">B</ToolbarButton>
        <ToolbarButton label="Italique" onClick={() => command("italic")} className="italic">I</ToolbarButton>
        <ToolbarButton label="Souligne" onClick={() => command("underline")} className="underline">U</ToolbarButton>
        <ToolbarButton label="Liste a puces" onClick={() => command("insertUnorderedList")}>Puces</ToolbarButton>
        <ToolbarButton label="Liste numerotee" onClick={() => command("insertOrderedList")}>1. Liste</ToolbarButton>
        <ToolbarButton label="Aligner a gauche" onClick={() => command("justifyLeft")}>Gauche</ToolbarButton>
        <ToolbarButton label="Centrer" onClick={() => command("justifyCenter")}>Centre</ToolbarButton>
        <ToolbarButton label="Aligner a droite" onClick={() => command("justifyRight")}>Droite</ToolbarButton>
        <ToolbarButton label="Lien" onClick={createLink}>Lien</ToolbarButton>
        <ToolbarButton label="Image dans le contenu" onClick={insertImage}>Image</ToolbarButton>
        <label className="editor-button cursor-pointer">
          Couleur
          <input type="color" onChange={event => command("foreColor", event.target.value)} className="ml-2 h-5 w-6 align-middle" />
        </label>
        <ToolbarButton label="Annuler" onClick={() => command("undo")}>Annuler</ToolbarButton>
        <ToolbarButton label="Retablir" onClick={() => command("redo")}>Retablir</ToolbarButton>
        <ToolbarButton label="Nettoyer le format" onClick={() => command("removeFormat")}>Nettoyer</ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className="prose prose-slate min-h-[360px] max-w-none p-5 leading-8 outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-leaf [&_blockquote]:bg-mint/40 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_h2]:mt-8 [&_h2]:text-3xl [&_h2]:font-black [&_h3]:mt-6 [&_h3]:text-2xl [&_h3]:font-black [&_img]:my-5 [&_img]:max-h-[420px] [&_img]:rounded-xl [&_img]:object-cover"
      />
      <div className="border-t bg-slate-50 px-4 py-2 text-xs text-slate-500">
        Conseil: utilisez l'image principale pour la vignette de l'article; utilisez le bouton Image seulement pour ajouter une image dans le corps du texte.
      </div>
    </div>
  );
}

function ToolbarButton({ label, onClick, className = "", children }: { label: string; onClick: () => void; className?: string; children: ReactNode }) {
  return <button type="button" title={label} onClick={onClick} className={`editor-button ${className}`}>{children}</button>;
}

"use client";
import { useEffect, useRef } from "react";

export default function RichEditor({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==value)ref.current.innerHTML=value},[value]);
  function command(name:string,value?:string){document.execCommand(name,false,value);ref.current?.focus();onChange(ref.current?.innerHTML||"")}
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-wrap gap-1 border-b bg-slate-50 p-2"><button type="button" onClick={()=>command('bold')} className="editor-button font-black">B</button><button type="button" onClick={()=>command('italic')} className="editor-button italic">I</button><button type="button" onClick={()=>command('formatBlock','h2')} className="editor-button">H2</button><button type="button" onClick={()=>command('insertUnorderedList')} className="editor-button">Liste</button><button type="button" onClick={()=>command('createLink',prompt('URL du lien')||'')} className="editor-button">Lien</button></div><div ref={ref} contentEditable suppressContentEditableWarning onInput={e=>onChange(e.currentTarget.innerHTML)} className="min-h-64 p-4 leading-7 outline-none"/></div>;
}

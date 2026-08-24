"use client";
import { useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { wbsLeafNodes } from "@/lib/ppm/wbs";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, GovernanceRole, RaciEntry, RaciType, WBSNode } from "@/lib/ppm/types";

const RACI_VALUES: RaciType[] = ["R", "A", "C", "I"];
const raciTone: Record<RaciType, string> = { R: "bg-leaf text-white", A: "bg-orange text-white", C: "bg-sky-500 text-white", I: "bg-slate-300 text-slate-700" };
const OTHER = "__other__";

export default function RaciMatrix({ projectId, roles, initial, workPackages = [], activities = [] }: {
  projectId: string; roles: GovernanceRole[]; initial: RaciEntry[]; workPackages?: WBSNode[]; activities?: Activity[];
}) {
  const { en } = usePpmLocale();
  const [entries, setEntries] = useState(initial);
  const [extraAreas, setExtraAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState("");
  const [pickedArea, setPickedArea] = useState("");
  const [message, setMessage] = useState("");
  const areas = useMemo(() => Array.from(new Set([...entries.map(entry => entry.area), ...extraAreas])), [entries, extraAreas]);
  const suggestedAreas = useMemo(() => Array.from(new Set([...wbsLeafNodes(workPackages).map(item => item.title), ...activities.map(item => item.title)])).filter(title => !areas.includes(title)), [workPackages, activities, areas]);

  async function setCell(area: string, roleId: string, value: RaciType | null) {
    setMessage("");
    const supabase = createClient();
    const existing = entries.find(entry => entry.area === area && entry.governance_role_id === roleId);
    if (!value) {
      if (existing) {
        const result = await supabase.from("ppm_raci_entries").delete().eq("id", existing.id);
        if (result.error) { setMessage(result.error.message); return; }
        setEntries(current => current.filter(entry => entry !== existing));
      }
      return;
    }
    if (existing) {
      const result = await supabase.from("ppm_raci_entries").update({ raci_type: value }).eq("id", existing.id);
      if (result.error) { setMessage(result.error.message); return; }
      setEntries(current => current.map(entry => entry === existing ? { ...entry, raci_type: value } : entry));
    } else {
      const result = await supabase.from("ppm_raci_entries").insert({ project_id: projectId, area, governance_role_id: roleId, raci_type: value }).select("*").single();
      if (result.error) { setMessage(result.error.message); return; }
      setEntries(current => [...current, result.data as RaciEntry]);
    }
  }

  function addArea() {
    setMessage("");
    const value = (pickedArea === OTHER ? newArea : pickedArea).trim();
    if (!value) { setMessage(en ? "Choose or enter an area." : "Choisissez ou saisissez une zone."); return; }
    if (areas.includes(value)) { setMessage(en ? "This area already exists." : "Cette zone existe deja."); return; }
    setExtraAreas(current => [...current, value]);
    setNewArea("");
    setPickedArea("");
  }

  return <div className="grid gap-4">
    <h2 className="text-xl font-black text-forest">{en ? "RACI Matrix" : "Matrice RACI"}</h2>
    {!roles.length ? <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "Add governance members first to build the RACI matrix." : "Ajoutez d'abord des responsables de gouvernance pour construire la matrice RACI."}</p> : <>
      <div className="flex flex-wrap items-center gap-2">
        <select value={pickedArea} onChange={event => setPickedArea(event.target.value)} className="admin-input max-w-xs">
          <option value="">{en ? "Choose a Work Package / activity..." : "Choisir un Work Package / une activite..."}</option>
          {suggestedAreas.map(title => <option key={title} value={title}>{title}</option>)}
          <option value={OTHER}>{en ? "Other (free text)" : "Autre (saisie libre)"}</option>
        </select>
        {pickedArea === OTHER && <input value={newArea} onChange={event => setNewArea(event.target.value)} placeholder={en ? "Area name..." : "Nom de la zone..."} className="admin-input max-w-xs" />}
        <button onClick={addArea} className="btn-secondary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "Add row" : "Ajouter la ligne"}</button>
      </div>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Area / activity" : "Zone / activite"}</th>{roles.map(role => <th key={role.id} className="p-4">{role.name}</th>)}</tr></thead>
          <tbody>
            {areas.map(area => <tr key={area} className="border-t">
              <td className="p-4 font-bold text-forest">{area}</td>
              {roles.map(role => {
                const current = entries.find(entry => entry.area === area && entry.governance_role_id === role.id)?.raci_type || null;
                return <td key={role.id} className="p-2 text-center">
                  <div className="flex justify-center gap-1">
                    {RACI_VALUES.map(value => <button key={value} onClick={() => setCell(area, role.id, current === value ? null : value)} className={`h-7 w-7 rounded-full text-xs font-black ${current === value ? raciTone[value] : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>{value}</button>)}
                  </div>
                </td>;
              })}
            </tr>)}
            {!areas.length && <tr><td colSpan={roles.length + 1} className="p-10 text-center text-slate-400">{en ? "No area added." : "Aucune zone ajoutee."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>}
  </div>;
}

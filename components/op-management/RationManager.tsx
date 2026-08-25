"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForOperation, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type { OpsProduct, OpsProductCategory, OpsRation } from "@/lib/ppm/types";

const categoryLabels: Record<OpsProductCategory, { fr: string; en: string }> = {
  cash: { fr: "Cash", en: "Cash" }, food: { fr: "Vivres", en: "Food" }, nfi: { fr: "NFI", en: "NFI" }, other: { fr: "Autre", en: "Other" },
};
const NEW_PRODUCT = "__new__";

export default function RationManager({ operationId, organizationId, initial, initialProducts }: {
  operationId: string; organizationId: string; initial: OpsRation[]; initialProducts: OpsProduct[];
}) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [products, setProducts] = useState(initialProducts);
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const productName = (id: string) => products.find(item => item.id === id)?.name || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    let resolvedProductId = productId;

    if (productId === NEW_PRODUCT) {
      const newName = String(form.get("new_product_name") || "").trim();
      const newCategory = String(form.get("new_product_category") || "food") as OpsProductCategory;
      const newUnit = String(form.get("new_product_unit") || "kg").trim() || "kg";
      if (!newName) { setSaving(false); setMessage(en ? "Product name is required." : "Le nom du produit est obligatoire."); return; }
      const orgCode = await getOrgCodeForOperation(supabase, operationId);
      const productResult = await withUniqueRegistryCode<OpsProduct>(
        async code => await supabase.from("ppm_ops_products").insert({ code, organization_id: organizationId, name: newName, category: newCategory, unit_of_measure: newUnit }).select("*").single(),
        () => generateRegistryCode(orgCode, "product"),
      );
      if (productResult.error) { setSaving(false); setMessage(productResult.error.message); return; }
      const createdProduct = productResult.data as OpsProduct;
      setProducts(current => [...current, createdProduct].sort((a, b) => a.name.localeCompare(b.name)));
      resolvedProductId = createdProduct.id;
    }

    if (!resolvedProductId) { setSaving(false); setMessage(en ? "Select or create a product." : "Selectionnez ou creez un produit."); return; }
    const payload = {
      operation_id: operationId,
      product_id: resolvedProductId,
      ration_per_beneficiary_per_day: Number(form.get("ration_per_beneficiary_per_day") || 0),
      unit: String(form.get("unit") || "kg").trim() || "kg",
      notes: String(form.get("notes") || "").trim() || null,
    };
    const result = await supabase.from("ppm_ops_rations").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => [...current, result.data as OpsRation]);
    setProductId("");
    (event.target as HTMLFormElement).reset();
  }

  return <div className="grid gap-4">
    <h2 className="text-xl font-black text-forest">{en ? "Ration to distribute" : "Ration a distribuer"}</h2>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Product" : "Produit"}</th><th className="p-4">{en ? "Ration / beneficiary / day" : "Ration / BNF / jour"}</th><th className="p-4">{en ? "Notes" : "Notes"}</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top"><td className="p-4"><b className="text-forest">{productName(row.product_id)}</b></td><td className="p-4">{row.ration_per_beneficiary_per_day} {row.unit}</td><td className="p-4">{row.notes || "—"}</td></tr>)}
          {!rows.length && <tr><td colSpan={3} className="p-10 text-center text-slate-400">{en ? "No ration defined yet." : "Aucune ration definie pour le moment."}</td></tr>}
        </tbody>
      </table>
    </div>

    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-2">
      <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2"><PlusIcon className="mr-1 inline h-4" />{en ? "Add a ration line" : "Ajouter une ligne de ration"}</h3>
      <label className="grid gap-2 text-sm font-bold">{en ? "Product" : "Produit"}<select value={productId} onChange={event => setProductId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{products.map(item => <option key={item.id} value={item.id}>{item.name} ({categoryLabels[item.category][locale]})</option>)}<option value={NEW_PRODUCT}>+ {en ? "New product..." : "Nouveau produit..."}</option></select></label>
      {productId === NEW_PRODUCT && <>
        <label className="grid gap-2 text-sm font-bold">{en ? "New product name" : "Nom du nouveau produit"}<input name="new_product_name" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="new_product_category" defaultValue="food" className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Unit of measure" : "Unite de mesure"}<input name="new_product_unit" defaultValue="kg" className="admin-input" /></label>
      </>}
      <label className="grid gap-2 text-sm font-bold">{en ? "Ration per beneficiary per day" : "Ration par BNF par jour"}<input name="ration_per_beneficiary_per_day" type="number" min="0" step="0.0001" required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Unit" : "Unite"}<input name="unit" defaultValue="kg" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Notes" : "Notes"}<textarea name="notes" rows={2} className="admin-input" /></label>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2"><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Add" : "Ajouter")}</button></div>
    </form>
  </div>;
}

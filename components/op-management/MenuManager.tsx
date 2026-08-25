"use client";
import { useEffect, useState, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForOperation, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type { OpsMenu, OpsMenuIngredient, OpsProduct, OpsProductCategory } from "@/lib/ppm/types";

const categoryLabels: Record<OpsProductCategory, { fr: string; en: string }> = {
  cash: { fr: "Cash", en: "Cash" }, food: { fr: "Vivres", en: "Food" }, nfi: { fr: "NFI", en: "NFI" }, other: { fr: "Autre", en: "Other" },
};
const NEW_PRODUCT = "__new__";

export default function MenuManager({ operationId, organizationId, initial, initialProducts }: {
  operationId: string; organizationId: string; initial: OpsMenu[]; initialProducts: OpsProduct[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [products, setProducts] = useState(initialProducts);
  const [creating, setCreating] = useState(false);
  const [editingIngredients, setEditingIngredients] = useState<OpsMenu | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = { operation_id: operationId, name: String(form.get("name") || "").trim(), notes: String(form.get("notes") || "").trim() || null };
    if (!payload.name) { setSaving(false); setMessage(en ? "Menu name is required." : "Le nom du menu est obligatoire."); return; }
    const result = await createClient().from("ppm_ops_menus").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => [...current, result.data as OpsMenu]);
    setCreating(false);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Menus" : "Menus"}</h2><button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New menu" : "Nouveau menu"}</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><b className="text-forest">{row.name}</b><button onClick={() => setEditingIngredients(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Manage ingredients" : "Gerer les ingredients"}</button></div>
        {row.notes && <p className="mt-2 text-sm text-slate-600">{row.notes}</p>}
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No menu registered." : "Aucun menu enregistre."}</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New menu" : "Nouveau menu"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Menu name" : "Nom du menu"}<input name="name" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Notes" : "Notes"}<textarea name="notes" rows={2} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Create" : "Creer")}</button></div>
        </div>
      </form>
    </div>}

    {editingIngredients && <MenuIngredientsPanel
      menu={editingIngredients} operationId={operationId} organizationId={organizationId}
      products={products} onProductsCreated={created => setProducts(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))}
      onClose={() => setEditingIngredients(null)}
    />}
  </div>;
}

function MenuIngredientsPanel({ menu, operationId, organizationId, products, onProductsCreated, onClose }: {
  menu: OpsMenu; operationId: string; organizationId: string; products: OpsProduct[]; onProductsCreated: (product: OpsProduct) => void; onClose: () => void;
}) {
  const { locale, en } = usePpmLocale();
  const [ingredients, setIngredients] = useState<OpsMenuIngredient[]>([]);
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const productName = (id: string) => products.find(item => item.id === id)?.name || "—";

  useEffect(() => {
    createClient().from("ppm_ops_menu_ingredients").select("*").eq("menu_id", menu.id).order("created_at")
      .then(result => setIngredients((result.data || []) as OpsMenuIngredient[]));
  }, [menu.id]);

  async function addIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    let resolvedProductId = productId;

    if (productId === NEW_PRODUCT) {
      const newName = String(form.get("new_product_name") || "").trim();
      const newCategory = String(form.get("new_product_category") || "food") as OpsProductCategory;
      const newUnit = String(form.get("new_product_unit") || "g").trim() || "g";
      if (!newName) { setSaving(false); setMessage(en ? "Product name is required." : "Le nom du produit est obligatoire."); return; }
      const orgCode = await getOrgCodeForOperation(supabase, operationId);
      const productResult = await withUniqueRegistryCode<OpsProduct>(
        async code => await supabase.from("ppm_ops_products").insert({ code, organization_id: organizationId, name: newName, category: newCategory, unit_of_measure: newUnit }).select("*").single(),
        () => generateRegistryCode(orgCode, "product"),
      );
      if (productResult.error) { setSaving(false); setMessage(productResult.error.message); return; }
      const createdProduct = productResult.data as OpsProduct;
      onProductsCreated(createdProduct);
      resolvedProductId = createdProduct.id;
    }

    if (!resolvedProductId) { setSaving(false); setMessage(en ? "Select or create a product." : "Selectionnez ou creez un produit."); return; }
    const payload = {
      menu_id: menu.id,
      product_id: resolvedProductId,
      quantity_per_child_per_day: Number(form.get("quantity_per_child_per_day") || 0),
      unit: String(form.get("unit") || "g").trim() || "g",
    };
    const result = await supabase.from("ppm_ops_menu_ingredients").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setIngredients(current => [...current, result.data as OpsMenuIngredient]);
    setProductId("");
    (event.target as HTMLFormElement).reset();
  }

  async function removeIngredient(ingredientId: string) {
    const result = await createClient().from("ppm_ops_menu_ingredients").delete().eq("id", ingredientId);
    if (!result.error) setIngredients(current => current.filter(item => item.id !== ingredientId));
  }

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
    <div className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{menu.name}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-4 grid gap-2">
        {ingredients.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm"><span>{productName(item.product_id)} — {item.quantity_per_child_per_day} {item.unit} / {en ? "child / day" : "enfant / jour"}</span><button onClick={() => removeIngredient(item.id)} aria-label={en ? "Remove" : "Retirer"}><TrashIcon className="h-4 text-red-600" /></button></div>)}
        {!ingredients.length && <p className="text-sm text-slate-400">{en ? "No ingredient yet." : "Aucun ingredient pour le moment."}</p>}
      </div>
      <form onSubmit={addIngredient} className="mt-4 grid gap-2 sm:grid-cols-2">
        <select value={productId} onChange={event => setProductId(event.target.value)} required className="admin-input"><option value="">{en ? "Select a product..." : "Selectionner un produit..."}</option>{products.map(item => <option key={item.id} value={item.id}>{item.name} ({categoryLabels[item.category][locale]})</option>)}<option value={NEW_PRODUCT}>+ {en ? "New product..." : "Nouveau produit..."}</option></select>
        {productId === NEW_PRODUCT && <>
          <input name="new_product_name" placeholder={en ? "New product name" : "Nom du nouveau produit"} className="admin-input" />
          <select name="new_product_category" defaultValue="food" className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select>
          <input name="new_product_unit" defaultValue="g" placeholder={en ? "Unit" : "Unite"} className="admin-input" />
        </>}
        <input name="quantity_per_child_per_day" type="number" min="0" step="0.0001" required placeholder={en ? "Quantity / child / day" : "Quantite / enfant / jour"} className="admin-input" />
        <input name="unit" defaultValue="g" placeholder={en ? "Unit" : "Unite"} className="admin-input" />
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="sm:col-span-2"><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Add ingredient" : "Ajouter l'ingredient")}</button></div>
      </form>
    </div>
  </div>;
}

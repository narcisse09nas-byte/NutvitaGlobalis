"use client";
import { useId, useState } from "react";
import type { KnownPerson } from "@/lib/ppm/types";

// Dynamic dropdown fed by names/emails already entered on this project (governance roles,
// project manager/sponsor, existing activity responsibles) — not a real user-account picker,
// since nothing in this app links "responsible" fields to real accounts. Typing a name that
// exactly matches a known person hands off their email in the hidden field; anyone else stays
// a free-text name with no email (won't be matched by "Mes activites" until picked again).
export default function PersonPicker({ knownPeople, nameField, emailField, defaultName, defaultEmail, label }: {
  knownPeople: KnownPerson[]; nameField: string; emailField: string; defaultName?: string; defaultEmail?: string; label: string;
}) {
  const listId = useId();
  const [name, setName] = useState(defaultName || "");
  const [email, setEmail] = useState(defaultEmail || "");

  function onNameChange(value: string) {
    setName(value);
    const match = knownPeople.find(person => person.name.toLowerCase() === value.trim().toLowerCase());
    setEmail(match?.email || "");
  }

  return <label className="grid gap-2 text-sm font-bold">
    {label}
    <input name={nameField} list={listId} value={name} onChange={event => onNameChange(event.target.value)} className="admin-input" />
    <datalist id={listId}>{knownPeople.map(person => <option key={person.email || person.name} value={person.name} />)}</datalist>
    <input type="hidden" name={emailField} value={email} />
  </label>;
}

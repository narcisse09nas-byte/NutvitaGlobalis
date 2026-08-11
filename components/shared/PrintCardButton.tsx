'use client';
export default function PrintCardButton({ label = 'Télécharger / imprimer' }: { label?: string }) { return <button onClick={()=>window.print()} className='btn-primary'>{label}</button>; }

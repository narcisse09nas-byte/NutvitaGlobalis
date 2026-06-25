'use client';

import { createClient } from '@/lib/supabase/client';

type FirestoreRecord = Record<string, any>;

type CollectionRef = {
  kind: 'collection';
  path: string;
  id?: string;
  parent?: DocumentRef | null;
};

type DocumentRef = {
  kind: 'doc';
  path: string;
  id: string;
  collectionPath: string;
  parent: CollectionRef;
};

type QueryRef = CollectionRef & {
  filters?: Array<{ field: string; op: string; value: any }>;
  order?: { field: string; direction?: 'asc' | 'desc' };
  max?: number;
  group?: boolean;
};

type SnapshotDoc = {
  id: string;
  data: () => FirestoreRecord;
  exists: () => boolean;
  ref: DocumentRef;
};

export const firestore = { mode: 'supabase', app: 'nutritrack' };
export const db = firestore;
const LEGACY_STORE_KEY = 'nutritrack-local-firestore';
let legacyMigration: Promise<void> | null = null;

export class Timestamp {
  seconds: number;
  nanoseconds: number;

  constructor(seconds: number, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now() {
    return Timestamp.fromDate(new Date());
  }

  static fromDate(date: Date) {
    return new Timestamp(
      Math.floor(date.getTime() / 1000),
      (date.getTime() % 1000) * 1000000,
    );
  }

  toDate() {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1000000));
  }

  toMillis() {
    return this.toDate().getTime();
  }

  isEqual(other: Timestamp) {
    return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
  }

  toJSON() {
    return {
      __nutritrack_type: 'timestamp',
      seconds: this.seconds,
      nanoseconds: this.nanoseconds,
    };
  }
}

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePath(parts: unknown[]) {
  return parts
    .flatMap((part) => {
      if (!part) return [];
      if (typeof part === 'object' && (part as any).mode === 'supabase') return [];
      if (typeof part === 'object' && 'path' in (part as any)) return [(part as any).path];
      return [String(part)];
    })
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}

function encode(value: any): any {
  if (value instanceof Timestamp) return value.toJSON();
  if (value instanceof Date) return Timestamp.fromDate(value).toJSON();
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, encode(item)]),
    );
  }
  return value;
}

function decode(value: any): any {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if (
      value.__nutritrack_type === 'timestamp'
      || (
        typeof value.seconds === 'number'
        && typeof value.nanoseconds === 'number'
        && Object.keys(value).every(key => ['seconds', 'nanoseconds', '__nutritrack_type'].includes(key))
      )
    ) {
      return new Timestamp(value.seconds, value.nanoseconds);
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
  }
  return value;
}

function makeDocSnapshot(ref: DocumentRef, data?: FirestoreRecord): SnapshotDoc {
  return {
    id: ref.id,
    ref,
    exists: () => data !== undefined,
    data: () => decode(data || {}),
  };
}

function valueAt(data: FirestoreRecord, field: string) {
  return field.split('.').reduce((value, key) => value?.[key], data);
}

function comparable(value: any) {
  return value instanceof Timestamp ? value.toMillis() : value;
}

function applyQuery(
  records: Array<{ id: string; data: FirestoreRecord; collectionPath: string }>,
  ref: QueryRef,
) {
  let nextRecords = records;
  for (const filter of ref.filters || []) {
    nextRecords = nextRecords.filter(record => {
      const value = comparable(valueAt(record.data, filter.field));
      const expected = comparable(filter.value);
      if (filter.op === '==') return value === expected;
      if (filter.op === '!=') return value !== expected;
      if (filter.op === 'in') return Array.isArray(expected) && expected.includes(value);
      if (filter.op === 'array-contains') return Array.isArray(value) && value.includes(expected);
      if (filter.op === '>') return value > expected;
      if (filter.op === '>=') return value >= expected;
      if (filter.op === '<') return value < expected;
      if (filter.op === '<=') return value <= expected;
      return true;
    });
  }
  if (ref.order) {
    const direction = ref.order.direction === 'desc' ? -1 : 1;
    nextRecords = [...nextRecords].sort((a, b) => {
      const aValue = comparable(valueAt(a.data, ref.order!.field));
      const bValue = comparable(valueAt(b.data, ref.order!.field));
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      return aValue > bValue ? direction : -direction;
    });
  }
  return ref.max === undefined ? nextRecords : nextRecords.slice(0, ref.max);
}

function applyDottedPatch(current: FirestoreRecord, patch: FirestoreRecord) {
  const next = structuredClone(current);
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split('.');
    let target = next;
    keys.slice(0, -1).forEach(key => {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    });
    target[keys[keys.length - 1]] = value;
  }
  return next;
}

async function putDocument(ref: DocumentRef, data: FirestoreRecord) {
  const { data: result, error } = await createClient().rpc('nutritrack_put_document', {
    p_collection_path: ref.collectionPath,
    p_document_id: ref.id,
    p_data: encode(data),
  });
  if (error) throw error;
  return result;
}

async function ensureLegacyMigration() {
  if (legacyMigration) return legacyMigration;
  legacyMigration = (async () => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(LEGACY_STORE_KEY);
    if (!raw) return;
    try {
      const store = JSON.parse(raw) as Record<string, Record<string, FirestoreRecord>>;
      for (const [collectionPath, documents] of Object.entries(store)) {
        for (const [documentId, data] of Object.entries(documents)) {
          await putDocument(doc(collectionPath, documentId), decode(data));
        }
      }
      window.localStorage.removeItem(LEGACY_STORE_KEY);
    } catch (error) {
      console.error('NutriTrack legacy data migration failed:', error);
    }
  })();
  return legacyMigration;
}

export function collection(...parts: any[]): CollectionRef {
  const path = normalizePath(parts);
  const pathParts = path.split('/').filter(Boolean);
  const id = pathParts[pathParts.length - 1];
  const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
  return {
    kind: 'collection',
    path,
    id,
    parent: parentPath ? doc(parentPath) : null,
  };
}

export function collectionGroup(_db: unknown, collectionName: string): QueryRef {
  return { kind: 'collection', path: collectionName, group: true };
}

export function doc(...parts: any[]): DocumentRef {
  if (parts.length === 1 && parts[0]?.kind === 'collection') {
    const collectionRef = parts[0] as CollectionRef;
    const id = randomId();
    return {
      kind: 'doc',
      path: `${collectionRef.path}/${id}`,
      id,
      collectionPath: collectionRef.path,
      parent: collectionRef,
    };
  }
  const path = normalizePath(parts);
  const pathParts = path.split('/').filter(Boolean);
  const id = pathParts.pop() || randomId();
  const collectionPath = pathParts.join('/');
  return {
    kind: 'doc',
    path: [...pathParts, id].join('/'),
    id,
    collectionPath,
    parent: collection(collectionPath),
  };
}

export function query(base: CollectionRef | QueryRef, ...constraints: any[]): QueryRef {
  return constraints.reduce<QueryRef>(
    (current, constraint) => ({ ...current, ...constraint(current) }),
    { ...base },
  );
}

export function where(field: string, op: string, value: any) {
  return (ref: QueryRef): QueryRef => ({
    ...ref,
    filters: [...(ref.filters || []), { field, op, value }],
  });
}

export function orderBy(field: string, direction?: 'asc' | 'desc') {
  return (ref: QueryRef): QueryRef => ({ ...ref, order: { field, direction } });
}

export function limit(max: number) {
  return (ref: QueryRef): QueryRef => ({ ...ref, max });
}

export async function getDocs(ref: CollectionRef | QueryRef) {
  await ensureLegacyMigration();
  const queryRef = ref as QueryRef;
  let request = createClient()
    .from('nutritrack_documents')
    .select('collection_path,document_id,data');
  request = queryRef.group
    ? request.like('collection_path', `%/${queryRef.path}`)
    : request.eq('collection_path', queryRef.path);
  const { data, error } = await request;
  if (error) throw error;
  const records = (data || []).map(row => ({
    id: row.document_id,
    data: decode(row.data),
    collectionPath: row.collection_path,
  }));
  const filtered = applyQuery(records, queryRef);
  const docs = filtered.map(record =>
    makeDocSnapshot(doc(record.collectionPath, record.id), record.data),
  );
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach(callback: (snapshot: SnapshotDoc) => void) {
      docs.forEach(callback);
    },
  };
}

export async function getDoc(ref: DocumentRef) {
  await ensureLegacyMigration();
  const { data, error } = await createClient()
    .from('nutritrack_documents')
    .select('data')
    .eq('collection_path', ref.collectionPath)
    .eq('document_id', ref.id)
    .maybeSingle();
  if (error) throw error;
  return makeDocSnapshot(ref, data ? decode(data.data) : undefined);
}

export async function addDoc(ref: CollectionRef, data: FirestoreRecord) {
  await ensureLegacyMigration();
  const documentRef = doc(ref);
  await putDocument(documentRef, data);
  return documentRef;
}

export async function updateDoc(ref: DocumentRef, data: FirestoreRecord) {
  await ensureLegacyMigration();
  const current = await getDoc(ref);
  const next = applyDottedPatch(current.exists() ? current.data() : {}, data);
  await putDocument(ref, next);
}

export async function setDoc(
  ref: DocumentRef,
  data: FirestoreRecord,
  options?: { merge?: boolean },
) {
  await ensureLegacyMigration();
  if (!options?.merge) {
    await putDocument(ref, data);
    return;
  }
  const current = await getDoc(ref);
  await putDocument(ref, {
    ...(current.exists() ? current.data() : {}),
    ...data,
  });
}

export async function deleteDoc(ref: DocumentRef) {
  await ensureLegacyMigration();
  const { error } = await createClient().rpc('nutritrack_delete_document', {
    p_collection_path: ref.collectionPath,
    p_document_id: ref.id,
  });
  if (error) throw error;
}

export function onSnapshot(
  ref: CollectionRef | QueryRef | DocumentRef,
  onNext: (snapshot: any) => void,
) {
  if ((ref as DocumentRef).kind === 'doc') {
    getDoc(ref as DocumentRef).then(onNext);
  } else {
    getDocs(ref as QueryRef).then(onNext);
  }
  return () => {};
}

export function writeBatch(..._args: any[]) {
  const actions: Array<() => Promise<void>> = [];
  return {
    set(ref: DocumentRef, data: FirestoreRecord, options?: { merge?: boolean }) {
      actions.push(() => setDoc(ref, data, options));
    },
    update(ref: DocumentRef, data: FirestoreRecord) {
      actions.push(() => updateDoc(ref, data));
    },
    delete(ref: DocumentRef) {
      actions.push(() => deleteDoc(ref));
    },
    async commit() {
      for (const action of actions) await action();
    },
  };
}

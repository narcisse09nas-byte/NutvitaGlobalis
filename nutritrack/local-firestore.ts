'use client';

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

const STORE_KEY = 'nutritrack-local-firestore';

export const firestore = { mode: 'local', app: 'nutritrack' };
export const db = firestore;

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
    return new Timestamp(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
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
    return { seconds: this.seconds, nanoseconds: this.nanoseconds };
  }
}

function readStore(): Record<string, Record<string, FirestoreRecord>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, Record<string, FirestoreRecord>>) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }
}

function normalizePath(parts: unknown[]) {
  return parts
    .flatMap((part) => {
      if (!part) return [];
      if (typeof part === 'object' && (part as any).mode === 'local') return [];
      if (typeof part === 'object' && 'path' in (part as any)) return [(part as any).path];
      return [String(part)];
    })
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}

function makeDocSnapshot(ref: DocumentRef, data?: FirestoreRecord): SnapshotDoc {
  return {
    id: ref.id,
    ref,
    exists: () => !!data,
    data: () => ({ ...(data || {}) }),
  };
}

function getCollectionRecords(ref: QueryRef | CollectionRef) {
  const store = readStore();
  if ((ref as QueryRef).group) {
    const collectionName = ref.path;
    return Object.entries(store)
      .filter(([path]) => path.split('/').pop() === collectionName)
      .flatMap(([path, records]) => Object.entries(records).map(([id, data]) => ({ id, data, collectionPath: path })));
  }

  return Object.entries(store[ref.path] || {}).map(([id, data]) => ({ id, data, collectionPath: ref.path }));
}

function valueAt(data: FirestoreRecord, field: string) {
  return field.split('.').reduce((value, key) => value?.[key], data);
}

function applyQuery(records: Array<{ id: string; data: FirestoreRecord; collectionPath: string }>, ref: QueryRef) {
  let nextRecords = records;
  for (const filter of ref.filters || []) {
    nextRecords = nextRecords.filter((record) => {
      const value = valueAt(record.data, filter.field);
      if (filter.op === '==') return value === filter.value;
      if (filter.op === '!=') return value !== filter.value;
      if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.includes(value);
      if (filter.op === 'array-contains') return Array.isArray(value) && value.includes(filter.value);
      if (filter.op === '>') return value > filter.value;
      if (filter.op === '>=') return value >= filter.value;
      if (filter.op === '<') return value < filter.value;
      if (filter.op === '<=') return value <= filter.value;
      return true;
    });
  }
  if (ref.order) {
    const direction = ref.order.direction === 'desc' ? -1 : 1;
    nextRecords = [...nextRecords].sort((a, b) => {
      const aValue = valueAt(a.data, ref.order!.field);
      const bValue = valueAt(b.data, ref.order!.field);
      if (aValue === bValue) return 0;
      return aValue > bValue ? direction : -direction;
    });
  }
  if (ref.max !== undefined) {
    nextRecords = nextRecords.slice(0, ref.max);
  }
  return nextRecords;
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
  const path = normalizePath(parts);
  const pathParts = path.split('/');
  const id = pathParts.pop() || `doc_${Date.now()}`;
  return {
    kind: 'doc',
    path: [...pathParts, id].join('/'),
    id,
    collectionPath: pathParts.join('/'),
    parent: collection(pathParts.join('/')),
  };
}

export function query(base: CollectionRef | QueryRef, ...constraints: any[]): QueryRef {
  return constraints.reduce<QueryRef>((current, constraint) => ({ ...current, ...constraint(current) }), { ...base });
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
  const queryRef = ref as QueryRef;
  const records = applyQuery(getCollectionRecords(queryRef), queryRef);
  return {
    docs: records.map((record) => makeDocSnapshot(doc(record.collectionPath, record.id), record.data)),
    empty: records.length === 0,
    size: records.length,
    forEach(callback: (doc: SnapshotDoc) => void) {
      this.docs.forEach(callback);
    },
  };
}

export async function getDoc(ref: DocumentRef) {
  const store = readStore();
  return makeDocSnapshot(ref, store[ref.collectionPath]?.[ref.id]);
}

export async function addDoc(ref: CollectionRef, data: FirestoreRecord) {
  const store = readStore();
  const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  store[ref.path] = store[ref.path] || {};
  store[ref.path][id] = { ...data };
  writeStore(store);
  return doc(ref.path, id);
}

export async function updateDoc(ref: DocumentRef, data: FirestoreRecord) {
  const store = readStore();
  store[ref.collectionPath] = store[ref.collectionPath] || {};
  store[ref.collectionPath][ref.id] = {
    ...(store[ref.collectionPath][ref.id] || {}),
    ...data,
  };
  writeStore(store);
}

export async function setDoc(ref: DocumentRef, data: FirestoreRecord, options?: { merge?: boolean }) {
  const store = readStore();
  store[ref.collectionPath] = store[ref.collectionPath] || {};
  store[ref.collectionPath][ref.id] = options?.merge
    ? { ...(store[ref.collectionPath][ref.id] || {}), ...data }
    : { ...data };
  writeStore(store);
}

export async function deleteDoc(ref: DocumentRef) {
  const store = readStore();
  if (store[ref.collectionPath]) {
    delete store[ref.collectionPath][ref.id];
  }
  writeStore(store);
}

export function onSnapshot(ref: CollectionRef | QueryRef | DocumentRef, onNext: (snapshot: any) => void) {
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
      for (const action of actions) {
        await action();
      }
    },
  };
}

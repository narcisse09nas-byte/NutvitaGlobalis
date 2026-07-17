const DB_NAME = "nutvita-local-media";
const STORE_NAME = "files";
const SCHEME = "indexeddb://";

type StoredMedia = {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function isLocalMediaUrl(value?: string) {
  return Boolean(value?.startsWith(SCHEME));
}

export async function saveLocalMedia(file: File): Promise<string> {
  const database = await openDatabase();
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
  const record: StoredMedia = { id, name: file.name, type: file.type, size: file.size, blob: file, createdAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return `${SCHEME}${id}`;
}

export async function resolveLocalMedia(value: string): Promise<string> {
  if (!isLocalMediaUrl(value)) return value;
  const database = await openDatabase();
  const id = value.slice(SCHEME.length);
  const record = await new Promise<StoredMedia | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredMedia | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return record ? URL.createObjectURL(record.blob) : "";
}

export async function readLocalMediaText(value: string): Promise<string> {
  if (!isLocalMediaUrl(value)) {
    const response = await fetch(value);
    if (!response.ok) throw new Error(`Unable to load HTML (${response.status})`);
    return response.text();
  }
  const database = await openDatabase();
  const id = value.slice(SCHEME.length);
  const record = await new Promise<StoredMedia | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredMedia | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  if (!record) throw new Error("Stored HTML document not found");
  return record.blob.text();
}

export async function deleteLocalMedia(value?: string) {
  if (!isLocalMediaUrl(value)) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(value!.slice(SCHEME.length));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

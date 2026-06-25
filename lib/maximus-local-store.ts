export type MaximusLocalRow = {
  id: string;
  module: string;
  title: string;
  reference: string | null;
  status: string;
  data: Record<string, unknown>;
  workflow_key?: string | null;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type MaximusLocalEvent = {
  id: string;
  source_record_id: string;
  target_record_id?: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

type MaximusLocalStore = typeof globalThis & {
  __maximusLocalRecords?: MaximusLocalRow[];
  __maximusLocalEvents?: MaximusLocalEvent[];
};

const store = globalThis as MaximusLocalStore;

export const localMaximusRecords = () => store.__maximusLocalRecords ||= [];
export const localMaximusEvents = () => store.__maximusLocalEvents ||= [];

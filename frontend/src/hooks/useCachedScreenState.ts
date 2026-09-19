import { useCallback, useRef, useState, Dispatch, SetStateAction } from "react";
import { api } from "../services/api";

// Display-only session snapshots. Existing fetches still revalidate on entry.
export function useCachedScreenState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const session = useRef(api.getSnapshotSession()).current;
  const [value, setValue] = useState<T>(() => api.getScreenSnapshot<T>(key) ?? initial);
  const current = useRef(value);
  const update = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    // A response from a previous login must not populate the next user's cache.
    if (session !== api.getSnapshotSession()) return;
    const next = typeof action === "function"
      ? (action as (previous: T) => T)(current.current) : action;
    api.setScreenSnapshot(key, next);
    if (JSON.stringify(current.current) === JSON.stringify(next)) return;
    current.current = next;
    setValue(next);
  }, [key, session]);
  return [value, update];
}

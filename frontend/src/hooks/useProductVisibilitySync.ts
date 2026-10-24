import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { api } from "../services/api";

// Poll only small status records; reload product images/details only on changes.
export function useProductVisibilitySync(adminId: string | undefined, reload: () => Promise<unknown>) {
  const focused = useIsFocused();
  const callback = useRef(reload);
  callback.current = reload;
  useEffect(() => {
    if (!focused) return;
    let stopped = false;
    let busy = false;
    let signature: string | undefined;
    const check = async () => {
      if (stopped || busy || AppState.currentState !== "active") return;
      busy = true;
      try {
        const rows = await api.getProductVisibility(adminId);
        if (stopped) return;
        const next = JSON.stringify(rows);
        if (next !== signature) {
          await callback.current();
          if (!stopped) signature = next;
        }
      } catch {
        // Retain displayed products and retry after temporary network failures.
      } finally { busy = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 30000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void check(); });
    return () => { stopped = true; clearInterval(timer); listener.remove(); };
  }, [focused, adminId]);
}
//This hook is the source of your 5-second requests. It keeps the product list in sync with what 
// the admin has made visible or hidden, without the user having to refresh manually so Admin visibility 
// changes rarely need a 5-second reaction time. 15 to 30 seconds is usually fine and cuts server load by 3 to 6x :) golu
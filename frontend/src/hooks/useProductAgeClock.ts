import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useProductAgeClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 60_000);
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") update();
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return now;
}

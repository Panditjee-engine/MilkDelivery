import { useState, useEffect, useCallback } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

// ✅ app.json ke "version" se seedha aata hai
export const APP_VERSION =
    Constants.expoConfig?.version ||
    Constants.manifest?.version ||
    "1.0.0";

// ✅ "android" ya "ios" — device khud batata hai
export const APP_PLATFORM = Platform.OS;

export interface VersionCheckResult {
    updateAvailable: boolean;
    forceUpdate: boolean;
    currentVersion: string;
    platform: "android" | "ios";
    releaseNotes?: string;
    updateUrl: string;
    releaseNotes?: string;
}

export function useVersionCheck() {
    const [versionInfo, setVersionInfo] = useState<VersionCheckResult | null>(null);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/version/check?app_version=${encodeURIComponent(APP_VERSION)}&platform=${Platform.OS}`
                );
                if (!res.ok) return;
                const data = await res.json();
                setVersionInfo({
                    updateAvailable: data.update_available,
                    forceUpdate: data.force_update,
                    currentVersion: data.current_version,
                    platform: data.platform || Platform.OS,
                    releaseNotes: data.release_notes,
                    updateUrl: data.update_url,
                });
            } catch (err) {
                // Network error — silently ignore, don't block the user
                console.log("Version check failed:", err);
            } finally {
                setChecked(true);
            }
        };

        checkVersion();
    }, []);

    useEffect(() => {
        checkVersion();
    }, [checkVersion]);

    return { versionInfo, checked, recheck: checkVersion };
}

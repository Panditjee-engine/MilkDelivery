// src/components/UpdateModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Version update popup.
// - Force update: "Update Now" button hi dikhe, dismiss nahi hoga
// - Soft update: "Update Now" + "Baad Mein" dono buttons honge
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Image,
} from "react-native";
import { VersionCheckResult } from "../services/useVersionCheck";

interface Props {
  versionInfo: VersionCheckResult;
}

export default function UpdateModal({ versionInfo }: Props) {
  const [visible, setVisible] = useState(true);

  // Force update hai toh modal close nahi hoga
  const canDismiss = !versionInfo.forceUpdate;
  const storeName = versionInfo.platform === "ios" ? "App Store" : "Play Store";

  const handleUpdate = () => {
    Linking.openURL(versionInfo.updateUrl);
  };

  const handleLater = () => {
    if (canDismiss) setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Force update pe back button se bhi close nahi hoga
      onRequestClose={() => {
        if (canDismiss) setVisible(false);
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconCircle}>
  <Image
    source={require('../../assets/images/splash-icon.png')}
    style={styles.logoImage}
    resizeMode="contain"
  />
</View>

          {/* Title */}
          <Text style={styles.title}>
            {versionInfo.forceUpdate ? "Version Update" : "New Version Available"}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {versionInfo.forceUpdate
              ? `Version ${versionInfo.currentVersion} is available on ${storeName}. Please update the app to continue using it.`
              : `Version ${versionInfo.currentVersion} is available on ${storeName}. Please update the app for a better experience.`}
          </Text>
          {versionInfo.releaseNotes ? (
            <Text style={styles.notes}>{versionInfo.releaseNotes}</Text>
          ) : null}

          {/* Buttons */}
          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>

          {canDismiss && (
            <TouchableOpacity style={styles.laterBtn} onPress={handleLater}>
              <Text style={styles.laterBtnText}>Update Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF4E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  notes: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
    marginTop: -12,
    marginBottom: 20,
  },
  updateBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  updateBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  laterBtn: {
    paddingVertical: 10,
  },
  laterBtnText: {
    color: "#888",
    fontSize: 14,
  },
  logoImage: {
  width: 70,
  height: 70,
},
});

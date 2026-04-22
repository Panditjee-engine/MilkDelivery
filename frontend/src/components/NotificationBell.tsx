import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, Modal,
  FlatList, StyleSheet, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";

interface Notif {
  id: string;
  type: "milk" | "feed" | "health";
  cow_name: string;
  cow_tag: string;
  worker_name: string;
  details: any;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG = {
  milk:   { icon: "water",   color: "#3b82f6", bg: "#eff6ff", label: "Milk recorded" },
  feed:   { icon: "leaf",    color: "#d97706", bg: "#fffbeb", label: "Feed done"      },
  health: { icon: "medkit",  color: "#dc2626", bg: "#fef2f2", label: "Health logged"  },
};

export default function NotificationBell() {
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);

  const unread = notifs.filter((n) => !n.is_read).length;

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await api.getGausevakNotifications();
      setNotifs(data ?? []);
    } catch (e) {}
    finally { setLoading(false); }
  };

  // 30 second mein auto refresh
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.markGausevakNotifRead(id);
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {}
  };

  const markAllRead = async () => {
    const unreadList = notifs.filter((n) => !n.is_read);
    await Promise.all(unreadList.map((n) => api.markGausevakNotifRead(n.id)));
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <>
      {/* Bell Button */}
      <TouchableOpacity
        style={ns.btn}
        onPress={() => { setOpen(true); fetchNotifs(); }}
      >
        <Ionicons name="notifications-outline" size={20} color="#7ca9d4" />
        {unread > 0 && (
          <View style={ns.badge}>
            <Text style={ns.badgeText}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Notification Modal */}
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={ns.modal}>

          {/* Header */}
          <View style={ns.header}>
            <Text style={ns.headerTitle}>Notifications</Text>
            {unread > 0 && (
              <TouchableOpacity onPress={markAllRead} style={ns.markAllBtn}>
                <Text style={ns.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <ActivityIndicator
              color="#16a34a"
              style={{ marginTop: 40 }}
            />
          ) : (
            <FlatList
              data={notifs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const cfg = TYPE_CONFIG[item.type];
                return (
                  <TouchableOpacity
                    style={[ns.item, !item.is_read && ns.itemUnread]}
                    onPress={() => !item.is_read && markRead(item.id)}
                    activeOpacity={0.7}
                  >
                    {/* Icon */}
                    <View style={[ns.iconWrap, { backgroundColor: cfg.bg }]}>
                      <Ionicons
                        name={cfg.icon as any}
                        size={20}
                        color={cfg.color}
                      />
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <Text style={ns.itemTitle}>
                        {cfg.label} —{" "}
                        <Text style={{ color: cfg.color }}>
                          {item.cow_name}
                        </Text>{" "}
                        #{item.cow_tag}
                      </Text>

                      <Text style={ns.itemSub}>
                        by {item.worker_name}
                        {item.type === "milk" && item.details?.quantity
                          ? `  ·  ${item.details.quantity}L`
                          : ""}
                        {item.type === "feed" && item.details?.shift
                          ? `  ·  ${item.details.shift} shift`
                          : ""}
                        {item.type === "health" && item.details?.status
                          ? `  ·  ${item.details.status}`
                          : ""}
                      </Text>

                      <Text style={ns.itemTime}>
                        {timeAgo(item.created_at)}
                      </Text>
                    </View>

                    {/* Unread dot */}
                    {!item.is_read && <View style={ns.dot} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={ns.empty}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={48}
                    color="#d1d5db"
                  />
                  <Text style={ns.emptyText}>No notifications yet</Text>
                  <Text style={ns.emptySub}>
                    Worker actions will appear here
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const ns = StyleSheet.create({
  btn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#0d2137",
    borderWidth: 1, borderColor: "#1e3a5f",
    alignItems: "center", justifyContent: "center",
  },
  badge: {
    position: "absolute", top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  modal: { flex: 1, backgroundColor: "#fff", paddingTop: 56 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20, fontWeight: "800",
    color: "#111827", flex: 1,
  },
  markAllBtn: {
    backgroundColor: "#f0fdf4", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  markAllText: { fontSize: 12, color: "#16a34a", fontWeight: "700" },
  item: {
    flexDirection: "row", alignItems: "center",
    gap: 12, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#f9fafb",
  },
  itemUnread: { backgroundColor: "#f0f9ff" },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  itemTime: { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
  empty: {
    alignItems: "center", paddingTop: 80, gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#9ca3af" },
  emptySub: { fontSize: 13, color: "#d1d5db" },
});
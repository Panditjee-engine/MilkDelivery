import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, TaskType } from "../services/api";

const C = {
  dark: "#BB6B3F", bg: "#FFF8EF", text: "#3D1F0A",
  textMuted: "#A07850", textLight: "#C9A882", border: "#F4E3CF",
};

interface Props {
  value: string; // currently selected label / custom title
  onSelect: (task: TaskType | null) => void; // null = "Custom task"
  placeholder?: string;
}

export default function TaskTypeDropdown({
  value, onSelect, placeholder = "Select a saved task",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskType[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getAdminTaskTypes();
        if (alive) setTasks((res.task_types || []).filter((t) => t.is_active));
      } catch {
        if (alive) setTasks([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={value ? s.value : s.placeholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <View style={s.header}>
              <Text style={s.title}>Saved Tasks</Text>
              <TouchableOpacity style={s.close} onPress={() => setOpen(false)}>
                <Ionicons name="close" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={C.dark} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
                {tasks.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.option, value === t.label && s.optionActive]}
                    onPress={() => { onSelect(t); setOpen(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.optionName}>{t.label}</Text>
                      {t.description ? (
                        <Text style={s.optionMeta} numberOfLines={1}>{t.description}</Text>
                      ) : null}
                    </View>
                    <Text style={s.points}>{t.points} pt</Text>
                    {value === t.label && (
                      <Ionicons name="checkmark-circle" size={18} color={C.dark} />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={s.option}
                  onPress={() => { onSelect(null); setOpen(false); }}
                >
                  <Ionicons name="create-outline" size={18} color={C.dark} />
                  <Text style={[s.optionName, { marginLeft: 8 }]}>Custom task (type my own)</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", backgroundColor: C.bg, marginBottom: 12,
  },
  placeholder: { color: C.textLight, fontSize: 14, flex: 1 },
  value: { color: C.text, fontSize: 14, fontWeight: "700", flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(61,31,10,0.25)", justifyContent: "flex-end", padding: 16 },
  sheet: { backgroundColor: "#fff", borderRadius: 24, padding: 16, maxHeight: "72%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontSize: 17, fontWeight: "800", color: C.text },
  close: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  option: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 16 },
  optionActive: { backgroundColor: C.bg },
  optionName: { fontSize: 14, fontWeight: "700", color: C.text },
  optionMeta: { marginTop: 2, fontSize: 12, color: C.textLight },
  points: { fontSize: 12, fontWeight: "700", color: C.textMuted },
});
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import StarRating from "./StarRating";

interface AdminFeedbackModalProps {
  visible: boolean;
  productId: string | null;
  productName?: string;
  onClose: () => void;
}

export default function AdminFeedbackModal({
  visible,
  productId,
  productName,
  onClose,
}: AdminFeedbackModalProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!visible || !productId) return;
    setLoading(true);
    setSummary(null);
    api
      .getAdminProductFeedback(productId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [visible, productId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <SafeAreaView style={s.sheet} edges={["bottom"]}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Customer Feedback</Text>
              {productName ? (
                <Text style={s.subtitle} numberOfLines={1}>
                  {productName}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color="#F59E0B" />
            </View>
          ) : summary && summary.total_reviews > 0 ? (
            <>
              <View style={s.summaryRow}>
                <Text style={s.avgValue}>{summary.average_rating.toFixed(1)}</Text>
                <View>
                  <StarRating value={Math.round(summary.average_rating)} readOnly size={16} />
                  <Text style={s.reviewCount}>
                    {summary.total_reviews} review{summary.total_reviews > 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              <FlatList
                data={summary.feedback}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.list}
                renderItem={({ item }) => (
                  <View style={s.feedbackRow}>
                    <View style={s.feedbackTop}>
                      <Text style={s.customerName}>
                        {item.customer_name || "Customer"}
                      </Text>
                      <StarRating value={item.rating} readOnly size={13} />
                    </View>
                    {item.comment ? (
                      <Text style={s.comment}>{item.comment}</Text>
                    ) : null}
                  </View>
                )}
              />
            </>
          ) : (
            <View style={s.emptyWrap}>
              <Ionicons name="star-outline" size={36} color="#D1D5DB" />
              <Text style={s.emptyText}>No feedback yet for this product.</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2, fontWeight: "600" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  avgValue: { fontSize: 26, fontWeight: "900", color: "#111827" },
  reviewCount: { fontSize: 12, color: "#6B7280", fontWeight: "700", marginTop: 2 },
  list: { paddingVertical: 8, paddingBottom: 24 },
  feedbackRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  feedbackTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerName: { fontSize: 13, fontWeight: "800", color: "#111827" },
  comment: { fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 18 },
  emptyWrap: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
});
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import StarRating from "./StarRating";
import { api } from "../services/api";

export default function OrderItemFeedback({
  orderId,
  productId,
  productName,
}: {
  orderId: string;
  productId: string;
  productName: string;
}) {
  const [existing, setExisting] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMyOrderFeedback(orderId)
      .then((map) => {
        const fb = map[productId];
        if (fb) {
          setExisting(fb);
          setRating(fb.rating);
          setComment(fb.comment || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId, productId]);

  const submit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const saved = await api.submitProductFeedback({
        order_id: orderId,
        product_id: productId,
        rating,
        comment: comment.trim() || undefined,
      });
      setExisting(saved);
      setEditing(false);
    } catch {
      // could show a toast here
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (existing && !editing) {
    return (
      <View style={fS.wrap}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <StarRating value={existing.rating} readOnly size={16} />
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={fS.editTxt}>Edit</Text>
          </TouchableOpacity>
        </View>
        {existing.comment ? <Text style={fS.savedComment}>{existing.comment}</Text> : null}
      </View>
    );
  }

  return (
    <View style={fS.wrap}>
      <Text style={fS.label}>Rate {productName}</Text>
      <StarRating value={rating} onChange={setRating} size={22} />
      <TextInput
        style={fS.input}
        placeholder="Share your experience (optional)"
        placeholderTextColor="#9CA3AF"
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <TouchableOpacity
        style={[fS.submitBtn, !rating && { opacity: 0.5 }]}
        disabled={!rating || submitting}
        onPress={submit}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={fS.submitTxt}>Submit Feedback</Text>}
      </TouchableOpacity>
    </View>
  );
}

const fS = StyleSheet.create({
  wrap: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  label: { fontSize: 12.5, fontWeight: "800", color: "#111827", marginBottom: 8 },
  input: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    padding: 10,
    fontSize: 13,
    color: "#111827",
    textAlignVertical: "top",
  },
  submitBtn: {
    marginTop: 10,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  submitTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },
  editTxt: { fontSize: 12, fontWeight: "800", color: "#2563EB" },
  savedComment: { marginTop: 6, fontSize: 12.5, color: "#6B7280" },
});
import React from "react";
import { useLocalSearchParams } from "expo-router";
import GaumaliScreen from "./gaumali";

export default function GaumaliDetails() {
  const { id, booking } = useLocalSearchParams<{ id: string; booking?: string }>();
  return <GaumaliScreen key={`${id}:${booking}`} detailId={String(id || "missing")} startBooking={booking === "1"} />;
}

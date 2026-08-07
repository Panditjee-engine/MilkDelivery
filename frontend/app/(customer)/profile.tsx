import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import Input from "../../src/components/Input";
import {
  formatDeliveryAddress,
  hasCompleteDeliveryAddress,
} from "../../src/utils/address";

const { width } = Dimensions.get("window");

// ─── Custom Alert ─────────────────────────────────────────────────────────────

type AlertAction = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};
type AlertConfig = {
  visible: boolean;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  message: string;
  actions: AlertAction[];
};

const emptyAddress = () => ({
  id: `addr_${Date.now()}`,
  label: "home",
  is_default: true,
  tower: "",
  flat: "",
  floor: "",
  area: "",
  city: "",
  pincode: "",
  landmark: "",
});

const normalizeAddressBook = (user: any) => {
  const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
  const withIds = addresses.map((address: any, index: number) => ({
    id: address.id || `addr_${index}_${Date.now()}`,
    is_default: false,
    ...address,
  }));
  if (!withIds.length && user?.address) {
    withIds.push({
      id: user.address.id || "addr_default",
      label: user.address.label || "home",
      is_default: true,
      ...user.address,
    });
  }
  if (withIds.length && !withIds.some((address: any) => address.is_default)) {
    withIds[0].is_default = true;
  }
  return withIds;
};

function CustomAlert({
  config,
  onDismiss,
}: {
  config: AlertConfig;
  onDismiss: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [config.visible]);

  if (!config.visible) return null;

  return (
    <Modal transparent visible={config.visible} animationType="none">
      <Animated.View style={[alertStyles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[alertStyles.card, { transform: [{ scale: scaleAnim }] }]}
        >
          {config.icon && (
            <View
              style={[
                alertStyles.iconWrap,
                { backgroundColor: config.iconBg || "#F0F4FF" },
              ]}
            >
              <Ionicons
                name={config.icon as any}
                size={28}
                color={config.iconColor || Colors.primary}
              />
            </View>
          )}
          <Text style={alertStyles.title}>{config.title}</Text>
          <Text style={alertStyles.message}>{config.message}</Text>
          <View style={alertStyles.actions}>
            {config.actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  alertStyles.actionBtn,
                  action.style === "destructive" && alertStyles.actionDestructive,
                  action.style === "cancel" && alertStyles.actionCancel,
                  action.style === "default" && alertStyles.actionDefault,
                ]}
                onPress={() => {
                  onDismiss();
                  action.onPress?.();
                }}
              >
                <Text
                  style={[
                    alertStyles.actionText,
                    action.style === "destructive" && alertStyles.actionTextDestructive,
                    action.style === "cancel" && alertStyles.actionTextCancel,
                    action.style === "default" && alertStyles.actionTextDefault,
                  ]}
                >
                  {action.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: { flexDirection: "row", gap: 10, width: "100%" },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  actionDefault: { backgroundColor: Colors.primary },
  actionDestructive: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  actionCancel: { backgroundColor: "#F5F5F5" },
  actionText: { fontSize: 14, fontWeight: "700" },
  actionTextDefault: { color: "#fff" },
  actionTextDestructive: { color: "#EF4444" },
  actionTextCancel: { color: "#666" },
});

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  visible,
  message,
  type,
}: {
  visible: boolean;
  message: string;
  type: "success" | "error";
}) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[toastStyles.wrap, { transform: [{ translateY }], opacity }]}
    >
      <View
        style={[
          toastStyles.toast,
          type === "error" ? toastStyles.toastError : toastStyles.toastSuccess,
        ]}
      >
        <Ionicons
          name={type === "success" ? "checkmark-circle" : "alert-circle"}
          size={18}
          color={type === "success" ? "#16a34a" : "#dc2626"}
        />
        <Text
          style={[toastStyles.text, type === "error" && { color: "#dc2626" }]}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  toastError: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  text: { fontSize: 14, fontWeight: "600", color: "#16a34a" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter()

  // Pure state storage for vacations to bypass backend API
  const params = useLocalSearchParams<{
    openAddress?: string;
    addressRequired?: string;
    returnTo?: string;
  }>();
  const [vacations, setVacations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [vacationModal, setVacationModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectingStart, setSelectingStart] = useState(true);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [addressBook, setAddressBook] = useState<any[]>(() =>
    normalizeAddressBook(user),
  );
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState(() =>
    normalizeAddressBook(user)[0] || emptyAddress(),
  );
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [connectModal, setConnectModal] = useState(false);
  const [connectReferralCode, setConnectReferralCode] = useState("");
  const [connectingGaushala, setConnectingGaushala] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused || params.openAddress !== "1") return;
    router.replace({
      pathname: "/address-book",
      params: {
        addressRequired: params.addressRequired,
        returnTo: params.returnTo,
      },
    } as any);
  }, [isFocused, params.openAddress, params.addressRequired, params.returnTo, user?.address]);

  useEffect(() => {
    if (!isFocused) return;
    const next = normalizeAddressBook(user);
    setAddressBook(next);
  }, [isFocused, user?.address, (user as any)?.addresses]);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    message: "",
    actions: [],
  });
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const chevronAnim = useRef(new Animated.Value(0)).current;

  const showAlert = (config: Omit<AlertConfig, "visible">) =>
    setAlertConfig({ ...config, visible: true });
  const hideAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2800);
  };

  useEffect(() => {
    if (!isFocused || params.addressRequired !== "1") return;
    showToast(
      "Please add your delivery address before placing the order.",
      "error",
    );
  }, [isFocused, params.addressRequired]);

  useEffect(() => {
    if (!isFocused) return;
    fetchData();
  }, [isFocused]);

const fetchData = async () => {
  try {
    const [ordersData, vacationsData] = await Promise.all([
      api.getOrders(),
      api.getVacations().catch(() => []),
    ]);
    setOrders(ordersData || []);
    setVacations(vacationsData || []);
  } catch (error) {
    console.error("Error fetching profile data:", error);
  }
};

  const toggleOrders = () => {
    const toValue = ordersExpanded ? 0 : 1;
    setOrdersExpanded(!ordersExpanded);
    Animated.timing(chevronAnim, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleLogout = () => {
    showAlert({
      icon: "log-out-outline",
      iconColor: "#EF4444",
      iconBg: "#FEF2F2",
      title: "Log Out",
      message: "Are you sure you want to log out of your account?",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          },
        },
      ],
    });
  };

  const handleDeleteAccount = () => {
    setDeletePassword("");
    setDeleteModal(true);
  };

  const handleOpenConnectGaushala = () => {
    setConnectReferralCode("");
    setConnectModal(true);
  };

  const handleConnectGaushala = async () => {
    const code = connectReferralCode.trim().toUpperCase();
    if (!code) {
      showToast("Please enter referral code.", "error");
      return;
    }
    setConnectingGaushala(true);
    try {
      const result = await api.connectGaushala(code);
      if (result.user) {
        updateUser(result.user);
      } else {
        updateUser({
          admin_id: result.admin_id,
          referral_admin_id: result.admin_id,
        } as any);
      }
      setConnectModal(false);
      showToast(`Connected with ${result.admin_name || "Gaushala"}`, "success");
    } catch (error: any) {
      showToast(error?.message || "Could not connect with gaushala", "error");
    } finally {
      setConnectingGaushala(false);
    }
  };

  const handleSaveBasicProfile = async () => {
    if (!editName.trim()) {
      showToast("Please enter your name.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      updateUser({
        name: editName.trim(),
        phone: editPhone.trim(),
      } as any);
      setEditModal(false);
      showToast("Profile updated successfully", "success");
    } catch (error: any) {
      showToast(error?.message || "Could not update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      showToast("Please enter your password to delete your account.", "error");
      return;
    }
    showAlert({
      icon: "trash-outline",
      iconColor: "#DC2626",
      iconBg: "#FEF2F2",
      title: "Delete Account",
      message:
        "This will permanently delete your Gau Satva account and remove your personal profile data. This action cannot be undone.",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.deleteAccount(deletePassword);
              setDeleteModal(false);
              router.replace("/(auth)/login");
            } catch (error: any) {
              showToast(error?.message || "Could not delete account. Please try again.", "error");
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    });
  };

const handleAddVacation = async () => {
  if (!startDate || !endDate) {
    showAlert({
      icon: "calendar-outline",
      iconColor: "#f59e0b",
      iconBg: "#FFF9EC",
      title: "Select Dates",
      message: "Please pick both a start and end date for your vacation.",
      actions: [{ text: "OK", style: "default" }],
    });
    return;
  }
  if (startDate > endDate) {
    showAlert({
      icon: "alert-circle-outline",
      iconColor: "#EF4444",
      iconBg: "#FEF2F2",
      title: "Invalid Range",
      message: "The end date must be after the start date.",
      actions: [{ text: "Got it", style: "default" }],
    });
    return;
  }

  try {
    const newVacation = await api.createVacation(startDate, endDate);
    setVacations((prev) => [...prev, newVacation]);
    setVacationModal(false);
    setStartDate("");
    setEndDate("");
    setSelectingStart(true);
    showToast("Vacation saved! Deliveries will be paused.", "success");
  } catch (error: any) {
    showToast(error?.message || "Could not save vacation", "error");
  }
};

const handleDeleteVacation = (id: string) => {
  showAlert({
    icon: "trash-outline",
    iconColor: "#EF4444",
    iconBg: "#FEF2F2",
    title: "Remove Vacation",
    message: "This vacation period will be deleted and deliveries will resume.",
    actions: [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteVacation(id);
            setVacations((prev) => prev.filter((v) => v.id !== id));
            showToast("Vacation removed");
          } catch (error: any) {
            showToast(error?.message || "Could not remove vacation", "error");
          }
        },
      },
    ],
  });
};

  const openNewAddress = () => {
    const next = {
      ...emptyAddress(),
      is_default: addressBook.length === 0,
    };
    setEditingAddressId(null);
    setEditAddress(next);
    setEditModal(true);
  };

  const openEditAddress = (address: any) => {
    setEditingAddressId(address.id);
    setEditAddress(address);
    setEditModal(true);
  };

  const handleDeleteAddress = (address: any) => {
    showAlert({
      icon: "trash-outline",
      iconColor: "#EF4444",
      iconBg: "#FEF2F2",
      title: "Delete Address",
      message: "Remove this saved delivery address?",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const remaining = addressBook.filter((item) => item.id !== address.id);
            if (remaining.length && !remaining.some((item) => item.is_default)) {
              remaining[0].is_default = true;
            }
            const defaultAddress = remaining.find((item) => item.is_default) || remaining[0] || null;
            setSaving(true);
            try {
              await api.updateProfile({
                name: editName,
                phone: editPhone,
                address: defaultAddress,
                addresses: remaining,
              });
              setAddressBook(remaining);
              updateUser({
                name: editName,
                phone: editPhone,
                address: defaultAddress,
                addresses: remaining,
              } as any);
              showToast("Address removed", "success");
            } catch (error: any) {
              showToast(error.message || "Could not remove address", "error");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    });
  };

  const handleSaveProfile = async () => {
    const normalizedAddress = {
      id: editAddress.id || `addr_${Date.now()}`,
      label: editAddress.label || "home",
      is_default: editAddress.is_default ?? true,
      tower: editAddress.tower?.trim() || "",
      flat: editAddress.flat?.trim() || "",
      floor: editAddress.floor?.trim() || "",
      area: editAddress.area?.trim() || "",
      city: editAddress.city?.trim() || "",
      pincode: editAddress.pincode?.trim() || "",
      landmark: editAddress.landmark?.trim() || "",
    };

    if (!hasCompleteDeliveryAddress(normalizedAddress)) {
      showToast("Flat, building/area, city and pincode are required for delivery.", "error");
      return;
    }

    setSaving(true);
    try {
      const nextBook = editingAddressId
        ? addressBook.map((address) =>
            address.id === editingAddressId ? { ...address, ...normalizedAddress } : address,
          )
        : [...addressBook, normalizedAddress];
      const normalizedBook = nextBook.map((address) => ({
        ...address,
        is_default: normalizedAddress.is_default ? address.id === normalizedAddress.id : address.is_default,
      }));
      if (!normalizedBook.some((address) => address.is_default)) {
        normalizedBook[normalizedBook.length - 1].is_default = true;
      }
      const defaultAddress =
        normalizedBook.find((address) => address.is_default) ||
        normalizedBook[normalizedBook.length - 1];

      await api.updateProfile({
        name: editName,
        phone: editPhone,
        address: defaultAddress,
        addresses: normalizedBook,
      });
      setAddressBook(normalizedBook);
      setEditAddress(defaultAddress);
      setEditingAddressId(defaultAddress.id);
      updateUser({
        name: editName,
        phone: editPhone,
        address: defaultAddress,
        addresses: normalizedBook,
      } as any);
      setEditModal(false);
      showToast("Address saved successfully", "success");
      if (params.returnTo === "catalog") {
        router.replace("/(customer)/catalog");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getMarkedDates = () => {
    const marks: any = {};
    if (startDate)
      marks[startDate] = { selected: true, startingDay: true, color: Colors.primary };
    if (endDate)
      marks[endDate] = { selected: true, endingDay: true, color: Colors.primary };
    if (startDate && endDate) {
      let current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        marks[dateStr] = {
          ...marks[dateStr],
          selected: true,
          color: Colors.primary,
          textColor: "#fff",
        };
        current.setDate(current.getDate() + 1);
      }
      marks[startDate] = { ...marks[startDate], startingDay: true };
      marks[endDate] = { ...marks[endDate], endingDay: true };
    }
    return marks;
  };

  const statusConfig = (status: string) => {
    switch (status) {
      case "delivered":
        return { color: "#16a34a", bg: "#F0FDF4", border: "#BBF7D0", label: "Delivered",        icon: "checkmark-circle" };
      case "out_for_delivery":
        return { color: "#d97706", bg: "#FFFBEB", border: "#FDE68A", label: "Out for Delivery", icon: "bicycle"          };
      case "assigned":
        return { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", label: "Rider Assigned",   icon: "bicycle-outline"  };
      case "cancelled":
        return { color: "#dc2626", bg: "#FEF2F2", border: "#FECACA", label: "Cancelled",        icon: "close-circle"     };
      case "skipped":
        return { color: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB", label: "Skipped",          icon: "play-skip-forward-outline" };
      default:
        return { color: "#6366f1", bg: "#EEF2FF", border: "#C7D2FE", label: status?.replace(/_/g, " ") || "Pending", icon: "time" };
    }
  };

  const visibleOrders = ordersExpanded ? orders : orders.slice(0, 3);
  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
      <CustomAlert config={alertConfig} onDismiss={hideAlert} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroBg} />
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.phone && (
            <View style={styles.phoneBadge}>
              <Ionicons name="call-outline" size={11} color={Colors.primary} />
              <Text style={styles.phoneText}>{user.phone}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditModal(true)}
          >
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

       

        {/* ── Delivery Address ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: "#EEF4FF" }]}>
              <Ionicons name="location" size={17} color="#4F7EFF" />
            </View>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <TouchableOpacity
              style={styles.addIconBtn}
              onPress={() => router.push("/address-book" as any)}
            >
              <Ionicons name="chevron-forward" size={17} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {addressBook.length > 0 ? (
            <View style={styles.addressList}>
              {addressBook.map((address) => (
                <TouchableOpacity
                  key={address.id}
                  style={styles.savedAddressCard}
                  activeOpacity={0.85}
                  onPress={() => router.push("/address-book" as any)}
                >
                  <View style={styles.addressTopRow}>
                    <View style={styles.addressTypeBadge}>
                      <Ionicons
                        name={address?.label === "work" ? "briefcase-outline" : address?.label === "other" ? "location-outline" : "home-outline"}
                        size={13}
                        color={Colors.primary}
                      />
                      <Text style={styles.addressTypeText}>
                        {String(address?.label || "home").toUpperCase()}
                      </Text>
                    </View>
                    {address?.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.savedAddressText}>
                    {formatDeliveryAddress(address)}
                  </Text>
                  <Text style={styles.savedAddressAction}>Tap to manage address</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyAddress}
              onPress={() =>
                router.push({
                  pathname: "/address-book",
                  params: { addressRequired: "1" },
                } as any)
              }
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.emptyAddressText}>
                {user?.address ? "Complete delivery address" : "Add delivery address"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Vacation Mode (Card visual design untouched) ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: "#FFF4E6" }]}>
              <Ionicons name="airplane" size={17} color="#f59e0b" />
            </View>
            <Text style={styles.cardTitle}>Vacation Mode</Text>
            <TouchableOpacity
              style={styles.addIconBtn}
              onPress={() => {
                setStartDate("");
                setEndDate("");
                setSelectingStart(true);
                setVacationModal(true);
              }}
            >
              <Ionicons name="add" size={17} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>
            Deliveries are automatically skipped on these dates.
          </Text>
          {vacations.length > 0 ? (
            <View style={styles.vacationList}>
              {vacations.map((v) => (
                <View key={v.id} style={styles.vacationChip}>
                  <Ionicons name="sunny-outline" size={14} color="#d97706" />
                  <Text style={styles.vacationChipText}>
                    {formatDate(v.start_date)} → {formatDate(v.end_date)}
                  </Text>
                  <TouchableOpacity
                    style={styles.vacationDeleteBtn}
                    onPress={() => handleDeleteVacation(v.id)}
                  >
                    <Ionicons name="close" size={12} color="#d97706" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={22} color="#d1d5db" />
              <Text style={styles.emptyText}>No vacations scheduled</Text>
            </View>
          )}
        </View>

        {/* ── Recent Orders ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="receipt" size={17} color="#22c55e" />
            </View>
            <Text style={styles.cardTitle}>Orders</Text>
            {orders && orders.length > 3 && (
              <TouchableOpacity style={styles.expandBtn} onPress={toggleOrders}>
                <Text style={styles.expandBtnText}>
                  {ordersExpanded ? "Show less" : `+${orders.length - 3} more`}
                </Text>
                <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                  <Ionicons name="chevron-down" size={14} color={Colors.primary} />
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>

          {orders && orders.length > 0 ? (
            <>
              {visibleOrders.map((order, i) => {
                const sc = statusConfig(order.status);
                const productName =
                  order.product_name ||
                  order.product?.name ||
                  (order.items?.length > 0
                    ? order.items[0]?.name || `Order #${String(order.id).slice(-4)}`
                    : `Order #${String(order.id).slice(-4)}`);
                return (
                  <View
                    key={order.id}
                    style={[
                      styles.orderRow,
                      i < visibleOrders.length - 1 && styles.orderRowBorder,
                    ]}
                  >
                    <View style={styles.orderLeft}>
                      <View style={[styles.orderIconBox, { backgroundColor: sc.bg }]}>
                        <Ionicons name={sc.icon as any} size={16} color={sc.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderName} numberOfLines={1}>
                          {productName}
                        </Text>
                        <Text style={styles.orderDate}>
                          {formatDate(order.delivery_date || order.created_at)}
                        </Text>
                        <Text style={styles.orderItems}>
                          {order.items?.length || 0} item
                          {(order.items?.length || 0) !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderRight}>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: sc.bg, borderColor: sc.border },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: sc.color }]}>
                          {sc.label}
                        </Text>
                      </View>
                      <Text style={styles.orderAmt}>
                        ₹{order.total_amount?.toFixed(2) ?? "0.00"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bag-outline" size={22} color="#d1d5db" />
              <Text style={styles.emptyText}>No orders yet</Text>
            </View>
          )}
        </View>


         {/* ── Connect with Gaushala ── */}
        <TouchableOpacity
          style={[
            styles.card,
            styles.connectCard,
            (user as any)?.admin_id && styles.connectCardLinked,
          ]}
          activeOpacity={0.88}
          onPress={(user as any)?.admin_id ? undefined : handleOpenConnectGaushala}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="business-outline" size={17} color="#16a34a" />
            </View>
            <Text style={styles.cardTitle}>Connect with Gaushala</Text>
            <View
              style={[
                styles.connectionBadge,
                (user as any)?.admin_id && styles.connectionBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.connectionBadgeText,
                  (user as any)?.admin_id && styles.connectionBadgeTextActive,
                ]}
              >
                {(user as any)?.admin_id ? "Connected" : "Referral"}
              </Text>
            </View>
          </View>
          <Text style={styles.connectText}>
            {(user as any)?.admin_id
              ? "Your account is connected with a nearby gaushala."
              : "Enter your gaushala referral code to see nearby products, content and services."}
          </Text>
          {!(user as any)?.admin_id && (
            <View style={styles.connectActionRow}>
              <Text style={styles.connectActionText}>Tap to enter referral code</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </View>
          )}
        </TouchableOpacity>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#fca5a5"
            style={{ marginLeft: "auto" }}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
          <View style={styles.logoutIcon}>
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </View>
          <Text style={styles.deleteAccountText}>Delete Account</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#fca5a5"
            style={{ marginLeft: "auto" }}
          />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={deleteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <TouchableOpacity onPress={() => setDeleteModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.deleteAccountHelp}>
                Enter your password to confirm permanent account deletion.
              </Text>
              <Input
                label="Password"
                placeholder="Enter password"
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
              />
              <Button
                title={deletingAccount ? "Deleting..." : "Continue"}
                onPress={confirmDeleteAccount}
                loading={deletingAccount}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Vacation Modal ── */}
      <Modal visible={vacationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Vacation</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setVacationModal(false)}
              >
                <Ionicons name="close" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.dateTabs}>
              <TouchableOpacity
                style={[styles.dateTab, selectingStart && styles.dateTabActive]}
                onPress={() => setSelectingStart(true)}
              >
                <Text style={styles.dateTabLabel}>FROM</Text>
                <Text
                  style={[
                    styles.dateTabValue,
                    selectingStart && styles.dateTabValueActive,
                  ]}
                >
                  {startDate || "—"}
                </Text>
              </TouchableOpacity>
              <View style={styles.dateArrow}>
                <Ionicons name="arrow-forward" size={14} color="#ccc" />
              </View>
              <TouchableOpacity
                style={[styles.dateTab, !selectingStart && styles.dateTabActive]}
                onPress={() => setSelectingStart(false)}
              >
                <Text style={styles.dateTabLabel}>TO</Text>
                <Text
                  style={[
                    styles.dateTabValue,
                    !selectingStart && styles.dateTabValueActive,
                  ]}
                >
                  {endDate || "—"}
                </Text>
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={new Date().toISOString().split("T")[0]}
              markedDates={getMarkedDates()}
              markingType="period"
              onDayPress={(day: any) => {
                if (selectingStart) {
                  setStartDate(day.dateString);
                  setSelectingStart(false);
                } else {
                  setEndDate(day.dateString);
                }
              }}
              theme={{
                todayTextColor: Colors.primary,
                selectedDayBackgroundColor: Colors.primary,
                arrowColor: Colors.primary,
                textDayFontWeight: "600",
                textMonthFontWeight: "800",
              }}
            />
            <Button
              title="Save Vacation"
              onPress={handleAddVacation}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={connectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect with Gaushala</Text>
              <TouchableOpacity
                onPress={() => setConnectModal(false)}
                disabled={connectingGaushala}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.connectModalIcon}>
                <Ionicons name="business" size={26} color="#16a34a" />
              </View>
              <Text style={styles.connectModalText}>
                Enter the referral code shared by your nearby gaushala.
              </Text>
              <Input
                label="Referral Code"
                placeholder="Example: RAM347"
                value={connectReferralCode}
                onChangeText={(text) => setConnectReferralCode(text.toUpperCase())}
                autoCapitalize="characters"
              />
              <Button
                title={connectingGaushala ? "Connecting..." : "Connect Gaushala"}
                onPress={handleConnectGaushala}
                loading={connectingGaushala}
                disabled={connectingGaushala}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Profile Modal ── */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setEditModal(false)}
              >
                <Ionicons name="close" size={15} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {params.addressRequired === "1" && (
                <View style={styles.addressRequiredBanner}>
                  <View style={styles.addressRequiredIcon}>
                    <Ionicons name="location" size={18} color="#dc2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressRequiredTitle}>
                      Delivery address required
                    </Text>
                    <Text style={styles.addressRequiredText}>
                      Add your address to continue placing the order.
                    </Text>
                  </View>
                </View>
              )}
              <Input
                label="Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
              />
              <Input
                label="Phone"
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
              <Button
                title="Save Changes"
                onPress={handleSaveBasicProfile}
                loading={saving}
                style={{ marginTop: 8, marginBottom: 20 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F6" },

  // Hero
  hero: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    marginBottom: 16,
    overflow: "hidden",
  },
  heroBg: {
    position: "absolute",
    top: -60,
    left: -60,
    right: -60,
    height: 180,
    backgroundColor: Colors.primary + "0D",
    borderRadius: 100,
  },
  avatarRing: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2.5,
    borderColor: Colors.primary + "35",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 30, fontWeight: "800", color: "#fff" },
  avatarBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22c55e",
    borderWidth: 2.5,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  userEmail: { fontSize: 13, color: "#aaa", marginTop: 3, fontWeight: "400" },
  phoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  phoneText: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    marginTop: 14,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  editBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111", flex: 1 },
  addIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary + "14",
    justifyContent: "center",
    alignItems: "center",
  },
  connectCard: {
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#FCFFFD",
  },
  connectCardLinked: {
    borderColor: Colors.primary + "24",
    backgroundColor: "#F8FBF7",
  },
  connectionBadge: {
    borderRadius: 999,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  connectionBadgeActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  connectionBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#16a34a",
  },
  connectionBadgeTextActive: { color: "#fff" },
  connectText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    lineHeight: 19,
  },
  connectActionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectActionText: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.primary,
  },

  // Address
  addressGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  addressList: { gap: 10 },
  savedAddressCard: {
    backgroundColor: "#F8FBF7",
    borderWidth: 1,
    borderColor: Colors.primary + "22",
    borderRadius: 16,
    padding: 14,
  },
  addressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addressTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  addressTypeText: { fontSize: 10, fontWeight: "900", color: Colors.primary },
  defaultBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  addressActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  savedAddressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  savedAddressAction: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  addressPill: {
    flex: 1,
    minWidth: 90,
    backgroundColor: "#F8F8FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressPillLabel: {
    fontSize: 10,
    color: "#aaa",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  addressPillValue: { fontSize: 14, fontWeight: "700", color: "#111" },
  emptyAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  emptyAddressText: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
  addressTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  addressTypeChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "22",
    backgroundColor: Colors.primary + "08",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addressTypeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  addressTypeChipText: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.primary,
  },
  addressTypeChipTextActive: { color: "#fff" },
  defaultAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8F8FA",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  defaultCheck: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultCheckActive: { backgroundColor: Colors.primary },
  defaultAddressText: { fontSize: 13, fontWeight: "800", color: "#111827" },

  // Vacation
  hintText: { fontSize: 12, color: "#bbb", marginBottom: 12, marginTop: -6 },
  vacationList: { gap: 8 },
  vacationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  vacationChipText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#92400e" },
  vacationDeleteBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  emptyText: { fontSize: 13, color: "#d1d5db", fontStyle: "italic" },

  // Orders
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary + "12",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  expandBtnText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
  },
  orderRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  orderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  orderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  orderName: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 1 },
  orderDate: { fontSize: 12, color: "#aaa", marginBottom: 1 },
  orderItems: { fontSize: 11, color: "#bbb" },
  orderRight: { alignItems: "flex-end", gap: 5 },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  orderAmt: { fontSize: 14, fontWeight: "800", color: "#111" },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    backgroundColor: "#FFF7F7",
    borderRadius: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteAccountText: { fontSize: 15, fontWeight: "800", color: "#dc2626" },
  deleteAccountHelp: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 14,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 36,
    maxHeight: "93%",
  },
  modalBody: { paddingBottom: 4 },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  connectModalIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  connectModalText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
    fontWeight: "600",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  dateTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  dateArrow: { paddingHorizontal: 2 },
  dateTab: {
    flex: 1,
    backgroundColor: "#F8F8FA",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  dateTabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  dateTabLabel: {
    fontSize: 10,
    color: "#bbb",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateTabValue: { fontSize: 15, fontWeight: "700", color: "#111", marginTop: 4 },
  dateTabValueActive: { color: Colors.primary },
  addressSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  profileDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 8,
    marginBottom: 4,
  },
  addressRequiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  addressRequiredIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  addressRequiredTitle: { fontSize: 13, fontWeight: "900", color: "#991B1B" },
  addressRequiredText: { fontSize: 11.5, color: "#B91C1C", marginTop: 2 },
});
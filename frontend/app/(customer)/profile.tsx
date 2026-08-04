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
  Image,
  Switch,
  TextInput,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { Colors as AppColors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import Input from "../../src/components/Input";
import {
  formatDeliveryAddress,
  hasCompleteDeliveryAddress,
} from "../../src/utils/address";

const { width } = Dimensions.get("window");

// ─── Theme Colors (From HTML) ────────────────────────────────────────────────
const Theme = {
  primary: "#a04100",
  primaryContainer: "#ffdbcc",
  secondary: "#6b3dca",
  background: "#f8f9ff",
  surface: "#f8f9ff",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f2f3f9",
  surfaceContainerHigh: "#e7e8ee",
  surfaceContainerHighest: "#e1e2e8",
  onSurface: "#191c20",
  onSurfaceVariant: "#5a4136",
  outlineVariant: "#e2bfb0",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  onPrimary: "#ffffff",
};

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
                color={config.iconColor || Theme.primary}
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
  actionDefault: { backgroundColor: Theme.primary },
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
  const router = useRouter();

  const params = useLocalSearchParams<{
    openAddress?: string;
    addressRequired?: string;
    returnTo?: string;
  }>();
  const [vacations, setVacations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [vacationModal, setVacationModal] = useState(false);
  
  // UI States matching the new HTML logic
  const [isEditProfileExpanded, setIsEditProfileExpanded] = useState(false);
  const [isVacationEnabled, setIsVacationEnabled] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectingStart, setSelectingStart] = useState(true);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [addressBook, setAddressBook] = useState<any[]>(() =>
    normalizeAddressBook(user)
  );
  
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
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
      "error"
    );
  }, [isFocused, params.addressRequired]);

  useEffect(() => {
    if (!isFocused) return;
    fetchData();
  }, [isFocused]);

  const fetchData = async () => {
    try {
      const ordersData = await api.getOrders();
      setOrders(ordersData || []);
    } catch (error) {
      console.error("Error fetching profile orders data:", error);
    }
  };

  const toggleOrders = () => {
    const toValue = ordersExpanded ? 0 : 1;
    setOrdersExpanded(!ordersExpanded);
    Animated.timing(chevronAnim, {
      toValue,
      duration: 300,
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
      setIsEditProfileExpanded(false);
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
        "This will permanently delete your account and remove your personal profile data. This action cannot be undone.",
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
              showToast(
                error?.message || "Could not delete account. Please try again.",
                "error"
              );
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

    const newVacation = {
      id: Math.random().toString(36).substring(7),
      start_date: startDate,
      end_date: endDate,
    };
    setVacations((prev) => [...prev, newVacation]);
    setVacationModal(false);
    showToast("Vacation saved! Deliveries will be paused.", "success");
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  };

  const getMarkedDates = () => {
    const marks: any = {};
    if (startDate)
      marks[startDate] = { selected: true, startingDay: true, color: AppColors.primary };
    if (endDate)
      marks[endDate] = { selected: true, endingDay: true, color: AppColors.primary };
    if (startDate && endDate) {
      let current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        marks[dateStr] = {
          ...marks[dateStr],
          selected: true,
          color: AppColors.primary,
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
    switch (status?.toLowerCase()) {
      case "delivered":
        return { color: Theme.primary, bg: `${Theme.primary}1A`, label: "DELIVERED" };
      case "shipped":
        return { color: Theme.secondary, bg: `${Theme.secondary}1A`, label: "SHIPPED" };
      case "processing":
      default:
        return { color: Theme.onSurfaceVariant, bg: Theme.surfaceContainerHigh, label: "PROCESSING" };
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── Profile Header ── */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGradient}>
              <View style={styles.avatarInner}>
                <Image
                  style={styles.avatarImage}
                  source={{
                    uri: user?.profile_image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user?.name || 'User') + "&background=a04100&color=fff",
                  }}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera" size={20} color={Theme.onPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* ── Edit Profile Section ── */}
        <View style={styles.editProfileSection}>
          <TouchableOpacity
            style={styles.editProfileToggle}
            activeOpacity={0.8}
            onPress={() => setIsEditProfileExpanded(!isEditProfileExpanded)}
          >
            <Ionicons name="pencil" size={20} color={Theme.onPrimary} />
            <Text style={styles.editProfileToggleText}>EDIT PROFILE</Text>
          </TouchableOpacity>

          {isEditProfileExpanded && (
            <Animated.View style={styles.editProfileFields}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.inputField}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.inputField}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="Enter your phone number"
                />
              </View>
              <TouchableOpacity onPress={handleSaveBasicProfile} style={styles.saveChangesBtn}>
                <Text style={styles.saveChangesText}>{saving ? "SAVING..." : "SAVE CHANGES"}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* ── Account Settings ── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.cardBlock}>
            
            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => router.push("/address-book" as any)}
            >
              <View style={styles.cardRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: `${Theme.secondary}1A` }]}>
                  <Ionicons name="location" size={20} color={Theme.secondary} />
                </View>
                <Text style={styles.cardRowText}>Add Delivery Address</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Theme.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={styles.cardRow}>
              <View style={styles.cardRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: `#b3927c33` }]}>
                  <Ionicons name="umbrella" size={20} color="#745945" />
                </View>
                <View>
                  <Text style={styles.cardRowText}>Vacation Mode</Text>
                  <Text style={styles.cardRowSubText}>Pause all active deliveries</Text>
                </View>
              </View>
              <Switch
                value={isVacationEnabled}
                onValueChange={(val) => {
                  setIsVacationEnabled(val);
                  if (val) {
                    setStartDate("");
                    setEndDate("");
                    setVacationModal(true);
                  }
                }}
                trackColor={{ false: Theme.surfaceContainerHighest, true: Theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {isVacationEnabled && vacations.length > 0 && (
              <View style={styles.vacationDatesBox}>
                <View style={styles.vacationDateGrid}>
                  <View style={styles.vacationDateCol}>
                    <Text style={styles.inputLabel}>START DATE</Text>
                    <View style={styles.dateDisplay}>
                      <Ionicons name="calendar-outline" size={20} color={Theme.primary} />
                      <Text style={styles.dateDisplayText}>{formatDate(vacations[0]?.start_date)}</Text>
                    </View>
                  </View>
                  <View style={styles.vacationDateCol}>
                    <Text style={styles.inputLabel}>END DATE</Text>
                    <View style={styles.dateDisplay}>
                      <Ionicons name="calendar" size={20} color={Theme.primary} />
                      <Text style={styles.dateDisplayText}>{formatDate(vacations[0]?.end_date)}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.vacationDisclaimer}>
                  Deliveries will resume automatically.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Saved Addresses ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            <TouchableOpacity onPress={() => router.push("/address-book" as any)}>
              <Ionicons name="add-circle" size={24} color={Theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.addressList}>
            {addressBook.map((addr) => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={styles.addressCardLeft}>
                  <View style={[styles.iconBox, { backgroundColor: `${Theme.primary}1A` }]}>
                    <Ionicons
                      name={addr.label === "work" ? "briefcase" : "home"}
                      size={20}
                      color={Theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>{addr.label ? addr.label.charAt(0).toUpperCase() + addr.label.slice(1) : "Home"}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {formatDeliveryAddress(addr)}
                    </Text>
                  </View>
                </View>
                <View style={styles.addressActions}>
                  <TouchableOpacity style={styles.actionBtnIcon} onPress={() => router.push("/address-book" as any)}>
                    <Ionicons name="pencil" size={20} color={Theme.onSurfaceVariant} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnIcon} onPress={() => handleDeleteAddress(addr)}>
                    <Ionicons name="trash" size={20} color={Theme.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {addressBook.length === 0 && (
              <Text style={styles.emptyStateText}>No saved addresses yet.</Text>
            )}
          </View>
        </View>

        {/* ── Order History ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/subscriptions" as any)}>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.orderList}>
            {visibleOrders.length > 0 ? (
              visibleOrders.map((order) => {
                const sc = statusConfig(order.status);
                const productName =
                  order.product_name ||
                  order.product?.name ||
                  (order.items?.length > 0
                    ? order.items[0]?.name || `Order #${String(order.id).slice(-4)}`
                    : `Order #${String(order.id).slice(-4)}`);

                return (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderCardLeft}>
                      <View style={styles.orderImageBox}>
                        <Image
                          source={{ uri: order.product?.image_url || order.items?.[0]?.image_url || "https://via.placeholder.com/150" }}
                          style={styles.orderImage}
                        />
                      </View>
                      <View style={styles.orderMeta}>
                        <Text style={styles.orderName} numberOfLines={1}>{productName}</Text>
                        <View style={[styles.orderStatusPill, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.orderStatusText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.orderPrice}>₹{order.total_amount?.toFixed(2) ?? "0.00"}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyStateText}>No recent orders.</Text>
            )}
          </View>

          {orders.length > 3 && (
            <TouchableOpacity style={styles.showMoreBtn} onPress={toggleOrders}>
              <Text style={styles.showMoreText}>{ordersExpanded ? "SHOW LESS" : "SHOW MORE"}</Text>
              <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                <Ionicons name="chevron-down" size={20} color={Theme.onSurfaceVariant} />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Account Actions ── */}
        <View style={styles.accountActionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={Theme.onSurface} />
            <Text style={styles.actionButtonText}>LOGOUT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-bin" size={20} color={Theme.error} />
            <Text style={styles.deleteButtonText}>DELETE ACCOUNT</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Delete Account Modal */}
      <Modal visible={deleteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <TouchableOpacity onPress={() => setDeleteModal(false)}>
                <Ionicons name="close" size={24} color={Theme.onSurfaceVariant} />
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

      {/* Vacation Selection Modal */}
      <Modal visible={vacationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vacation Dates</Text>
              <TouchableOpacity onPress={() => {
                setVacationModal(false);
                setIsVacationEnabled(vacations.length > 0);
              }}>
                <Ionicons name="close" size={24} color={Theme.onSurfaceVariant} />
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
                todayTextColor: Theme.primary,
                selectedDayBackgroundColor: Theme.primary,
                arrowColor: Theme.primary,
                textDayFontWeight: "600",
                textMonthFontWeight: "800",
              }}
            />
            <Button
              title="Save Dates"
              onPress={handleAddVacation}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 40,
  },
  
  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingTop: 24,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarGradient: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Theme.primary,
    padding: 4,
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 64,
    backgroundColor: Theme.surfaceContainerHighest,
    borderWidth: 4,
    borderColor: Theme.background,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cameraButton: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  userInfo: {
    alignItems: "center",
    marginTop: 12,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: Theme.onSurface,
    lineHeight: 34,
  },
  userEmail: {
    fontSize: 16,
    color: Theme.onSurfaceVariant,
    marginTop: 2,
  },

  // Edit Profile Section
  editProfileSection: {
    gap: 12,
  },
  editProfileToggle: {
    width: "100%",
    height: 48,
    backgroundColor: Theme.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  editProfileToggleText: {
    color: Theme.onPrimary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  editProfileFields: {
    backgroundColor: Theme.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.onSurfaceVariant,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputField: {
    width: "100%",
    height: 48,
    backgroundColor: Theme.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Theme.onSurface,
  },
  saveChangesBtn: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  saveChangesText: {
    color: Theme.primary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Shared Section Styles
  sectionContainer: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Theme.onSurface,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.primary,
    letterSpacing: 0.5,
  },

  // Cards & Lists
  cardBlock: {
    backgroundColor: Theme.surfaceContainerLowest,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.surfaceContainerHighest,
  },
  cardRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardRowText: {
    fontSize: 16,
    color: Theme.onSurface,
  },
  cardRowSubText: {
    fontSize: 12,
    color: Theme.onSurfaceVariant,
  },
  
  // Vacation Expand
  vacationDatesBox: {
    padding: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.outlineVariant,
  },
  vacationDateGrid: {
    flexDirection: "row",
    gap: 12,
  },
  vacationDateCol: {
    flex: 1,
    gap: 4,
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Theme.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.outlineVariant,
  },
  dateDisplayText: {
    fontSize: 16,
    color: Theme.onSurface,
  },
  vacationDisclaimer: {
    fontSize: 12,
    color: Theme.onSurfaceVariant,
    marginTop: 12,
    marginLeft: 4,
  },

  // Saved Addresses
  addressList: {
    gap: 12,
  },
  addressCard: {
    backgroundColor: Theme.surfaceContainerLowest,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addressCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.onSurface,
  },
  addressText: {
    fontSize: 12,
    color: Theme.onSurfaceVariant,
  },
  addressActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtnIcon: {
    padding: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Theme.onSurfaceVariant,
    fontStyle: "italic",
    paddingHorizontal: 4,
  },

  // Orders
  orderList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: Theme.surfaceContainerLowest,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orderCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  orderImageBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Theme.surfaceContainerHigh,
    overflow: "hidden",
  },
  orderImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  orderMeta: {
    flex: 1,
  },
  orderName: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.onSurface,
    marginBottom: 4,
  },
  orderStatusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  orderPrice: {
    fontSize: 20,
    fontWeight: "600",
    color: Theme.onSurfaceVariant,
  },
  showMoreBtn: {
    width: "100%",
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.onSurfaceVariant,
  },

  // Account Actions
  accountActionsSection: {
    paddingTop: 24,
    gap: 12,
  },
  actionButton: {
    width: "100%",
    height: 48,
    backgroundColor: Theme.surfaceContainerHigh,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.onSurface,
    letterSpacing: 0.5,
  },
  deleteButton: {
    width: "100%",
    height: 48,
    backgroundColor: Theme.errorContainer,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.error,
    letterSpacing: 0.5,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: Theme.onSurface },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Theme.surfaceContainerHighest,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalBody: { paddingBottom: 4 },
  deleteAccountHelp: {
    fontSize: 14,
    color: Theme.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
});
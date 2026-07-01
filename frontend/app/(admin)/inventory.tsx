import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import SwipeToConfirm from "../../src/components/SwipeToConfirm";
import { api } from "../../src/services/api";
import LoadingScreen from "../../src/components/LoadingScreen";
import { useAuth } from "../../src/contexts/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Warm Color Palette
const C = {
  primary:    "#FF9675",
  secondary:  "#FF9675",
  accent:     "#8B6854",
  light:      "#8B6854",
  dark:       "#BB6B3F",
  deep:       "#8B6854",
  bg:         "#FFF8EF",
  card:       "#FFE8D6",
  text:       "#3D1F0A",
  textMuted:  "#A07850",
  textLight:  "#C9A882",
  success:    "#22C55E",
  successBg:  "#F0FDF4",
  white:      "#FFFFFF",
  border:     "#FFE8C8",
  inputBg:    "#FFF8EF",
  chipBg:     "#FFF3DC",
  overlay:    "rgba(61,31,10,0.45)",
};

// ── Custom Alert Types
type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type AlertConfig = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

// ── Custom Alert Component
function CustomAlert({
  config,
  onDismiss,
}: {
  config: AlertConfig;
  onDismiss: () => void;
}) {
  if (!config.visible) return null;
  return (
    <Modal
      transparent
      animationType="fade"
      visible={config.visible}
      onRequestClose={onDismiss}
    >
      <View style={alertStyles.overlay}>
        <View style={alertStyles.box}>
          <View style={alertStyles.iconWrap}>
            <Ionicons
              name={
                config.buttons.some((b) => b.style === "destructive")
                  ? "warning-outline"
                  : "information-circle-outline"
              }
              size={28}
              color={
                config.buttons.some((b) => b.style === "destructive")
                  ? C.secondary
                  : C.dark
              }
            />
          </View>
          <Text style={alertStyles.title}>{config.title}</Text>
          {config.message ? (
            <Text style={alertStyles.message}>{config.message}</Text>
          ) : null}
          <View style={alertStyles.btnRow}>
            {config.buttons.map((btn, idx) => {
              const isDestructive = btn.style === "destructive";
              const isCancel = btn.style === "cancel";
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    alertStyles.btn,
                    isDestructive && alertStyles.btnDestructive,
                    isCancel && alertStyles.btnCancel,
                    config.buttons.length === 1 && { flex: 1 },
                  ]}
                  onPress={() => {
                    onDismiss();
                    btn.onPress?.();
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      alertStyles.btnText,
                      isDestructive && alertStyles.btnTextDestructive,
                      isCancel && alertStyles.btnTextCancel,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Alert Hook
function useCustomAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    buttons: [],
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: "OK", style: "default" }],
    });
  };

  const dismissAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));

  return { alertConfig, showAlert, dismissAlert };
}

// ── Snackbar
type SnackbarState = {
  visible: boolean;
  message: string;
  type: "success" | "error";
};

function Snackbar({ visible, message, type }: SnackbarState) {
  if (!visible) return null;
  const isSuccess = type === "success";
  return (
    <View
      style={[
        snackStyles.wrap,
        isSuccess ? snackStyles.successWrap : snackStyles.errorWrap,
      ]}
    >
      <Ionicons
        name={isSuccess ? "checkmark-circle" : "alert-circle"}
        size={18}
        color={isSuccess ? "#166534" : "#b91c1c"}
      />
      <Text
        style={[
          snackStyles.text,
          { color: isSuccess ? "#166534" : "#b91c1c" },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

// ── Types
type Product = {
  id?: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  mrp?: number;
  stock: number;
  image?: string | null;
  images?: string[];
  is_available: boolean;
  product_type?: string;
  dietary_preference?: string;
  description?: string;
  disclaimer?: string;
  customer_care?: string;
  seller_name?: string;
  seller_address?: string;
  shelf_life?: string;
};

type FormData = {
  name: string;
  category: string;
  unit: string;
  price: string;
  mrp: string;
  stock: string;
  image: string;
  image2: string;
  image3: string;
  product_type: string;
  dietary_preference: string;
  description: string;
  disclaimer: string;
  customer_care: string;
  seller_name: string;
  seller_address: string;
  shelf_life: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  category: "",
  unit: "",
  price: "",
  mrp: "",
  stock: "",
  image: "",
  image2: "",
  image3: "",
  product_type: "",
  dietary_preference: "",
  description: "",
  disclaimer: "",
  customer_care: "",
  seller_name: "",
  seller_address: "",
  shelf_life: "",
};

const CATEGORIES = [
  "milk",
  "dairy",
  "bakery",
  "fruits",
  "vegetables",
  "essentials",
];
// ── Fixed unit options — dairy-focused, dropdown/chip selection only (no free text)
const UNITS = ["ml", "L", "g", "kg"];
const DIETARY_OPTIONS = ["Veg", "Non-Veg", "Vegan", "Gluten-Free"];
const TABS = ["Details", "Highlights", "Information"];

// ── Animated Success Tick Component
function SuccessTick({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(1);
      checkScale.setValue(0);
      textOpacity.setValue(0);

      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 3,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => onDone());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[tickStyles.overlay, { opacity: opacityAnim }]}>
      <Animated.View
        style={[tickStyles.circle, { transform: [{ scale: scaleAnim }] }]}
      >
        <Animated.View style={{ transform: [{ scale: checkScale }] }}>
          <Ionicons name="checkmark-sharp" size={56} color={C.white} />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[tickStyles.text, { opacity: textOpacity }]}>
        Product Added!
      </Animated.Text>
    </Animated.View>
  );
}

const tickStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  circle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.success,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.success,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  text: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.3,
  },
});

// ══  MAIN SCREEN  ══
export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { alertConfig, showAlert, dismissAlert } = useCustomAlert();

  // ── Core State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // ── Snackbar State
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: "",
    type: "success",
  });

  const showSnackbar = useCallback((message: string, type: "success" | "error") => {
    setSnackbar({ visible: true, message, type });
  }, []);

  useEffect(() => {
    if (!snackbar.visible) return;
    const timer = setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, visible: false }));
    }, 2600);
    return () => clearTimeout(timer);
  }, [snackbar.visible]);

  // ── Add Modal State
  const [addModal, setAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM });
  const [showSuccessTick, setShowSuccessTick] = useState(false);

  // ── Detail / Edit Modal State
  const [detailModal, setDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<FormData>({ ...EMPTY_FORM });
  const [editTab, setEditTab] = useState(0);
  const [stockUpdating, setStockUpdating] = useState(false);
  const [showEditSuccessTick, setShowEditSuccessTick] = useState(false);

  // ── Fetch Data
  const fetchData = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // ── Image Picker Helper
  const pickImage = async (onPicked: (base64Uri: string) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        "Permission Required",
        "Gallery access is needed to pick a product image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      onPicked(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // ── Form Update Helpers
  const updateForm = (key: keyof FormData, val: string) =>
    setFormData((p) => ({ ...p, [key]: val }));

  const updateEditForm = (key: keyof FormData, val: string) =>
    setEditForm((p) => ({ ...p, [key]: val }));

  // ── Validation
  // Only Name and Price are required. Category, Unit, Image, and Stock
  // are all optional and can be filled in later by editing the product.
  const isFormValid = useMemo(() => {
    const price = parseFloat(formData.price);
    if (!formData.name.trim()) return false;
    if (!Number.isFinite(price) || price <= 0) return false;
    if (
      formData.stock.trim() &&
      !Number.isInteger(parseInt(formData.stock, 10))
    )
      return false;
    return true;
  }, [formData]);

  // Surface what's missing so the user knows what to fill in later —
  // shown as a soft hint, never blocks saving.
  const missingFieldsHint = useMemo(() => {
    const missing: string[] = [];
    if (!formData.category.trim()) missing.push("category");
    if (!formData.unit.trim()) missing.push("unit");
    if (!formData.image) missing.push("photo");
    return missing;
  }, [formData]);

  // ── Add Product
  const handleAddProduct = async () => {
    try {
      const images: string[] = [];
      if (formData.image2) images.push(formData.image2);
      if (formData.image3) images.push(formData.image3);

      await api.createProduct({
        name: formData.name,
        category: formData.category ? formData.category.toLowerCase() : undefined,
        unit: formData.unit || undefined,
        price: Number(formData.price),
        mrp: formData.mrp ? Number(formData.mrp) : Number(formData.price),
        stock: formData.stock.trim() ? Number(formData.stock) : 0,
        image: formData.image || undefined,
        images,
        image_type: "base64",
        product_type: formData.product_type || undefined,
        dietary_preference: formData.dietary_preference || undefined,
        description: formData.description || undefined,
        disclaimer: formData.disclaimer || undefined,
        customer_care: formData.customer_care || undefined,
        seller_name: formData.seller_name || undefined,
        seller_address: formData.seller_address || undefined,
        shelf_life: formData.shelf_life || undefined,
      });

      setShowSuccessTick(true);
    } catch (e: any) {
      const message = e?.message || "Could not add product";
      showAlert("Something went wrong", message);
      showSnackbar(message, "error");
    }
  };

  const onTickDone = () => {
    setShowSuccessTick(false);
    setAddModal(false);
    setFormData({ ...EMPTY_FORM });
    setActiveTab(0);
    showSnackbar("Product added successfully", "success");
    fetchData();
  };

  // ── Open Product Detail
  const openDetail = (product: Product) => {
    setSelectedProduct(product);
    setIsEditing(false);
    setDetailModal(true);
    setEditTab(0);
    setEditForm({
      name: product.name || "",
      category: product.category || "",
      unit: product.unit || "",
      price: String(product.price || ""),
      mrp: String(product.mrp || ""),
      stock: String(product.stock ?? ""),
      image: product.image || "",
      image2: product.images?.[0] || "",
      image3: product.images?.[1] || "",
      product_type: product.product_type || "",
      dietary_preference: product.dietary_preference || "",
      description: product.description || "",
      disclaimer: product.disclaimer || "",
      customer_care: product.customer_care || "",
      seller_name: product.seller_name || "",
      seller_address: product.seller_address || "",
      shelf_life: product.shelf_life || "",
    });
  };

  // ── Stock Increment / Decrement
  const adjustStock = async (delta: number) => {
    if (!selectedProduct?.id || stockUpdating) return;
    const newStock = Math.max(0, selectedProduct.stock + delta);
    setStockUpdating(true);
    try {
      await api.updateProduct(selectedProduct.id, { stock: newStock });
      setSelectedProduct((prev) =>
        prev ? { ...prev, stock: newStock } : prev,
      );
      setEditForm((prev) => ({ ...prev, stock: String(newStock) }));
      showSnackbar(`Stock updated to ${newStock}`, "success");
      fetchData();
    } catch (e: any) {
      const message = e?.message || "Could not update stock";
      showAlert("Update Failed", message);
      showSnackbar(message, "error");
    } finally {
      setStockUpdating(false);
    }
  };

  // ── Save Edited Product
  const handleSaveEdit = async () => {
    if (!selectedProduct?.id) return;
    try {
      const images: string[] = [];
      if (editForm.image2) images.push(editForm.image2);
      if (editForm.image3) images.push(editForm.image3);

      await api.updateProduct(selectedProduct.id, {
        name: editForm.name,
        category: editForm.category ? editForm.category.toLowerCase() : undefined,
        unit: editForm.unit || undefined,
        price: Number(editForm.price),
        mrp: editForm.mrp ? Number(editForm.mrp) : Number(editForm.price),
        stock: editForm.stock.trim() ? Number(editForm.stock) : 0,
        image: editForm.image || undefined,
        images,
        product_type: editForm.product_type || undefined,
        dietary_preference: editForm.dietary_preference || undefined,
        description: editForm.description || undefined,
        disclaimer: editForm.disclaimer || undefined,
        customer_care: editForm.customer_care || undefined,
        seller_name: editForm.seller_name || undefined,
        seller_address: editForm.seller_address || undefined,
        shelf_life: editForm.shelf_life || undefined,
      });
      setShowEditSuccessTick(true);
    } catch (e: any) {
      const message = e?.message || "Could not update product";
      showAlert("Update Failed", message);
      showSnackbar(message, "error");
    }
  };

  const onEditTickDone = () => {
    setShowEditSuccessTick(false);
    setDetailModal(false);
    setIsEditing(false);
    setSelectedProduct(null);
    showSnackbar("Product updated successfully", "success");
    fetchData();
  };

  // ── Toggle Availability
  const toggleAvailability = async (product: Product) => {
    const nextState = !product.is_available;
    showAlert(
      nextState ? "Make Product Available?" : "Make Product Unavailable?",
      nextState
        ? `${product.name} will be visible for orders.`
        : `${product.name} will be hidden from orders.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextState ? "Make Available" : "Make Unavailable",
          style: "default",
          onPress: async () => {
            try {
              await api.updateProduct(product.id!, { is_available: nextState });
              if (selectedProduct?.id === product.id) {
                setSelectedProduct((prev) =>
                  prev ? { ...prev, is_available: nextState } : prev,
                );
              }
              showSnackbar(
                nextState
                  ? `${product.name} is now available`
                  : `${product.name} is now unavailable`,
                "success",
              );
              fetchData();
            } catch (e: any) {
              const message = e?.message || "Could not update availability";
              showAlert("Update Failed", message);
              showSnackbar(message, "error");
            }
          },
        },
      ],
    );
  };

  // ── Delete Product
  const deleteProduct = (id?: string) => {
    if (!id) return;
    showAlert(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await api.deleteProduct(id);
            setDetailModal(false);
            setSelectedProduct(null);
            showSnackbar("Product deleted", "success");
            fetchData();
          },
        },
      ],
    );
  };

  // ── Reset Modals
  const resetAddModal = () => {
    setAddModal(false);
    setFormData({ ...EMPTY_FORM });
    setActiveTab(0);
  };

  const resetDetailModal = () => {
    setDetailModal(false);
    setSelectedProduct(null);
    setIsEditing(false);
    setEditTab(0);
  };

  if (loading) return <LoadingScreen />;

  const available = products.filter((p) => p.is_available).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  // ── Render Form Tabs (shared for Add & Edit)
  const renderFormTab = (
    tab: number,
    data: FormData,
    update: (key: keyof FormData, val: string) => void,
  ) => {
    if (tab === 0) {
      return (
        <View>
          <Text style={styles.sectionHeader}>Product Images</Text>
          <TouchableOpacity
            style={styles.thumbnailPicker}
            onPress={() => pickImage((uri) => update("image", uri))}
          >
            {data.image ? (
              <Image source={{ uri: data.image }} style={styles.thumbnailImage} />
            ) : (
              <View style={styles.thumbnailEmpty}>
                <View style={styles.thumbnailIconCircle}>
                  <Ionicons name="camera" size={24} color={C.dark} />
                </View>
                <Text style={styles.thumbnailLabel}>Add Thumbnail</Text>
                <Text style={styles.thumbnailSub}>Main product image</Text>
              </View>
            )}
            {data.image ? (
              <View style={styles.thumbnailEditBadge}>
                <Ionicons name="pencil" size={12} color={C.white} />
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.additionalImagesRow}>
            <TouchableOpacity
              style={styles.additionalImagePicker}
              onPress={() => pickImage((uri) => update("image2", uri))}
            >
              {data.image2 ? (
                <Image source={{ uri: data.image2 }} style={styles.additionalImage} />
              ) : (
                <View style={styles.additionalImageEmpty}>
                  <Ionicons name="add-circle-outline" size={22} color={C.textLight} />
                  <Text style={styles.additionalImageText}>Image 2</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.additionalImagePicker}
              onPress={() => pickImage((uri) => update("image3", uri))}
            >
              {data.image3 ? (
                <Image source={{ uri: data.image3 }} style={styles.additionalImage} />
              ) : (
                <View style={styles.additionalImageEmpty}>
                  <Ionicons name="add-circle-outline" size={22} color={C.textLight} />
                  <Text style={styles.additionalImageText}>Image 3</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Product Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Full Cream Milk"
            placeholderTextColor={C.textLight}
            value={data.name}
            onChangeText={(v) => update("name", v)}
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  data.category === cat && styles.catChipActive,
                ]}
                onPress={() => update("category", cat)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    data.category === cat && styles.catChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>MRP (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={C.textLight}
                keyboardType="numeric"
                value={data.mrp}
                onChangeText={(v) => update("mrp", v)}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Selling Price (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={C.textLight}
                keyboardType="numeric"
                value={data.price}
                onChangeText={(v) => update("price", v)}
              />
            </View>
          </View>

          {/* ── Unit: fixed dropdown/chip selection (ml, L, g, kg) — no free text ── */}
          <Text style={styles.fieldLabel}>Unit</Text>
          <View style={styles.unitGrid}>
            {UNITS.map((u) => {
              const isActive = data.unit === u;
              return (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, isActive && styles.unitChipActive]}
                  onPress={() => update("unit", u)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      isActive && styles.unitChipTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Stock (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={C.textLight}
            keyboardType="numeric"
            value={data.stock}
            onChangeText={(v) => update("stock", v)}
          />
        </View>
      );
    }

    if (tab === 1) {
      return (
        <View>
          <Text style={styles.sectionHeader}>Product Highlights</Text>

          <Text style={styles.fieldLabel}>Product Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Organic, Fresh, Pasteurized"
            placeholderTextColor={C.textLight}
            value={data.product_type}
            onChangeText={(v) => update("product_type", v)}
          />

          <Text style={styles.fieldLabel}>Dietary Preference</Text>
          <View style={styles.dietaryGrid}>
            {DIETARY_OPTIONS.map((opt) => {
              const isActive = data.dietary_preference === opt;
              const icon =
                opt === "Veg"
                  ? "leaf"
                  : opt === "Non-Veg"
                    ? "restaurant"
                    : opt === "Vegan"
                      ? "nutrition"
                      : "fitness";
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.dietaryChip,
                    isActive && styles.dietaryChipActive,
                  ]}
                  onPress={() =>
                    update("dietary_preference", isActive ? "" : opt)
                  }
                >
                  <Ionicons
                    name={icon as any}
                    size={16}
                    color={isActive ? C.dark : C.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.dietaryChipText,
                      isActive && styles.dietaryChipTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.sectionHeader}>Product Information</Text>

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your product..."
          placeholderTextColor={C.textLight}
          value={data.description}
          onChangeText={(v) => update("description", v)}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Disclaimer</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any legal disclaimers..."
          placeholderTextColor={C.textLight}
          value={data.disclaimer}
          onChangeText={(v) => update("disclaimer", v)}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Customer Care Details</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. +91 9876543210"
          placeholderTextColor={C.textLight}
          value={data.customer_care}
          onChangeText={(v) => update("customer_care", v)}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Seller Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Seller / Brand"
              placeholderTextColor={C.textLight}
              value={data.seller_name}
              onChangeText={(v) => update("seller_name", v)}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Shelf Life</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 7 days"
              placeholderTextColor={C.textLight}
              value={data.shelf_life}
              onChangeText={(v) => update("shelf_life", v)}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Seller Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Full seller address..."
          placeholderTextColor={C.textLight}
          value={data.seller_address}
          onChangeText={(v) => update("seller_address", v)}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>
    );
  };

  // ── Tab Bar Component
  const renderTabBar = (
    tabs: string[],
    active: number,
    onSelect: (i: number) => void,
  ) => (
    <View style={styles.tabBar}>
      {tabs.map((t, i) => (
        <TouchableOpacity
          key={t}
          style={[styles.tab, active === i && styles.tabActive]}
          onPress={() => onSelect(i)}
        >
          <Text style={[styles.tabText, active === i && styles.tabTextActive]}>
            {t}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Render Product Detail (View Mode)
  const renderProductDetail = () => {
    if (!selectedProduct) return null;
    const p = selectedProduct;
    const allImages = [p.image, ...(p.images || [])].filter(Boolean) as string[];
    const hasMrp = p.mrp && p.mrp > p.price;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {allImages.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.detailImageGallery}
          >
            {allImages.map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: img }}
                style={styles.detailGalleryImage}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.detailNoImage}>
            <Ionicons name="cube-outline" size={48} color={C.textLight} />
          </View>
        )}
        {allImages.length > 1 && (
          <View style={styles.dotRow}>
            {allImages.map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        )}

        <View style={styles.detailSection}>
          <Text style={styles.detailName}>{p.name}</Text>
          <View style={styles.detailPriceRow}>
            <Text style={styles.detailPrice}>₹{p.price}</Text>
            {hasMrp && <Text style={styles.detailMrp}>₹{p.mrp}</Text>}
            {hasMrp && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(((p.mrp! - p.price) / p.mrp!) * 100)}% OFF
                </Text>
              </View>
            )}
          </View>
          <View style={styles.detailMetaRow}>
            {p.category ? (
              <View style={styles.metaChip}>
                <Ionicons name="pricetag-outline" size={12} color={C.dark} />
                <Text style={styles.metaChipText}>{p.category}</Text>
              </View>
            ) : null}
            {p.unit ? (
              <View style={styles.metaChip}>
                <Ionicons name="scale-outline" size={12} color={C.dark} />
                <Text style={styles.metaChipText}>{p.unit}</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.metaChip,
                { backgroundColor: p.is_available ? C.successBg : "#FFF0F0" },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: p.is_available ? C.success : "#FF6B6B" },
                ]}
              />
              <Text
                style={[
                  styles.metaChipText,
                  { color: p.is_available ? "#16A34A" : "#DC2626" },
                ]}
              >
                {p.is_available ? "Available" : "Unavailable"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.stockControlCard}>
          <View>
            <Text style={styles.stockControlLabel}>Current Stock</Text>
            <Text style={styles.stockControlSub}>Adjust product quantity</Text>
          </View>
          <View style={styles.stockControlBtns}>
            <TouchableOpacity
              style={styles.stockBtn}
              onPress={() => adjustStock(-1)}
              disabled={stockUpdating || p.stock <= 0}
            >
              <Ionicons
                name="remove"
                size={20}
                color={p.stock <= 0 ? C.textLight : C.dark}
              />
            </TouchableOpacity>
            <View style={styles.stockDisplay}>
              <Text style={styles.stockDisplayVal}>{p.stock}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stockBtn, styles.stockBtnAdd]}
              onPress={() => adjustStock(1)}
              disabled={stockUpdating}
            >
              <Ionicons name="add" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>

        {(p.product_type || p.dietary_preference) && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>
              <Ionicons name="star-outline" size={14} color={C.dark} /> Highlights
            </Text>
            {p.product_type ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product Type</Text>
                <Text style={styles.infoValue}>{p.product_type}</Text>
              </View>
            ) : null}
            {p.dietary_preference ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dietary</Text>
                <View style={[styles.metaChip, { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="leaf" size={12} color="#16A34A" />
                  <Text style={[styles.metaChipText, { color: "#16A34A" }]}>
                    {p.dietary_preference}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {(p.description ||
          p.disclaimer ||
          p.customer_care ||
          p.seller_name ||
          p.shelf_life) && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>
              <Ionicons name="information-circle-outline" size={14} color={C.dark} /> Information
            </Text>
            {p.description ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValueMultiline}>{p.description}</Text>
              </View>
            ) : null}
            {p.shelf_life ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Shelf Life</Text>
                <Text style={styles.infoValue}>{p.shelf_life}</Text>
              </View>
            ) : null}
            {p.seller_name ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Seller</Text>
                <Text style={styles.infoValue}>{p.seller_name}</Text>
              </View>
            ) : null}
            {p.seller_address ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Seller Address</Text>
                <Text style={styles.infoValueMultiline}>{p.seller_address}</Text>
              </View>
            ) : null}
            {p.customer_care ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer Care</Text>
                <Text style={styles.infoValue}>{p.customer_care}</Text>
              </View>
            ) : null}
            {p.disclaimer ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Disclaimer</Text>
                <Text style={styles.infoValueMultiline}>{p.disclaimer}</Text>
              </View>
            ) : null}
          </View>
        )}

        {isAdmin && (
          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.detailEditBtn}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={18} color={C.white} />
              <Text style={styles.detailEditBtnText}>Edit Product</Text>
            </TouchableOpacity>

            <View style={styles.detailSmallBtnsRow}>
              <TouchableOpacity
                style={[
                  styles.detailSmallBtn,
                  {
                    backgroundColor: selectedProduct?.is_available
                      ? "#FFF0F0"
                      : C.successBg,
                  },
                ]}
                onPress={() => toggleAvailability(selectedProduct!)}
              >
                <Ionicons
                  name={
                    selectedProduct?.is_available
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={16}
                  color={selectedProduct?.is_available ? "#DC2626" : C.success}
                />
                <Text
                  style={[
                    styles.detailSmallBtnText,
                    {
                      color: selectedProduct?.is_available
                        ? "#DC2626"
                        : C.success,
                    },
                  ]}
                >
                  {selectedProduct?.is_available
                    ? "Mark Unavailable"
                    : "Mark Available"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.detailSmallBtn, { backgroundColor: "#FFF0F0" }]}
                onPress={() => deleteProduct(selectedProduct?.id)}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={[styles.detailSmallBtnText, { color: "#DC2626" }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  // ══  MAIN RENDER  ══
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />

      {/* ── Snackbar ── */}
      <View
        pointerEvents="none"
        style={[styles.snackbarWrap, { top: insets.top + 10 }]}
      >
        <Snackbar {...snackbar} />
      </View>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>
            {products.length} products · {available} available
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddModal(true)}
          >
            <Ionicons name="add" size={22} color={C.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Summary Strip ── */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{products.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: C.success }]}>
            {available}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: "#F59E0B" }]}>
            {lowStock}
          </Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: C.secondary }]}>
            {products.length - available}
          </Text>
          <Text style={styles.summaryLabel}>Inactive</Text>
        </View>
      </View>

      {/* ── Order Summary Card ── */}
      <TouchableOpacity
        style={styles.orderSummaryCard}
        activeOpacity={0.82}
        onPress={() => router.push("/(admin)/order-summary" as any)}
      >
        <View style={styles.orderSummaryLeft}>
          <View style={styles.orderSummaryIcon}>
            <Ionicons name="receipt-outline" size={20} color={C.dark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderSummaryTitle}>Product Order Summary</Text>
            <Text style={styles.orderSummarySub}>
              Check today orders by Milk, Paneer or any inventory product
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.dark} />
      </TouchableOpacity>

      {/* ── Product List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary, C.accent]}
          />
        }
        contentContainerStyle={styles.listContent}
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={48} color={C.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptyDesc}>Tap + to add your first product</Text>
          </View>
        ) : (
          products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              activeOpacity={0.7}
              onPress={() => openDetail(product)}
            >
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="cube-outline" size={22} color={C.textLight} />
                </View>
              )}

              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>
                <View style={styles.productPriceRow}>
                  <Text style={styles.productPrice}>₹{product.price}</Text>
                  {product.mrp && product.mrp > product.price && (
                    <Text style={styles.productMrp}>₹{product.mrp}</Text>
                  )}
                </View>
                <Text style={styles.productMeta}>
                  {product.unit || product.category
                    ? [product.unit, product.category].filter(Boolean).join(" · ")
                    : "Details pending"}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: product.is_available
                        ? C.successBg
                        : "#FFF0F0",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: product.is_available
                          ? C.success
                          : "#FF6B6B",
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: product.is_available ? "#16A34A" : "#DC2626" },
                    ]}
                  >
                    {product.is_available ? "Available" : "Unavailable"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.stockBadge,
                  product.stock <= 5 &&
                    product.stock > 0 && { backgroundColor: "#FFF8E1" },
                  product.stock === 0 && { backgroundColor: "#FFF0F0" },
                ]}
              >
                <Text
                  style={[
                    styles.stockVal,
                    product.stock <= 5 &&
                      product.stock > 0 && { color: "#F59E0B" },
                    product.stock === 0 && { color: "#DC2626" },
                  ]}
                >
                  {product.stock}
                </Text>
                <Text style={styles.stockLabel}>stock</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={16}
                color={C.textLight}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── ADD PRODUCT MODAL (Tabbed) ── */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={resetAddModal}>
                <Ionicons name="close" size={16} color={C.deep} />
              </TouchableOpacity>
            </View>

            {renderTabBar(TABS, activeTab, setActiveTab)}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {renderFormTab(activeTab, formData, updateForm)}

              <View style={{ height: 16 }} />

              {isFormValid && missingFieldsHint.length > 0 && (
                <View style={styles.hintBanner}>
                  <Ionicons name="information-circle-outline" size={16} color={C.dark} />
                  <Text style={styles.hintBannerText}>
                    You can add {missingFieldsHint.join(", ")} later by editing this product.
                  </Text>
                </View>
              )}

              {isFormValid && (
                <View style={styles.swipeWrapper}>
                  <SwipeToConfirm
                    text="Swipe to Add Product"
                    disabled={!isFormValid}
                    onSwipeSuccess={handleAddProduct}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={resetAddModal}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>

            <SuccessTick visible={showSuccessTick} onDone={onTickDone} />
          </View>
        </View>
      </Modal>

      {/* ── PRODUCT DETAIL / EDIT MODAL ── */}
      <Modal visible={detailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "95%" }]}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? "Edit Product" : "Product Details"}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {isEditing && (
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: C.successBg }]}
                    onPress={() => setIsEditing(false)}
                  >
                    <Ionicons name="eye-outline" size={16} color={C.success} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={resetDetailModal}
                >
                  <Ionicons name="close" size={16} color={C.deep} />
                </TouchableOpacity>
              </View>
            </View>

            {isEditing ? (
              <>
                {renderTabBar(TABS, editTab, setEditTab)}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {renderFormTab(editTab, editForm, updateEditForm)}

                  <View style={{ height: 16 }} />

                  <View style={styles.swipeWrapper}>
                    <SwipeToConfirm
                      text="Swipe to Save Changes"
                      onSwipeSuccess={handleSaveEdit}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel Editing</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : (
              renderProductDetail()
            )}

            <SuccessTick
              visible={showEditSuccessTick}
              onDone={onEditTickDone}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ══  ALERT STYLES  ══
const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  box: {
    width: "100%",
    backgroundColor: C.bg,
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: C.text,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    fontWeight: "500",
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
  },
  btnCancel: { backgroundColor: C.chipBg },
  btnDestructive: { backgroundColor: C.secondary },
  btnText: { fontSize: 14, fontWeight: "700", color: C.dark },
  btnTextCancel: { color: C.textMuted },
  btnTextDestructive: { color: C.text },
});

// ══  SNACKBAR STYLES  ══
const snackStyles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    borderWidth: 1,
  },
  successWrap: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  errorWrap: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
});

// ══  SCREEN STYLES  ══
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ── Snackbar
  snackbarWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 60,
  },

  // ── Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: C.textLight,
    marginTop: 2,
    fontWeight: "500",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.dark,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.dark,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Summary Strip
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: C.card,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryVal: { fontSize: 20, fontWeight: "800", color: C.text },
  summaryLabel: {
    fontSize: 10,
    color: C.textLight,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryDivider: { width: 1, backgroundColor: C.border },

  // ── Order Summary Card
  orderSummaryCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderSummaryLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderSummaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  orderSummaryTitle: { fontSize: 14, fontWeight: "800", color: C.text },
  orderSummarySub: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 16,
  },

  // ── Product List
  listContent: { paddingHorizontal: 16 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 10,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  productImage: { width: 56, height: 56, borderRadius: 14 },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: C.chipBg,
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: { flex: 1, gap: 2 },
  productName: { fontSize: 15, fontWeight: "700", color: C.text },
  productPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  productPrice: { fontSize: 14, fontWeight: "800", color: C.dark },
  productMrp: {
    fontSize: 12,
    fontWeight: "500",
    color: C.textLight,
    textDecorationLine: "line-through",
  },
  productMeta: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },

  stockBadge: {
    alignItems: "center",
    backgroundColor: C.chipBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 44,
  },
  stockVal: { fontSize: 16, fontWeight: "800", color: C.dark },
  stockLabel: { fontSize: 9, color: C.textMuted, fontWeight: "600" },

  // ── Empty State
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.textMuted },
  emptyDesc: { fontSize: 13, color: C.textLight },

  // ── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "92%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: C.light,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.chipBg,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.inputBg,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: C.dark },
  tabText: { fontSize: 13, fontWeight: "600", color: C.textMuted },
  tabTextActive: { color: C.white, fontWeight: "700" },

  // ── Form Fields
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 12,
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: C.inputBg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  textArea: { minHeight: 70, paddingTop: 14 },
  row: { flexDirection: "row" },

  // ── Thumbnail Picker
  thumbnailPicker: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: "dashed",
    position: "relative",
  },
  thumbnailImage: { width: "100%", height: 170, borderRadius: 14 },
  thumbnailEmpty: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.inputBg,
  },
  thumbnailIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  thumbnailLabel: { fontSize: 14, fontWeight: "700", color: C.textMuted },
  thumbnailSub: { fontSize: 12, color: C.textLight },
  thumbnailEditBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.dark,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Additional Images
  additionalImagesRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  additionalImagePicker: {
    flex: 1,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  additionalImage: { width: "100%", height: "100%", borderRadius: 10 },
  additionalImageEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.inputBg,
    gap: 4,
  },
  additionalImageText: { fontSize: 11, color: C.textLight, fontWeight: "500" },

  // ── Category Chips
  categoryRow: { marginBottom: 16 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.chipBg,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  catChipActive: { backgroundColor: C.primary + "25", borderColor: C.primary },
  catChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
    textTransform: "capitalize",
  },
  catChipTextActive: { color: C.dark },

  // ── Unit Chips (dropdown-style fixed selection: ml, L, g, kg)
  unitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  unitChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.border,
    minWidth: 64,
    alignItems: "center",
  },
  unitChipActive: {
    backgroundColor: C.primary + "20",
    borderColor: C.primary,
  },
  unitChipText: { fontSize: 14, fontWeight: "700", color: C.textMuted },
  unitChipTextActive: { color: C.dark },

  // ── Missing-fields soft hint (shown above swipe-to-add when optional fields are blank)
  hintBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.chipBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  hintBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted,
    lineHeight: 17,
  },

  // ── Dietary Grid
  dietaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  dietaryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  dietaryChipActive: {
    backgroundColor: C.primary + "20",
    borderColor: C.primary,
  },
  dietaryChipText: { fontSize: 13, fontWeight: "600", color: C.textMuted },
  dietaryChipTextActive: { color: C.dark },

  // ── Swipe / Cancel
  swipeWrapper: { marginBottom: 12, alignItems: "center" },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: C.textMuted },

  // ── Detail Modal — Image Gallery
  detailImageGallery: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
  },
  detailGalleryImage: {
    width: SCREEN_WIDTH - 48,
    height: 220,
    borderRadius: 16,
    marginRight: 8,
  },
  detailNoImage: {
    height: 160,
    borderRadius: 16,
    backgroundColor: C.inputBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textLight },

  // ── Detail Sections
  detailSection: {
    backgroundColor: C.inputBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailName: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 6,
  },
  detailPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  detailPrice: { fontSize: 22, fontWeight: "800", color: C.dark },
  detailMrp: {
    fontSize: 16,
    fontWeight: "500",
    color: C.textLight,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: { fontSize: 11, fontWeight: "800", color: "#D97706" },

  detailMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.chipBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.dark,
    textTransform: "capitalize",
  },

  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoLabel: { fontSize: 13, fontWeight: "600", color: C.textMuted },
  infoValue: { fontSize: 13, fontWeight: "700", color: C.text },
  infoBlock: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoValueMultiline: {
    fontSize: 13,
    fontWeight: "500",
    color: C.text,
    lineHeight: 20,
    marginTop: 4,
  },

  // ── Stock Controls
  stockControlCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  stockControlLabel: { fontSize: 14, fontWeight: "700", color: C.text },
  stockControlSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  stockControlBtns: { flexDirection: "row", alignItems: "center", gap: 0 },
  stockBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  stockBtnAdd: { backgroundColor: C.dark, borderColor: C.dark },
  stockDisplay: {
    minWidth: 50,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
  },
  stockDisplayVal: { fontSize: 18, fontWeight: "800", color: C.text },

  // ── Detail Action Buttons
  detailActions: { paddingHorizontal: 4, gap: 10, marginTop: 4 },
  detailEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.dark,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  detailEditBtnText: { fontSize: 15, fontWeight: "700", color: C.white },
  detailSmallBtnsRow: { flexDirection: "row", gap: 10 },
  detailSmallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailSmallBtnText: { fontSize: 13, fontWeight: "600" },
});
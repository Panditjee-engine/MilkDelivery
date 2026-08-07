import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "../../src/services/api";

type Product = {
  id?: string;
  _id?: string;
  name: string;
  unit?: string;
  price?: number;
};

type OrderItem = {
  product_name?: string;
  product_id?: string;
  product?: { id?: string; _id?: string; name?: string };
  id?: string;
  _id?: string;
  name?: string;
  quantity?: number | string;
  price?: number;
  amount?: number;
  total?: number;
  total_amount?: number;
};

type Order = {
  id: string;
  status?: string;
  delivery_date?: string;
  delivery_slot?: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount?: number;
  total?: number;
  items?: OrderItem[];
  address?: any;
};

const C = {
  bg: "#FFF8F4",
  card: "#FFFFFF",
  text: "#3D1F0A",
  muted: "#8B6854",
  light: "#C9A882",
  primary: "#FF9675",
  dark: "#BB6B3F",
  soft: "#FFF3DC",
  border: "#FFE1CC",
};

const getLocalDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getTomorrowDateKey = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return getLocalDateKey(date);
};

const getOrderDateKey = (date?: string) => {
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return getLocalDateKey(parsed);
};

const dateFromKey = (dateKey?: string) => {
  if (!dateKey) return new Date();
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const STATUS_FILTERS = ["ALL", "PENDING", "DELIVERED"] as const;
const DATE_FILTERS = ["ALL", "TODAY", "TOMORROW", "CUSTOM"] as const;

const productId = (product?: Product) => product?.id || product?._id || "";
const itemName = (item: OrderItem) =>
  item.product_name || item.product?.name || item.name || "Product";
const itemProductId = (item: OrderItem) =>
  item.product_id ||
  item.product?.id ||
  item.product?._id ||
  item.id ||
  item._id ||
  "";
const qty = (item: OrderItem) => {
  const raw = item.quantity;
  const value = Number.parseFloat(String(raw ?? ""));
  return Number.isFinite(value) && value > 0 ? value : 1;
};
const formatQuantity = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");

const parseUnitDescriptor = (unit?: string) => {
  const text = String(unit || "").trim().toLowerCase();
  const match = text.match(
    /(\d+(?:\.\d+)?)?\s*(ml|milliliter|millilitre|l|ltr|liter|litre|g|gm|gram|kg|kilogram|pc|pcs|piece|pieces|unit|units)/,
  );
  if (!match) return null;
  const size = Number.parseFloat(match[1] || "1");
  const token = match[2];
  if (["ml", "milliliter", "millilitre"].includes(token)) {
    return { kind: "volume", packSize: size };
  }
  if (["l", "ltr", "liter", "litre"].includes(token)) {
    return { kind: "volume", packSize: size * 1000 };
  }
  if (["g", "gm", "gram"].includes(token)) {
    return { kind: "weight", packSize: size };
  }
  if (["kg", "kilogram"].includes(token)) {
    return { kind: "weight", packSize: size * 1000 };
  }
  return { kind: "count", packSize: size };
};

const formatBaseMetric = (amount: number, kind?: string) => {
  if (kind === "volume") {
    return amount >= 1000
      ? `${formatQuantity(amount / 1000)} L`
      : `${formatQuantity(amount)} ml`;
  }
  if (kind === "weight") {
    return amount >= 1000
      ? `${formatQuantity(amount / 1000)} kg`
      : `${formatQuantity(amount)} g`;
  }
  return `${formatQuantity(amount)} qty`;
};

const formatPackedQuantity = (quantity: number, unit?: string) => {
  const parsed = parseUnitDescriptor(unit);
  if (!parsed) return `${formatQuantity(quantity)} ${unit || "qty"}`;
  const total = quantity * parsed.packSize;
  const hasPackSize = /\d/.test(String(unit || ""));
  const totalText = formatBaseMetric(total, parsed.kind);
  return hasPackSize
    ? `${formatQuantity(quantity)} x ${unit} = ${totalText}`
    : totalText;
};
const normalizeName = (value: string) => value.trim().toLowerCase();

const matchesProduct = (
  item: OrderItem,
  product: string,
  productMeta?: Product,
) => {
  if (product === "All") return true;
  const metaId = productId(productMeta);
  const itemId = itemProductId(item);
  if (metaId && itemId && metaId === itemId) return true;
  const itemValue = normalizeName(itemName(item));
  const productValue = normalizeName(product);
  const metaValue = normalizeName(productMeta?.name || product);
  return (
    itemValue === productValue ||
    itemValue === metaValue ||
    itemValue.includes(productValue) ||
    productValue.includes(itemValue) ||
    itemValue.includes(metaValue) ||
    metaValue.includes(itemValue)
  );
};

const addressText = (order: Order) => {
  const a = order.address;
  if (!a) return "Address not available";
  if (typeof a === "string") return a.trim() || "Address not available";
  const full = [
    a.full_address,
    a.address,
    a.line1,
    a.line2,
    a.flat,
    a.house,
    a.house_no,
    a.building,
    a.tower,
    a.floor,
    a.society,
    a.area,
    a.landmark,
    a.city,
    a.state,
    a.pincode,
    a.pin_code,
  ]
    .filter(Boolean)
    .join(", ");
  return full || "Address not available";
};

const orderAmount = (order: Order) => Number(order.total_amount || order.total || 0);

const orderProductTitle = (items: OrderItem[]) => {
  if (!items.length) return "Product details";
  const first = itemName(items[0]);
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
};

export default function AdminOrderSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("All");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [dateFilter, setDateFilter] =
    useState<(typeof DATE_FILTERS)[number]>("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [datePickerTarget, setDatePickerTarget] = useState<
    "start" | "end" | null
  >(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const todayKey = getLocalDateKey();

  const fetchData = useCallback(async () => {
    try {
      const [productsData, ordersData] = await Promise.all([
        api.getProducts(),
        api.getAllOrders(),
      ]);
      setProducts(productsData);
      setOrders(ordersData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const dateParam = Array.isArray(params.date) ? params.date[0] : params.date;
    if (!dateParam) return;
    const key = getOrderDateKey(dateParam);
    if (!key) return;
    if (key === getLocalDateKey()) {
      setDateFilter("TODAY");
      setCustomStartDate("");
      setCustomEndDate("");
      return;
    }
    if (key === getTomorrowDateKey()) {
      setDateFilter("TOMORROW");
      setCustomStartDate("");
      setCustomEndDate("");
      return;
    }
    setDateFilter("CUSTOM");
    setCustomStartDate(key);
    setCustomEndDate(key);
  }, [params.date]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const productTabs = useMemo(
    () => [
      { id: "all", name: "All" },
      ...products.map((p) => ({ id: p.id || p._id || p.name, name: p.name })),
    ],
    [products],
  );

  const customerOptions = useMemo(() => {
    const names = orders
      .map(
        (order) =>
          order.customer_name || order.customer_phone || "Unknown Customer",
      )
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(names))];
  }, [orders]);

  const selectedProductMeta = products.find((p) => {
    const productValue = normalizeName(p.name);
    const selectedValue = normalizeName(selectedProduct);
    return (
      productValue === selectedValue ||
      productValue.includes(selectedValue) ||
      selectedValue.includes(productValue)
    );
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = order.status?.toLowerCase();
      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "DELIVERED"
          ? status === "delivered"
          : status !== "delivered" && status !== "cancelled");
      const customerMatch =
        selectedCustomer === "ALL" ||
        order.customer_name === selectedCustomer ||
        order.customer_phone === selectedCustomer;
      const dateMatch =
        dateFilter === "ALL" ||
        (dateFilter === "CUSTOM"
          ? (!customStartDate ||
              getOrderDateKey(order.delivery_date) >= customStartDate) &&
            (!customEndDate ||
              getOrderDateKey(order.delivery_date) <= customEndDate)
          : getOrderDateKey(order.delivery_date) ===
            (dateFilter === "TODAY"
              ? getLocalDateKey()
              : getTomorrowDateKey()));
      const productMatch =
        selectedProduct === "All" ||
        order.items?.some((item) =>
          matchesProduct(item, selectedProduct, selectedProductMeta),
        );

      return statusMatch && customerMatch && dateMatch && productMatch;
    });
  }, [
    customEndDate,
    customStartDate,
    dateFilter,
    orders,
    selectedCustomer,
    selectedProduct,
    selectedProductMeta,
    statusFilter,
  ]);

  const activeFilterCount = [
    statusFilter !== "ALL",
    dateFilter !== "ALL",
    selectedCustomer !== "ALL",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatusFilter("ALL");
    setDateFilter("ALL");
    setSelectedCustomer("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
    setDatePickerTarget(null);
    setCustomerDropdownOpen(false);
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrderIds((current) => ({
      ...current,
      [orderId]: !current[orderId],
    }));
  };

  const handleCustomDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setDatePickerTarget(null);
    if (!selectedDate || !datePickerTarget) return;
    const dateKey = getLocalDateKey(selectedDate);
    if (datePickerTarget === "start") {
      setCustomStartDate(dateKey);
      if (customEndDate && dateKey > customEndDate) setCustomEndDate(dateKey);
    } else {
      setCustomEndDate(dateKey);
      if (customStartDate && dateKey < customStartDate)
        setCustomStartDate(dateKey);
    }
  };

  const summary = useMemo(() => {
    let quantity = 0;
    let amount = 0;
    filteredOrders.forEach((order) => {
      if (selectedProduct === "All") {
        amount += Number(order.total_amount || order.total || 0);
        order.items?.forEach((item) => {
          quantity += qty(item);
        });
      } else {
        order.items?.forEach((item) => {
          if (!matchesProduct(item, selectedProduct, selectedProductMeta))
            return;
          const itemQty = qty(item);
          quantity += itemQty;
          amount +=
            Number(item.amount || item.total_amount || item.total || 0) ||
            Number(item.price || selectedProductMeta?.price || 0) * itemQty;
        });
      }
    });
    return { quantity, amount };
  }, [filteredOrders, selectedProduct, selectedProductMeta?.price]);

  const unit =
    selectedProduct === "All"
      ? "items"
      : selectedProductMeta?.unit ||
        (selectedProduct.toLowerCase().includes("milk") ? "L" : "qty");

  const renderOrder = ({ item }: { item: Order }) => {
    const visibleItems =
      selectedProduct === "All"
        ? item.items || []
        : (item.items || []).filter((orderItem) =>
            matchesProduct(orderItem, selectedProduct, selectedProductMeta),
          );
    const expanded = expandedOrderIds[item.id] === true;
    const totalQty = visibleItems.reduce((sum, orderItem) => sum + qty(orderItem), 0);
    const productTitle = orderProductTitle(visibleItems);
    const itemUnit = (orderItem: OrderItem) => {
      const id = itemProductId(orderItem);
      const meta = products.find(
        (product) =>
          productId(product) === id ||
          normalizeName(product.name) === normalizeName(itemName(orderItem)),
      );
      return meta?.unit || (selectedProduct === "All" ? undefined : unit);
    };

    return (
      <TouchableOpacity
        style={s.orderCard}
        activeOpacity={0.86}
        onPress={() => toggleOrder(item.id)}
      >
        <View style={s.orderTop}>
          <View style={s.customerIcon}>
            <Ionicons name="person-outline" size={16} color={C.dark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.customerName}>
              {item.customer_name || "Customer"}
            </Text>
            <Text style={s.customerPhone}>
              {item.customer_phone || "Phone not available"}
            </Text>
          </View>
          <View style={s.productSummary}>
            <Text style={s.productSummaryTitle} numberOfLines={1}>
              {productTitle}
            </Text>
            <View style={s.productSummaryMeta}>
              <Text style={s.productSummaryQty}>
                {formatQuantity(totalQty || visibleItems.length)} qty
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={15}
                color={C.dark}
              />
            </View>
          </View>
        </View>

        {expanded ? (
          <View style={s.collapsedBody}>
            <View style={s.detailLine}>
              <Ionicons name="location-outline" size={13} color={C.muted} />
              <Text style={s.detailText}>{addressText(item)}</Text>
            </View>
            <View style={s.detailLine}>
              <Ionicons name="calendar-outline" size={13} color={C.muted} />
              <Text style={s.detailText}>
                {item.delivery_date || todayKey}
                {item.delivery_slot ? ` · ${item.delivery_slot}` : ""}
              </Text>
            </View>

            <View style={s.itemsWrap}>
              {visibleItems.map((orderItem, index) => (
                <View key={`${item.id}-${index}`} style={s.itemPill}>
                  <Text style={s.itemName} numberOfLines={1}>
                    {itemName(orderItem)}
                  </Text>
                  <Text style={s.itemQty}>
                    {formatPackedQuantity(
                      qty(orderItem),
                      itemUnit(orderItem),
                    )}
                  </Text>
                </View>
              ))}
            </View>

            <View style={s.amountRow}>
              <Text style={s.amountLabel}>Amount</Text>
              <Text style={s.amountText}>₹{orderAmount(item)}</Text>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={C.primary} />
        <Text style={s.loadingText}>Loading order summary...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Order Summary</Text>
          <Text style={s.subtitle}>
            {filteredOrders.length} shown · {statusFilter} · {dateFilter}
          </Text>
        </View>
        <TouchableOpacity
          style={s.filterBtn}
          onPress={() => setFilterSheetVisible(true)}
          activeOpacity={0.82}
        >
          <Ionicons name="options-outline" size={19} color={C.dark} />
          {activeFilterCount ? (
            <View style={s.filterDot}>
              <Text style={s.filterDotText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <Modal
        visible={filterSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheetVisible(false)}
      >
        <View style={s.sheetOverlay}>
          <View style={s.filterSheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Filter Summary</Text>
              <TouchableOpacity
                style={s.sheetCloseBtn}
                onPress={() => setFilterSheetVisible(false)}
              >
                <Ionicons name="close" size={18} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={s.sheetLabel}>Customer</Text>
            <TouchableOpacity
              style={s.customerDropdown}
              onPress={() => setCustomerDropdownOpen((open) => !open)}
              activeOpacity={0.82}
            >
              <Ionicons name="person-outline" size={16} color={C.muted} />
              <Text style={s.customerDropdownText} numberOfLines={1}>
                {selectedCustomer === "ALL"
                  ? "All Customers"
                  : selectedCustomer}
              </Text>
              <Ionicons
                name={customerDropdownOpen ? "chevron-up" : "chevron-down"}
                size={17}
                color={C.muted}
              />
            </TouchableOpacity>
            {customerDropdownOpen ? (
              <View style={s.customerDropdownList}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {customerOptions.map((customer) => {
                    const active = selectedCustomer === customer;
                    return (
                      <TouchableOpacity
                        key={customer}
                        style={[
                          s.customerOption,
                          active && s.customerOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedCustomer(customer);
                          setCustomerDropdownOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            s.customerOptionText,
                            active && s.customerOptionTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {customer === "ALL" ? "All Customers" : customer}
                        </Text>
                        {active ? (
                          <Ionicons name="checkmark" size={16} color={C.dark} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <Text style={s.sheetLabel}>Status</Text>
            <View style={s.filterRow}>
              {STATUS_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    s.filterChip,
                    statusFilter === filter && s.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(filter)}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      statusFilter === filter && s.filterChipTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sheetLabel}>Date</Text>
            <View style={s.filterRow}>
              {DATE_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    s.filterChip,
                    dateFilter === filter && s.filterChipActive,
                  ]}
                  onPress={() => setDateFilter(filter)}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      dateFilter === filter && s.filterChipTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {dateFilter === "CUSTOM" ? (
              <>
                <View style={s.dateRangeRow}>
                  <TouchableOpacity
                    style={s.dateRangeBtn}
                    onPress={() => setDatePickerTarget("start")}
                    activeOpacity={0.82}
                  >
                    <Text style={s.dateRangeLabel}>From</Text>
                    <Text style={s.dateRangeValue}>
                      {customStartDate || "Select date"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.dateRangeBtn}
                    onPress={() => setDatePickerTarget("end")}
                    activeOpacity={0.82}
                  >
                    <Text style={s.dateRangeLabel}>To</Text>
                    <Text style={s.dateRangeValue}>
                      {customEndDate || "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {datePickerTarget ? (
                  <View style={s.datePickerWrap}>
                    <DateTimePicker
                      value={dateFromKey(
                        datePickerTarget === "start"
                          ? customStartDate || getLocalDateKey()
                          : customEndDate ||
                              customStartDate ||
                              getLocalDateKey(),
                      )}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={handleCustomDateChange}
                      maximumDate={new Date()}
                    />
                    {Platform.OS === "ios" ? (
                      <TouchableOpacity
                        style={s.datePickerDoneBtn}
                        onPress={() => setDatePickerTarget(null)}
                      >
                        <Text style={s.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={s.sheetActions}>
              <TouchableOpacity style={s.resetBtn} onPress={resetFilters}>
                <Text style={s.resetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.applyBtn}
                onPress={() => setFilterSheetVisible(false)}
              >
                <Text style={s.applyText}>
                  Show {filteredOrders.length} Orders
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={s.totalCard}>
        <View style={s.totalLeft}>
          <Text style={s.totalLabel}>
            {selectedProduct === "All"
              ? "Total ordered quantity"
              : `Total ${selectedProduct}`}
          </Text>
          <Text style={s.totalValue}>
            {selectedProduct === "All"
              ? `${formatQuantity(summary.quantity)} items`
              : formatPackedQuantity(summary.quantity, unit)}
          </Text>
        </View>
        <View style={s.totalRight}>
          <Text style={s.totalAmount}>₹{summary.amount}</Text>
          <Text style={s.totalOrders}>{filteredOrders.length} orders</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipScroller}
        contentContainerStyle={s.chipRow}
      >
        {productTabs.map((tab) => {
          const active = selectedProduct === tab.name;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setSelectedProduct(tab.name)}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        style={s.orderList}
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={44} color={C.light} />
            <Text style={s.emptyTitle}>No orders for this filter</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontSize: 13, fontWeight: "700", color: C.muted },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 12, fontWeight: "700", color: C.muted, marginTop: 2 },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    position: "relative",
  },
  filterDot: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  filterDotText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.35)",
    justifyContent: "flex-end",
  },
  filterSheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E8CDBD",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: C.text },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  sheetLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 6,
    textTransform: "uppercase",
  },
  customerDropdown: {
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerDropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  customerDropdownList: {
    maxHeight: 180,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  customerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFF0E8",
    gap: 10,
  },
  customerOptionActive: { backgroundColor: "#FFF3E8" },
  customerOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: C.muted,
  },
  customerOptionTextActive: { color: C.dark, fontWeight: "900" },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  filterChipActive: { backgroundColor: "#FF967512", borderColor: C.primary },
  filterChipText: { fontSize: 13, fontWeight: "700", color: C.muted },
  filterChipTextActive: { color: C.primary },
  customDateInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },
  dateRangeRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  dateRangeBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateRangeLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: C.light,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  dateRangeValue: { fontSize: 13, fontWeight: "800", color: C.text },
  datePickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  datePickerDoneBtn: {
    alignSelf: "flex-end",
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 10,
  },
  datePickerDoneText: { fontSize: 13, fontWeight: "900", color: "#fff" },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  resetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 14,
  },
  resetText: { fontSize: 14, fontWeight: "900", color: C.muted },
  applyBtn: {
    flex: 1.5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: C.primary,
    paddingVertical: 14,
  },
  applyText: { fontSize: 14, fontWeight: "900", color: "#fff" },
  totalCard: {
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 18,
    padding: 15,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  totalLeft: { flex: 1, minWidth: 0 },
  totalLabel: { fontSize: 12, color: C.muted, fontWeight: "800" },
  totalValue: { fontSize: 16, color: C.dark, fontWeight: "900", marginTop: 4 },
  totalRight: { alignItems: "flex-end", flexShrink: 0 },
  totalAmount: { fontSize: 16, color: C.text, fontWeight: "900" },
  totalOrders: {
    fontSize: 12,
    color: C.light,
    fontWeight: "800",
    marginTop: 3,
  },
  chipScroller: { flexGrow: 0, maxHeight: 52 },
  chipRow: { paddingHorizontal: 18, gap: 8, paddingBottom: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.dark, borderColor: C.dark },
  chipText: { fontSize: 13, color: C.muted, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  orderList: { flex: 1 },
  list: { paddingHorizontal: 18, paddingBottom: 30, gap: 12 },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  orderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: { fontSize: 15, fontWeight: "900", color: C.text },
  customerPhone: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
    marginTop: 2,
  },
  productSummary: {
    flexShrink: 0,
    width: 132,
    alignItems: "flex-end",
    gap: 4,
  },
  productSummaryTitle: {
    maxWidth: 132,
    fontSize: 13,
    fontWeight: "900",
    color: C.dark,
    textAlign: "right",
  },
  productSummaryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  productSummaryQty: {
    fontSize: 11,
    fontWeight: "800",
    color: C.muted,
  },
  collapsedBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#FFF0E4",
  },
  amountText: { fontSize: 15, fontWeight: "900", color: C.dark },
  detailLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
    lineHeight: 16,
  },
  itemsWrap: { gap: 7, marginTop: 5 },
  itemPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: C.soft,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  itemName: { flex: 1, fontSize: 12, fontWeight: "800", color: C.text },
  itemQty: { fontSize: 12, fontWeight: "900", color: C.dark, textAlign: "right" },
  amountRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#FFF0E4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountLabel: { fontSize: 12, fontWeight: "800", color: C.muted },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 15, color: C.muted, fontWeight: "800" },
});

import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    Alert,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/services/api";

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

export default function VeterinaryDashboard() {
    const router = useRouter();
    const [vetData, setVetData] = useState<any>(null);

    useEffect(() => {
        AsyncStorage.getItem("vet_data").then((d) => {
            if (d) setVetData(JSON.parse(d));
        });
    }, []);

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Do you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            try { await api.vetLogout(); } catch (_) {}
                            await AsyncStorage.multiRemove(["vet_data", "vet_token", "auth_token"]);
                            router.replace("/(veterinary)/login" as any);
                        } catch {
                            router.replace("/(veterinary)/login" as any);
                        }
                    },
                },
            ]
        );
    };

    const MENU_CARDS = [
        {
            route: "/(veterinary)/cow",
            icon: "paw" as const,
            iconBg: ["#1a2e4a", "#0f1f3d"] as [string, string],
            iconColor: "#7ca9d4",
            title: "Animals",
            subtitle: "List of all animals under your care",
            badge: null,
            accentColor: "#1a4a8a",
            accentBg: "#eff6ff",
        },
        {
            route: "/(veterinary)/medical",
            icon: "medical" as const,
            iconBg: ["#2d1a4a", "#1f0f3d"] as [string, string],
            iconColor: "#c4a9d4",
            title: "Medical Records",
            subtitle: "Medicine, Insemination & Semen",
            badge: null,
            accentColor: "#7c3aed",
            accentBg: "#f5f3ff",
        },
        {
            route: "/(veterinary)/farm",
            icon: "leaf" as const,
            iconBg: ["#0f2d1a", "#0a1f10"] as [string, string],
            iconColor: "#7cd4a9",
            title: "Farm Records",
            subtitle: "Health, Feed & Milk",
            badge: null,
            accentColor: "#16a34a",
            accentBg: "#f0fdf4",
        },
    ];

    return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={["#0f1f3d", "#0a1626"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                <View style={s.headerGlow} />
                <View style={s.headerTopRow}>
                    <View style={s.headerBadge}>
                        <Ionicons name="medkit" size={11} color="#7ca9d4" />
                        <Text style={s.headerBadgeText}>VETERINARY</Text>
                    </View>
                    <TouchableOpacity
                        style={[s.headerActionBtn, { borderColor: "#5a1a1a" }]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                <View style={s.vetInfo}>
                    <View style={s.vetAvatar}>
                        <Ionicons name="person" size={22} color="#e8f4f8" />
                    </View>
                    <View>
                        <Text style={s.vetName}>Dr. {vetData?.name || "Veterinarian"}</Text>
                        <Text style={s.vetEmail}>{vetData?.email || ""}</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Menu Cards */}
            <View style={s.cardsContainer}>
                <Text style={s.sectionTitle}>Dashboard</Text>
                {MENU_CARDS.map((card, i) => (
                    <MenuCard key={card.route} card={card} index={i} onPress={() => router.push(card.route as any)} />
                ))}
            </View>
        </View>
    );
}

function MenuCard({
    card,
    index,
    onPress,
}: {
    card: any;
    index: number;
    onPress: () => void;
}) {
    const opacity = React.useRef(new Animated.Value(0)).current;
    const translateY = React.useRef(new Animated.Value(30)).current;
    const scale = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1, duration: 350,
                delay: index * 80, useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0, delay: index * 80,
                tension: 80, friction: 11, useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handlePressIn = () =>
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 10 }).start();
    const handlePressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

    return (
        <Animated.View style={[s.card, { opacity, transform: [{ translateY }, { scale }] }]}>
            <TouchableOpacity
                activeOpacity={0.88}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={s.cardTouchable}
            >
                {/* Left Icon */}
                <LinearGradient
                    colors={card.iconBg}
                    style={s.cardIconBox}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name={card.icon} size={26} color={card.iconColor} />
                </LinearGradient>

                {/* Text */}
                <View style={s.cardText}>
                    <Text style={s.cardTitle}>{card.title}</Text>
                    <Text style={s.cardSubtitle}>{card.subtitle}</Text>
                </View>

                {/* Arrow */}
                <View style={[s.cardArrow, { backgroundColor: card.accentBg }]}>
                    <Ionicons name="chevron-forward" size={18} color={card.accentColor} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F0F4FF" },

    /* Header */
    header: {
        paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16,
        paddingHorizontal: 20,
        paddingBottom: 28,
        overflow: "hidden",
    },
    headerGlow: {
        position: "absolute", top: -40, right: -40,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: "#1a4a8a", opacity: 0.15,
    },
    headerTopRow: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 18,
    },
    headerBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: "#0d2137", borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5,
        borderWidth: 1, borderColor: "#1e3a5f",
    },
    headerBadgeText: {
        fontSize: 10, fontWeight: "800",
        color: "#7ca9d4", letterSpacing: 1.2,
    },
    headerActionBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "#0d2137", borderWidth: 1,
        borderColor: "#1e3a5f", alignItems: "center", justifyContent: "center",
    },
    vetInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    vetAvatar: {
        width: 52, height: 52, borderRadius: 18,
        borderWidth: 1.5, borderColor: "#2a4a6b",
        backgroundColor: "#0d2137", alignItems: "center", justifyContent: "center",
    },
    vetName: { fontSize: 22, fontWeight: "800", color: "#e8f4f8", letterSpacing: -0.4 },
    vetEmail: { fontSize: 12, color: "#5b8db8", marginTop: 2 },

    /* Cards */
    cardsContainer: { flex: 1, padding: 20, gap: 14 },
    sectionTitle: {
        fontSize: 13, fontWeight: "700",
        color: "#8899bb", letterSpacing: 0.8,
        textTransform: "uppercase", marginBottom: 4,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardTouchable: {
        flexDirection: "row",
        alignItems: "center",
        padding: 18,
        gap: 16,
    },
    cardIconBox: {
        width: 56, height: 56,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    cardText: { flex: 1, gap: 4 },
    cardTitle: { fontSize: 17, fontWeight: "800", color: "#1a1a1a" },
    cardSubtitle: { fontSize: 12, color: "#888", fontWeight: "500" },
    cardArrow: {
        width: 34, height: 34,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
});
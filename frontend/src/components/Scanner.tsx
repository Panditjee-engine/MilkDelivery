import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  ScrollView,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height: screenHeight } = Dimensions.get('window');

interface ScannerProps {
  onScanned: (data: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export default function Scanner({
  onScanned,
  onClose,
  title = 'Scan QR Code',
  subtitle = 'Point camera at the QR code or barcode',
}: ScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [detectedData, setDetectedData] = useState<string | null>(null);
  const [rawData, setRawData] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    console.log('🔍 LIVE SCAN:', data, type);
    setRawData(data);
    setDetectedData(data);
    Vibration.vibrate(100);
    setScanned(true);
    onScanned(data);
  };

  const handleRescan = () => {
    setScanned(false);
    setDetectedData(null);
    setRawData(null);
  };

  if (!permission) {
    return (
      <View style={s.centered}>
        <Text style={s.permText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.centered}>
        <FontAwesome5 name="camera-slash" size={48} color="#555" />
        <Text style={s.permTitle}>Camera Permission Required</Text>
        <Text style={s.permSubtitle}>Allow camera access to scan QR codes</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* ✅ FIX: enableTorch prop added — yahi flashlight control karta hai */}
      <CameraView
        style={s.camera}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'ean13',
            'ean8',
            'code128',
            'code39',
            'pdf417',
            'datamatrix',
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={s.overlay}>
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={s.topTitle}>{title}</Text>

          {/* ✅ FIX: torch state toggle — button press par camera torch on/off */}
          <TouchableOpacity
            style={[s.iconBtn, torch && s.iconBtnActive]}
            onPress={() => setTorch((v) => !v)}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-outline'}
              size={22}
              color={torch ? '#f5c842' : '#fff'}
            />
            {/* Torch ON indicator ring */}
            {torch && <View style={s.torchRing} />}
          </TouchableOpacity>
        </View>

        {/* Torch ON banner */}
        {torch && (
          <View style={s.torchBanner}>
            <Ionicons name="flash" size={12} color="#f5c842" />
            <Text style={s.torchBannerText}>Flashlight ON</Text>
          </View>
        )}

        {/* Dark top area */}
        <View style={s.darkTop} />

        {/* Scanner window row */}
        <View style={s.scanRow}>
          <View style={s.darkSide} />

          {/* Scan box */}
          <View style={s.scanBox}>
            {/* Corner brackets */}
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />

            {/* LIVE DATA DISPLAY OVERLAY */}
            {detectedData && (
              <View style={s.liveDataOverlay}>
                <Text style={s.liveDataTitle}>📱 LIVE SCAN</Text>
                <ScrollView style={s.liveDataScroll}>
                  <Text style={s.liveDataText} numberOfLines={3}>
                    {detectedData}
                  </Text>
                </ScrollView>
                <Text style={s.liveDataType}>Type: QR Code</Text>
              </View>
            )}

            {/* Scan line animation */}
            {!scanned && !detectedData && (
              <View style={s.scanLineWrap}>
                <LinearGradient
                  colors={['transparent', '#f5c842', 'transparent']}
                  style={s.scanLine}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            )}

            {/* Success overlay */}
            {scanned && (
              <View style={s.scannedOverlay}>
                <View style={s.scannedIconWrap}>
                  <Ionicons name="checkmark-circle" size={52} color="#22d3a0" />
                </View>
                <Text style={s.scannedText}>Scanned Successfully!</Text>
              </View>
            )}
          </View>

          <View style={s.darkSide} />
        </View>

        {/* BOTTOM LIVE DATA PANEL */}
        {detectedData && (
          <View style={s.liveDataBottom}>
            <Text style={s.liveDataRaw}>Data: {rawData || detectedData}</Text>
            <TouchableOpacity style={s.clearBtn} onPress={handleRescan}>
              <Text style={s.clearBtnText}>Clear & Rescan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dark bottom area */}
        <View style={s.darkBottom}>
          <Text style={s.subtitleText}>{subtitle}</Text>
          {scanned && !detectedData && (
            <TouchableOpacity style={s.rescanBtn} onPress={handleRescan}>
              <Ionicons name="refresh" size={16} color="#1a1a0a" />
              <Text style={s.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const SCAN_BOX = 260;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 4;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e0e08',
    padding: 32,
    gap: 16,
  },

  /* Permission screen */
  permText: { color: '#888', fontSize: 14 },
  permTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  permSubtitle: { color: '#777', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    backgroundColor: '#f5c842',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  permBtnText: { color: '#1a1a0a', fontSize: 15, fontWeight: '900' },
  closeBtn: { paddingVertical: 12 },
  closeBtnText: { color: '#666', fontSize: 14, fontWeight: '700' },

  /* Overlay */
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: 'rgba(245,200,66,0.25)' },

  /* ✅ Torch ring glow when active */
  torchRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f5c842',
  },

  /* ✅ Torch ON banner */
  torchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: -8,
    marginBottom: 4,
  },
  torchBannerText: { color: '#f5c842', fontSize: 11, fontWeight: '800' },

  /* Dark areas */
  darkTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  darkBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
    gap: 20,
  },
  darkSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },

  /* Scan row */
  scanRow: { flexDirection: 'row', height: SCAN_BOX },

  /* Scan box */
  scanBox: { width: SCAN_BOX, height: SCAN_BOX, position: 'relative' },

  /* Corner brackets */
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#f5c842',
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },

  /* Scan line */
  scanLineWrap: {
    position: 'absolute', top: '50%', left: 10, right: 10, height: 2, marginTop: -1,
  },
  scanLine: { flex: 1, height: 2, borderRadius: 1 },

  /* LIVE DATA OVERLAY */
  liveDataOverlay: {
    position: 'absolute', top: 20, left: 10, right: 10, bottom: 20,
    backgroundColor: 'rgba(245, 197, 66, 0.92)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    padding: 12, gap: 6,
  },
  liveDataTitle: { color: '#1a1a0a', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  liveDataScroll: { maxHeight: 80 },
  liveDataText: {
    color: '#1a1a0a', fontSize: 14, fontWeight: '700', textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 8,
    paddingVertical: 6, borderRadius: 6,
  },
  liveDataType: { color: '#1a1a0a', fontSize: 11, fontWeight: '700' },

  /* Scanned success overlay */
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, gap: 8,
  },
  scannedIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(34,211,160,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  scannedText: { color: '#22d3a0', fontSize: 16, fontWeight: '900' },

  /* Bottom text */
  subtitleText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center',
    paddingHorizontal: 40, lineHeight: 20,
  },

  /* Live data bottom */
  liveDataBottom: {
    height: 90, backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, gap: 12,
  },
  liveDataRaw: {
    color: '#f5c842', fontSize: 15, fontWeight: '800',
    textAlign: 'center', maxWidth: '95%',
  },
  clearBtn: {
    backgroundColor: 'rgba(245,197,66,0.95)',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 22,
  },
  clearBtnText: { color: '#1a1a0a', fontSize: 14, fontWeight: '900' },

  /* Rescan button */
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f5c842', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  rescanText: { color: '#1a1a0a', fontSize: 14, fontWeight: '900' },
});
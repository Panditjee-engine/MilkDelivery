import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export type LeafletHandle = { flyTo: (lat: number, lng: number) => void };

type Props = {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
};

const LeafletMap = forwardRef<LeafletHandle, Props>(({ lat, lng, onMove }, ref) => {
  const web = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (la, ln) =>
      web.current?.injectJavaScript(`map.setView([${la}, ${ln}], 18); true;`),
  }));

  const html = useMemo(
    () => `
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
  map.on('moveend', function () {
    var c = map.getCenter();
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: c.lat, lng: c.lng }));
  });
</script>
</body></html>`,
    [],
  );

  return (
    <WebView
      ref={web}
      originWhitelist={["*"]}
      source={{ html, baseUrl: "https://gausatv.com" }}
      javaScriptEnabled
      domStorageEnabled
      androidLayerType="hardware"
      style={StyleSheet.absoluteFill}
      onMessage={(e) => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          onMove(d.lat, d.lng);
        } catch {}
      }}
    />
  );
});

export default LeafletMap;
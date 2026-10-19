import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  applyUrbanMeshBasemap,
  MAP_CAMERA,
  styleUrlFor,
} from "../../lib/mapStyle";
import { useTheme } from "../../lib/theme";
import { prefersReducedMotion } from "../../lib/motion";

export function LocationPickerMap({
  center,
  onMove,
  flyTo,
}: {
  center: { lat: number; lng: number };
  onMove: (coords: { lat: number; lng: number }) => void;
  flyTo?: { lat: number; lng: number } | null;
}) {
  const { dark } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: styleUrlFor(dark),
      center: [center.lng, center.lat],
      zoom: 17,
      pitch: 46,
      bearing: MAP_CAMERA.bearing,
      maxPitch: MAP_CAMERA.maxPitch,
      attributionControl: { compact: true },
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;

    const paint = () => applyUrbanMeshBasemap(map, dark);
    map.on("load", paint);
    map.on("style.load", paint);
    map.on("moveend", () => {
      const c = map.getCenter();
      onMoveRef.current({ lat: c.lat, lng: c.lng });
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(styleUrlFor(dark), { diff: false });
    map.once("style.load", () => applyUrbanMeshBasemap(map, dark));
  }, [dark]);

  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: 17,
      pitch: 46,
      duration: prefersReducedMotion() ? 0 : 600,
    });
  }, [flyTo?.lat, flyTo?.lng]);

  return <div ref={wrapRef} className="um-vector-map h-full w-full" />;
}

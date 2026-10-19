import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  applyUrbanMeshBasemap,
  MAP_CAMERA,
  MARKER,
  styleUrlFor,
} from "../../lib/mapStyle";
import { useTheme } from "../../lib/theme";

export function DetailMap({
  lat,
  lng,
  verified,
  className = "",
}: {
  lat: number;
  lng: number;
  verified: boolean;
  className?: string;
}) {
  const { dark } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: styleUrlFor(dark),
      center: [lng, lat],
      zoom: 16.4,
      pitch: 42,
      bearing: MAP_CAMERA.bearing,
      maxPitch: MAP_CAMERA.maxPitch,
      interactive: false,
      attributionControl: { compact: true },
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;

    const paint = () => {
      applyUrbanMeshBasemap(map, dark);
      markerRef.current?.remove();
      const pin = document.createElement("div");
      pin.className = "h-3.5 w-3.5 rounded-full border-2 border-white shadow";
      pin.style.background = verified ? MARKER.verified : MARKER.pending;
      markerRef.current = new maplibregl.Marker({ element: pin, pitchAlignment: "viewport" })
        .setLngLat([lng, lat])
        .addTo(map);
    };

    map.on("load", paint);
    map.on("style.load", paint);

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      markerRef.current?.remove();
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
    mapRef.current?.easeTo({ center: [lng, lat], duration: 0 });
    markerRef.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return <div ref={wrapRef} className={`um-vector-map h-full w-full ${className}`} />;
}

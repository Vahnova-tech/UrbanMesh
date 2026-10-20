import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function MiniMap({
  lat,
  lng,
  className = "",
  interactive = false,
}: {
  lat: number;
  lng: number;
  className?: string;
  interactive?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: STYLE,
      center: [lng, lat],
      zoom: 15.8,
      interactive,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const pin = document.createElement("div");
    pin.className =
      "h-3.5 w-3.5 rounded-full border-2 border-white bg-civic-accent shadow";
    pin.style.background = "#2f6b5a";
    markerRef.current = new maplibregl.Marker({ element: pin })
      .setLngLat([lng, lat])
      .addTo(map);

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    mapRef.current?.easeTo({ center: [lng, lat], duration: 0 });
    markerRef.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return (
    <div
      ref={wrapRef}
      className={`overflow-hidden rounded-card border border-civic-line ${className}`}
    />
  );
}

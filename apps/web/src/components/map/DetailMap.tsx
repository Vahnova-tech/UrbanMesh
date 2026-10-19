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
  prominent = false,
}: {
  lat: number;
  lng: number;
  verified: boolean;
  className?: string;
  /** Larger teardrop pin for report-detail previews. */
  prominent?: boolean;
}) {
  const { dark } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const verifiedRef = useRef(verified);
  const prominentRef = useRef(prominent);
  verifiedRef.current = verified;
  prominentRef.current = prominent;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: styleUrlFor(dark),
      center: [lng, lat],
      zoom: prominent ? 16.8 : 16.4,
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
      const color = verifiedRef.current ? MARKER.verified : MARKER.pending;
      if (prominentRef.current) {
        pin.innerHTML = `
          <svg width="36" height="44" viewBox="0 0 36 44" fill="none" aria-hidden="true">
            <path d="M18 42s14-12.4 14-22.4A14 14 0 1 0 4 19.6C4 29.6 18 42 18 42z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
            <circle cx="18" cy="18" r="5.5" fill="#fff"/>
          </svg>
        `;
        pin.style.width = "36px";
        pin.style.height = "44px";
        pin.style.transform = "translateY(4px)";
      } else {
        pin.className = "h-3.5 w-3.5 rounded-full border-2 border-white shadow";
        pin.style.background = color;
      }
      markerRef.current = new maplibregl.Marker({
        element: pin,
        pitchAlignment: "viewport",
        anchor: prominentRef.current ? "bottom" : "center",
      })
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

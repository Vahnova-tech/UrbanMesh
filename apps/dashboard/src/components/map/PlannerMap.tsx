import { useEffect, useMemo } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  Rectangle,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { cellToBoundary } from "h3-js";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type {
  IncidentPublic,
  PlatformMeta,
  SpatialCluster,
} from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { HEAT_DARK, HEAT_LIGHT, MARKER, tilesFor } from "../../lib/mapStyle";

const KILIMANI: [number, number] = [-1.2921, 36.785];

export interface MapLayers {
  verified: boolean;
  pending: boolean;
  wards: boolean;
  roads: boolean;
  drainage: boolean;
  pedestrian: boolean;
  h3: boolean;
}

function HeatLayer({
  points,
  dark,
}: {
  points: IncidentPublic[];
  dark: boolean;
}) {
  const map = useMap();
  const heatData = useMemo(
    () =>
      points
        .filter((p) => p.is_verified)
        .map(
          (p) =>
            [p.lat, p.lng, p.severity === "critical" ? 0.85 : 0.5] as [
              number,
              number,
              number,
            ],
        ),
    [points],
  );
  useEffect(() => {
    if (heatData.length === 0) return;
    const layer = L.heatLayer(heatData, {
      radius: 24,
      blur: 20,
      maxZoom: 17,
      minOpacity: dark ? 0.26 : 0.16,
      gradient: dark ? HEAT_DARK : HEAT_LIGHT,
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, heatData, dark]);
  return null;
}

export function PlannerMap({
  incidents,
  clusters,
  meta,
  layers,
  selectedId,
  selectedIncidentId,
  onSelectCluster,
  onSelectIncident,
}: {
  incidents: IncidentPublic[];
  clusters: SpatialCluster[];
  meta: PlatformMeta | null;
  layers: MapLayers;
  selectedId?: string | null;
  selectedIncidentId?: string | null;
  onSelectCluster?: (cluster: SpatialCluster) => void;
  onSelectIncident?: (incident: IncidentPublic) => void;
}) {
  const { dark } = useTheme();
  const tiles = tilesFor(dark);
  const ring = dark ? "#EEE9E1" : "#FFFFFF";
  const roadColor = dark ? "#C5C1B8" : "#16181D";
  const wardColor = dark ? "#8F968E" : "#3F4A52";

  const h3Cells = useMemo(() => {
    const unique = [...new Set(incidents.map((i) => i.h3_index).filter(Boolean))];
    return unique.map((cell) => ({
      cell,
      path: cellToBoundary(cell) as Array<[number, number]>,
    }));
  }, [incidents]);

  const roads = meta?.corridors.filter(
    (c) => c.id === "argwings-kodhek" || c.id === "ngong-road",
  );
  const drainage = meta?.corridors.filter((c) => c.id === "kirichwa-kubwa");
  const pedestrian = meta?.corridors.filter((c) => c.id === "dennis-pritt");
  const selected = clusters.find((c) => c.cluster_id === selectedId);

  return (
    <MapContainer
      center={KILIMANI}
      zoom={15}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        key={dark ? "dark" : "light"}
        url={tiles.url}
        attribution={tiles.attribution}
      />
      {layers.verified ? <HeatLayer points={incidents} dark={dark} /> : null}

      {layers.wards &&
        meta?.wards.map((ward) => {
          const [minLat, maxLat, minLng, maxLng] = ward.bbox;
          return (
            <Rectangle
              key={ward.id}
              bounds={[
                [minLat, minLng],
                [maxLat, maxLng],
              ]}
              pathOptions={{
                color: wardColor,
                weight: 1,
                dashArray: "4 6",
                fillOpacity: dark ? 0.06 : 0.04,
              }}
            >
              <Popup>{ward.name}</Popup>
            </Rectangle>
          );
        })}

      {layers.roads &&
        roads?.map((c) => (
          <Polyline
            key={c.id}
            positions={c.path}
            pathOptions={{ color: roadColor, weight: 3, opacity: 0.55 }}
          />
        ))}
      {layers.drainage &&
        drainage?.map((c) => (
          <Polyline
            key={c.id}
            positions={c.path}
            pathOptions={{ color: wardColor, weight: 3, dashArray: "6 6" }}
          />
        ))}
      {layers.pedestrian &&
        pedestrian?.map((c) => (
          <Polyline
            key={c.id}
            positions={c.path}
            pathOptions={{ color: MARKER.verified, weight: 3 }}
          />
        ))}

      {layers.h3 &&
        h3Cells.map((cell) => (
          <Polygon
            key={cell.cell}
            positions={cell.path}
            pathOptions={{
              color: MARKER.verified,
              weight: 1,
              fillColor: MARKER.verified,
              fillOpacity: dark ? 0.1 : 0.06,
            }}
          />
        ))}

      {layers.pending &&
        incidents
          .filter((i) => !i.is_verified)
          .map((inc) => (
            <CircleMarker
              key={inc.id}
              center={[inc.lat, inc.lng]}
              radius={selectedIncidentId === inc.id ? 8 : 5}
              eventHandlers={{
                click: () => onSelectIncident?.(inc),
              }}
              pathOptions={{
                color: ring,
                weight: selectedIncidentId === inc.id ? 3 : 1.5,
                fillColor: MARKER.pending,
                fillOpacity: 0.85,
                dashArray: "3 3",
              }}
            >
              <Popup>
                <strong>{inc.category_label}</strong>
                <br />
                Pending · {inc.corridor}
              </Popup>
            </CircleMarker>
          ))}

      {selected ? (
        <Circle
          center={[selected.lat, selected.lng]}
          radius={selected.radius_meters}
          pathOptions={{
            color: MARKER.verified,
            weight: 1.5,
            fillColor: MARKER.verified,
            fillOpacity: 0.08,
          }}
        />
      ) : null}

      {layers.verified &&
        clusters.map((cluster) => (
          <CircleMarker
            key={cluster.cluster_id}
            center={[cluster.lat, cluster.lng]}
            radius={selectedId === cluster.cluster_id ? 13 : 9}
            eventHandlers={{
              click: () => onSelectCluster?.(cluster),
            }}
            pathOptions={{
              color: ring,
              weight: 2,
              fillColor:
                cluster.severity === "critical" ? MARKER.critical : MARKER.verified,
              fillOpacity: 0.95,
            }}
          />
        ))}
    </MapContainer>
  );
}

export const DEFAULT_LAYERS: MapLayers = {
  verified: true,
  pending: true,
  wards: true,
  roads: true,
  drainage: false,
  pedestrian: false,
  h3: false,
};

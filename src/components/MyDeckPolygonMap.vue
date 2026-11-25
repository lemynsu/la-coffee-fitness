<script setup>
// MapLibre + deck.gl polygon layer (Page 3)
// Adapted from: https://deck.gl/examples/geojson-layer
// Mapbox integration: https://deck.gl/docs/api-reference/mapbox/mapbox-overlay
// Vanilla version: maps/deckgl-polygon.js
// Data: /data/neighborhoods.geojson (scripts/fetch-data.js)
import { ref, onMounted, onBeforeUnmount } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { GeoJsonLayer } from '@deck.gl/layers'
import * as d3 from 'd3'

const LA_BOUNDS = [[-118.67, 33.70], [-118.15, 34.34]] // same fixed view as every map

// Same thresholds and dark-to-bright blues as the Page 1 choropleth
const THRESHOLDS = [0.5, 1, 2, 5, 10]
const COLORS = ['#1f2937', '#1e3a5f', '#1d4f8a', '#2f6fb5', '#5b9be0', '#a8d0ff']
const color = d3.scaleThreshold(THRESHOLDS, COLORS)
const rgb = (s) => { const c = d3.color(s); return [c.r, c.g, c.b] } // deck.gl wants [r, g, b]

// Legend labels: the lower bound of each color class
const legendLabels = ['0', ...THRESHOLDS.slice(0, -1).map(String), '10+']

const mapEl = ref(null)
let map

onMounted(async () => {
  const geo = await d3.json(`${import.meta.env.BASE_URL}data/neighborhoods.geojson`)
  if (!mapEl.value) return // left the page while loading
  map = new maplibregl.Map({
    container: mapEl.value,
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    bounds: LA_BOUNDS,
    fitBoundsOptions: { padding: 16 },
    })
    map.on('load', () => map.setPitch(50))

  const layer = new GeoJsonLayer({
    id: 'neighborhoods-3d',
    data: geo,
    filled: true,
    extruded: true,
    getElevation: (f) => f.properties.total * 30, // height = number of places
    getFillColor: (f) => [...rgb(color(f.properties.density_per_km2)), 230],
    pickable: true,
  })

  // deck.gl draws inside Mapbox's own canvas (interleaved), added as a control
  map.addControl(new MapboxOverlay({
    interleaved: true,
    layers: [layer],
    getTooltip: ({ object }) => object && {
      html: `<b>${object.properties.name}</b><br>${object.properties.total} places
             (${object.properties.cafes} cafés, ${object.properties.fitness} fitness)`,
      style: {
        background: 'rgba(44, 44, 46, 0.92)',
        color: '#f5f5f7',
        fontSize: '12px',
        borderRadius: '10px',
        padding: '8px 12px',
      },
    },
  }))
})

onBeforeUnmount(() => {
  map?.remove() // also removes the deck.gl overlay and frees the WebGL context
  map = null
})
</script>

<template>
  <div class="map-card">
   <h3 class="map-title">Which neighborhoods stand out?</h3>
   <p class="map-subtitle">Taller blocks have more places. Brighter blocks are more packed per km².</p>
    <div class="map-area">
      <div ref="mapEl" class="map"></div>
      <div class="map-legend">
        <div class="legend-title">Places per km²</div>
        <div class="legend-row">
          <div v-for="(c, i) in COLORS" :key="c" class="legend-step">
            <span class="swatch" :style="{ background: c }"></span>
            <span class="legend-label">{{ legendLabels[i] }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-card {
  height: 560px;
  display: flex;
  flex-direction: column;
  background: #1c1c1e;
  border-radius: 18px;
  padding: 16px;
}
.map-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f5f5f7;
}
.map-subtitle {
  margin: 2px 0 8px;
  font-size: 12px;
  color: #a1a1a6;
}
.map-area {
  position: relative;
  flex: 1;
  min-height: 0;
  border-radius: 12px;
  overflow: hidden;
}
.map {
  position: absolute;
  inset: 0;
}
.map-legend {
  position: absolute;
  left: 12px;
  bottom: 40px;
  z-index: 1;
  padding: 10px 12px;
  background: rgba(44, 44, 46, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  font-size: 11px;
  color: #f5f5f7;
}
.legend-title {
  font-weight: 600;
  margin-bottom: 6px;
}
.legend-row {
  display: flex;
}
.legend-step {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.swatch {
  width: 28px;
  height: 8px;
}
.legend-label {
  color: #a1a1a6;
}
</style>
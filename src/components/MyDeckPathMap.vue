<script setup>
// MapLibre + deck.gl arc layer (Page 4)
// Adapted from: https://deck.gl/examples/arc-layer
// Mapbox integration: https://deck.gl/docs/api-reference/mapbox/mapbox-overlay
// Vanilla version: maps/deckgl-path.js
// Data: /data/arcs.json (scripts/fetch-data.js)
import { ref, onMounted, onBeforeUnmount } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers'
import * as d3 from 'd3'

const LA_BOUNDS = [[-118.67, 33.70], [-118.15, 34.34]] // same fixed view as every map

// Arcs start in the workout's color and end in café brown
const COLORS = {
  gym: '#4a3fa0',
  yoga: '#7d9460',
  pilates: '#d4849a',
  boxing: '#9b2226',
  pool: '#2d7d8e',
  'sports centre': '#d1a24a',
}
const CAFE = '#c4713f'
const rgb = (hex) => { const c = d3.rgb(hex); return [c.r, c.g, c.b] } // deck.gl wants [r, g, b]

const mapEl = ref(null)
let map

onMounted(async () => {
  const arcs = await d3.json(`${import.meta.env.BASE_URL}data/arcs.json`)
  if (!mapEl.value) return // left the page while loading
  const treks = arcs.filter((d) => d.km >= 0.5) // only workouts 500 m+ from the nearest café
  map = new maplibregl.Map({
    container: mapEl.value,
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    bounds: LA_BOUNDS,
    fitBoundsOptions: { padding: 16 },
  })
  map.addControl(new maplibregl.NavigationControl(), 'top-right')
  map.on('load', () => map.setPitch(45)) // fit flat first, then tilt, so the zoom stays on LA

  // Arcs are the hero: one per trek, workout color fading to café brown
  const arcLayer = new ArcLayer({
    id: 'sweat-to-sip',
    data: treks,
    getSourcePosition: (d) => d.source,
    getTargetPosition: (d) => d.target,
    getSourceColor: (d) => rgb(COLORS[d.category] || '#888888'),
    getTargetColor: () => rgb(CAFE),
    getWidth: 5,
    widthMinPixels: 4,
    getHeight: 1,
    pickable: true,
  })

  // Small endpoint dots keep short treks visible at city zoom
  const dots = (id, getPosition, getFillColor) => new ScatterplotLayer({
    id,
    data: treks,
    getPosition,
    getFillColor,
    getRadius: 30,
    radiusMinPixels: 2.5,
    stroked: false,
    pickable: true,
  })
  const workoutDots = dots('workouts', (d) => d.source, (d) => rgb(COLORS[d.category] || '#888888'))
  const cafeDots = dots('cafes', (d) => d.target, rgb(CAFE))

  // Later layers draw on top: dots above arcs
  map.addControl(new MapboxOverlay({
    interleaved: true,
    layers: [arcLayer, workoutDots, cafeDots],
    getTooltip: ({ object }) => object && {
      text: `${object.from} → ${object.to}\n${object.km} km`, // text, not html: OSM names stay plain text
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
    <h3 class="map-title">How far to coffee after a workout?</h3>
    <p class="map-subtitle">Each arc runs from a workout spot to its nearest café, for trips of 500 m or more.</p>
    <div class="map-area">
      <div ref="mapEl" class="map"></div>
      <div class="map-legend">
        <div class="legend-title">Workout type</div>
        <div v-for="(color, category) in COLORS" :key="category" class="legend-item">
          <span class="dot" :style="{ background: color }"></span>
          {{ category }}
        </div>
        <div class="legend-item legend-cafe">
          <span class="dot" :style="{ background: CAFE }"></span>
          Café (arc end)
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
  top: 12px;
  left: 12px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(44, 44, 46, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  font-size: 12px;
  color: #f5f5f7;
}
.legend-title {
  font-weight: 600;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: capitalize;
}
.legend-cafe {
  margin-top: 4px;
  text-transform: none;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>
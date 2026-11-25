<script setup>
// MapLibre pin map (Page 2)
// Adapted from the MapLibre filter-markers example
// Popups from the MapLibre popup-on-click example

// Data: /data/places.json (scripts/fetch-data.js)
import { ref, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { json, rollup } from 'd3'

const COLORS = {
  cafe: '#c4713f',
  gym: '#4a3fa0',
  yoga: '#7d9460',
  pilates: '#d4849a',
  boxing: '#9b2226',
  pool: '#2d7d8e',
  'sports centre': '#d1a24a',
}
const LA_BOUNDS = [[-118.67, 33.70], [-118.15, 34.34]] // same fixed view as Page 1

const mapEl = ref(null) // replaces container: 'mapbox-pins'
const counts = ref({}) // places per category, shown in the panel
const shown = reactive(Object.fromEntries(Object.keys(COLORS).map((c) => [c, true])))
let map
let ready = false // true once the layers exist

onMounted(async () => {
  const places = await json(`${import.meta.env.BASE_URL}data/places.json`)
  if (!mapEl.value) return // left the page while loading

  counts.value = Object.fromEntries(rollup(places, (v) => v.length, (d) => d.category))

  // places.json is a plain array, so convert it to GeoJSON for Mapbox
  const geojson = {
    type: 'FeatureCollection',
    features: places.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { name: p.name, category: p.category },
    })),
  }
  map = new maplibregl.Map({
    container: mapEl.value,
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    bounds: LA_BOUNDS,
    fitBoundsOptions: { padding: 16 },
  })
  map.addControl(new maplibregl.NavigationControl(), 'top-right')

  map.on('load', () => {
    map.setPitch(45)
    map.addSource('places', { type: 'geojson', data: geojson })

    for (const [category, color] of Object.entries(COLORS)) {
      const id = `places-${category}`

      // One layer per category, filtered from the shared source
      map.addLayer({
        id,
        type: 'circle',
        source: 'places',
        filter: ['==', ['get', 'category'], category],
        paint: {
          'circle-color': color,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 14, 7],
          'circle-stroke-color': '#f5f5f7',
          'circle-stroke-width': 0.3,
          'circle-stroke-opacity': 0.4,
        },
      })

      // Popup on click (textContent keeps OSM names from injecting HTML)
      map.on('click', id, (e) => {
        const { name, category } = e.features[0].properties
        const box = document.createElement('div')
        box.appendChild(document.createElement('strong')).textContent = name || 'Unnamed'
        box.appendChild(document.createElement('div')).textContent = category
        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setDOMContent(box)
          .addTo(map)
      })
      map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''))
    }

    ready = true
    applyFilter() // in case a box was unchecked before the map loaded
  })
})

// Show or hide each category's layer to match the checkboxes
function applyFilter() {
  if (!ready) return
  for (const category in shown) {
    map.setLayoutProperty(`places-${category}`, 'visibility', shown[category] ? 'visible' : 'none')
  }
}
watch(shown, applyFilter)

onBeforeUnmount(() => {
  ready = false
  map?.remove() // frees the WebGL context, listeners and popups
  map = null
})
</script>

<template>
  <div class="map-card">
   <h3 class="map-title">Where is every café and fitness spot?</h3>
   <p class="map-subtitle">Colored by type. Toggle a type to filter, click a pin for its name.</p>
    <div class="map-area">
      <div ref="mapEl" class="map"></div>
      <div class="pin-filter">
        <label v-for="(color, category) in COLORS" :key="category">
          <input v-model="shown[category]" type="checkbox" />
          <span class="dot" :style="{ background: color }"></span>
          {{ category }} ({{ counts[category] ?? 0 }})
        </label>
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
.pin-filter {
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
.pin-filter label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  text-transform: capitalize;
}
.pin-filter input {
  margin: 0;
  accent-color: #0a84ff;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.map-area :deep(.maplibregl-popup-content) {
  color: #1d1d1f;
  font-size: 12px;
  border-radius: 10px;
  padding: 8px 12px;
}
</style>
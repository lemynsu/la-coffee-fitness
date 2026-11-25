<script setup>
// Vega-Embed proportional symbol map (Page 1)
// Adapted from: https://vega.github.io/vega-lite/examples/geo_layer.html
// Vanilla version: maps/vega-symbol-map.js
// Data: /data/neighborhoods.geojson + /data/neighborhood-centroids.json (scripts/fetch-data.js)
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import embed from 'vega-embed'

const target = ref(null) // replaces '#vega-symbol-map'
let result // what vegaEmbed returns, kept for cleanup
let alive = true // false once the component leaves the page

// The switch: which count the circles show (matches field names in the data)
const OPTIONS = [
  { value: 'cafes', label: 'Cafés' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'total', label: 'All' },
]
const show = ref('total')
const subtitle = computed(() => ({
  cafes: 'Circle size shows the number of cafés in each neighborhood.',
  fitness: 'Circle size shows the number of fitness spots in each neighborhood.',
  total: 'Circle size shows all cafés and fitness spots in each neighborhood.',
})[show.value])

// Fixed LA view, so stray data can't change the zoom
const LA_EXTENT = { type: 'MultiPoint', coordinates: [[-118.67, 33.70], [-118.15, 34.34]] }

const spec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  width: 'container',
  height: 'container',
  autosize: { type: 'fit', contains: 'padding' },
  background: 'transparent',
  projection: { type: 'mercator', fit: LA_EXTENT },
  params: [{ name: 'show', value: 'total' }], // a Vega signal that Vue changes from the buttons
  layer: [
    {
      // Layer 1: city outline
      data: { url: `${import.meta.env.BASE_URL}data/neighborhoods.geojson`, format: { type: 'json', property: 'features' } },
      mark: { type: 'geoshape', fill: '#2c2c2e', stroke: '#1c1c1e', strokeWidth: 0.6 },
    },
    {
      // Layer 2: one circle per neighborhood, area = the chosen count
      data: { url: `${import.meta.env.BASE_URL}data/neighborhood-centroids.json` },
      transform: [
        { calculate: 'datum[show]', as: 'value' }, // pick cafes, fitness or total
        { filter: 'datum.value > 0' },
      ],
      mark: {
        type: 'circle',
        opacity: 0.7,
        stroke: '#f5f5f7',
        strokeWidth: 0.5,
        color: { expr: "show === 'cafes' ? '#c4713f' : show === 'fitness' ? '#5e5ce6' : '#0a84ff'" },
      },
      encoding: {
        longitude: { field: 'lon', type: 'quantitative' },
        latitude: { field: 'lat', type: 'quantitative' },
        size: {
          field: 'value',
          type: 'quantitative',
          title: 'Places',
          // Fixed domain, so sizes compare fairly across Cafés, Fitness and All
          scale: { domain: [0, 100], range: [10, 600] },
          legend: { orient: 'bottom-right', values: [20, 40, 60, 80] },
        },
        tooltip: [
          { field: 'name', title: 'Neighborhood' },
          { field: 'cafes', title: 'Cafés' },
          { field: 'fitness', title: 'Fitness' },
          { field: 'total', title: 'Total' },
        ],
      },
    },
  ],
  config: {
    view: { stroke: null },
    font: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
    legend: {
      titleColor: '#f5f5f7',
      labelColor: '#a1a1a6',
      titleFontSize: 11,
      symbolFillColor: '#8e8e93', // neutral gray: the legend is about size, not color
      symbolStrokeColor: '#f5f5f7',
    },
  },
}

onMounted(async () => {
  const r = await embed(target.value, spec, { actions: false, tooltip: { theme: 'dark' } })
  if (!alive) return r.finalize() // left the page while loading
  result = r
  result.view.signal('show', show.value).runAsync() // in case a button was clicked while loading
})

// Button click → update the Vega signal → Vega redraws only what changed
watch(show, (value) => result?.view.signal('show', value).runAsync())

onBeforeUnmount(() => {
  alive = false
  result?.finalize() // stops Vega's listeners and timers
})
</script>

<template>
  <div class="map-card">
    <div class="map-header">
      <div>
        <h3 class="map-title">Which neighborhoods have the most?</h3>
        <p class="map-subtitle">{{ subtitle }}</p>
      </div>
      <div class="segmented" role="group" aria-label="What to count">
        <button
          v-for="o in OPTIONS"
          :key="o.value"
          type="button"
          :class="{ active: show === o.value }"
          @click="show = o.value"
        >
          {{ o.label }}
        </button>
      </div>
    </div>
    <div ref="target" class="map-area"></div>
  </div>
</template>

<style scoped>
.map-card {
  height: 400px;
  display: flex;
  flex-direction: column;
  background: #1c1c1e;
  border-radius: 18px;
  padding: 16px;
}
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
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
.segmented {
  display: flex;
  flex-shrink: 0;
  padding: 2px;
  background: #2c2c2e;
  border-radius: 9px;
}
.segmented button {
  border: 0;
  background: transparent;
  color: #a1a1a6;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 7px;
  cursor: pointer;
}
.segmented button.active {
  background: #48484a;
  color: #f5f5f7;
}
.map-area {
  flex: 1;
  min-height: 0;
}
</style>
<script setup>
// D3 choropleth map (Page 1)
// Adapted from: https://observablehq.com/@d3/choropleth
// Legend adapted from: https://observablehq.com/@d3/color-legend
// Vanilla version: maps/d3-choropleth.js
// Data: /data/neighborhoods.geojson (scripts/fetch-data.js)
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'

const container = ref(null) // replaces document.getElementById
let observer

// Fixed LA view, so stray data can't change the zoom
const LA_EXTENT = { type: 'MultiPoint', coordinates: [[-118.67, 33.70], [-118.15, 34.34]] }

// Dark theme: low density = dark, high density = bright
const color = d3.scaleThreshold(
  [0.5, 1, 2, 5, 10],
  ['#1f2937', '#1e3a5f', '#1d4f8a', '#2f6fb5', '#5b9be0', '#a8d0ff'],
)

onMounted(async () => {
  const geo = await d3.json(`${import.meta.env.BASE_URL}data/neighborhoods.geojson`)
  if (!container.value) return // component left the page while loading
  observer = new ResizeObserver(([entry]) =>
    draw(geo, entry.contentRect.width, entry.contentRect.height))
  observer.observe(container.value)
})

onBeforeUnmount(() => observer?.disconnect()) // clean up when switching pages

function draw(geo, w, h) {
  const root = d3.select(container.value)
  root.selectAll('*').remove()
  if (!w || !h) return

  const projection = d3.geoMercator().fitExtent([[0, 0], [w, h]], LA_EXTENT)
  const path = d3.geoPath(projection)

  const svg = root.append('svg')
    .attr('width', w)
    .attr('height', h)
    .style('display', 'block')

  // Data join: one path per neighborhood, filled by its density
  svg.append('g')
    .selectAll('path')
    .data(geo.features)
    .join('path')
    .attr('d', path)
    .attr('fill', (d) => color(d.properties.density_per_km2))
    .attr('stroke', '#3a3a3c')
    .attr('stroke-width', 0.6)
    .append('title')
    .text((d) => {
      const p = d.properties
      return `${p.name}\n${p.density_per_km2} places/km²\n${p.cafes} cafés, ${p.fitness} fitness`
    })

  // Bottom-right corner is open ocean next to San Pedro
  svg.append('g')
    .attr('transform', `translate(${w - 190}, ${h - 42})`)
    .call(legend, 'Places per km²', 180)
}

// Discrete branch of the lab legend, for a threshold scale
function legend(g, title, width) {
  const n = color.range().length
  const x = d3.scaleLinear().domain([-1, n - 1]).range([0, width])

  g.append('text')
    .attr('y', 10)
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('fill', '#f5f5f7')
    .text(title)

  g.selectAll('rect')
    .data(color.range())
    .join('rect')
    .attr('x', (d, i) => x(i - 1))
    .attr('y', 18)
    .attr('width', (d, i) => x(i) - x(i - 1))
    .attr('height', 8)
    .attr('fill', (d) => d)

  g.append('g')
    .attr('transform', 'translate(0, 26)')
    .call(d3.axisBottom(x)
      .tickValues(d3.range(color.domain().length))
      .tickFormat((i) => color.domain()[i])
      .tickSize(4))
    .attr('font-family', null)
    .attr('color', '#a1a1a6')
    .call((g) => g.select('.domain').remove())
}
</script>

<template>
  <div class="map-card">
    <h3 class="map-title">Where are cafés and fitness spots most packed?</h3>
    <p class="map-subtitle">Places per km², by neighborhood.</p>
    <div ref="container" class="map-area"></div>
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
  flex: 1;
  min-height: 0;
}
</style>
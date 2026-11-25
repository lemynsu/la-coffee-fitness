<script setup>
import MyD3ChoroplethMap from '../components/MyD3ChoroplethMap.vue'
import MyVegaSymbolMap from '../components/MyVegaSymbolMap.vue'
</script>

<template>
  <div class="container">
    <section class="section">
      <p class="eyebrow">01</p>
      <h2 class="section-title">D3 + Vega</h2>

      <div class="row g-4">
        <div class="col-12 col-lg-6">
          <MyD3ChoroplethMap />
        </div>
        <div class="col-12 col-lg-6">
          <MyVegaSymbolMap />
        </div>
      </div>
    </section>
  </div>
</template>
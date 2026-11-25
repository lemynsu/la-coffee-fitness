<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav class="navbar navbar-expand-md">
    <div class="container">
      <RouterLink class="navbar-brand" to="/">LA Coffee &amp; Fitness</RouterLink>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
        data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false"
        aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item"><RouterLink class="nav-link" to="/">Overview</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/pins">All Places</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/polygons">3D View</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/paths">Coffee Treks</RouterLink></li>
        </ul>
      </div>
    </div>
  </nav>
  <RouterView />
</template>
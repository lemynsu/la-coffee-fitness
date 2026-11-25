import { createRouter, createWebHashHistory } from 'vue-router'
import D3VegaView from '../views/D3VegaView.vue'
import PinMapView from '../views/PinMapView.vue'
import DeckPolygonView from '../views/DeckPolygonView.vue'
import DeckPathView from '../views/DeckPathView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'd3-vega', component: D3VegaView },
    { path: '/pins', name: 'pins', component: PinMapView },
    { path: '/polygons', name: 'polygons', component: DeckPolygonView },
    { path: '/paths', name: 'paths', component: DeckPathView },
    { path: '/:pathMatch(.*)*', redirect: '/' }, // any unknown URL → Page 1
  ],
})

export default router
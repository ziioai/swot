
import { createWebHashHistory, createRouter } from 'vue-router'

// import HomeView from './HomeView.vue'
// import AboutView from './AboutView.vue'

import NotFoundView from '@views/NotFoundView';
import AppView from '@views/AppView';
import AppNotesView from '@views/appViews/AppNotesView';
import AppAboutView from '@views/appViews/AppAboutView';
import AppConfigView from '@views/appViews/AppConfigView';
import SpaCESolverDemo from '@views/appViews/SpaCESolverDemo';

// const routes = [
//   { path: '/:pathMatch(.*)*', name: '404', component: NotFoundView },
//   { path: '/', name: 'root', component: RootView },
//   { path: '/home', name: 'home', component: HomeView },
//   { path: '/app', name: 'app-root', component: AppView, children: [
//     { path: '', name: 'app', component: AppRootView },
//     { path: 'index', name: 'app-index', component: AppRootView },
//     { path: 'notes', name: 'app-notes', component: AppNotesView },
//   ] },
// ];
const routes = [
  { path: '/:pathMatch(.*)*', name: '404', component: NotFoundView },
  { path: '/', redirect: '/ss' },
  { path: '/', name: 'app-root', component: AppView, children: [
    { path: 'ss', name: 'app-ss', component: SpaCESolverDemo },
    { path: 'notes', name: 'app-notes', component: AppNotesView },
    { path: 'about', name: 'app-about', component: AppAboutView },
    { path: 'config', name: 'app-config', component: AppConfigView },
  ] },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router

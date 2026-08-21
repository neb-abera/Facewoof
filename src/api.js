import axios from 'axios';

/*
 * One place that decides where the API lives.
 *
 * Six components each set axios.defaults.baseURL to 'http://localhost:3001',
 * which meant the built app only ever talked to the developer's own machine.
 * Every request is relative now: the vite dev server proxies /api to the API
 * container, and in production express serves the client and the API on the
 * same origin.
 *
 * BASE_URL is '/' normally and '/facewoof/' when the app is built to be served
 * under a path, which is exactly the prefix the API needs too.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

axios.defaults.baseURL = base;

export default axios;

// route.interface.js

// The Route object expects a router and an optional path
class Route {
  constructor(router) {
    this.path = undefined; // Path is optional
    this.router = router; // Router is required
  }
}

export default Route;

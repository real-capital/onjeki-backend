// route.interface.js

// The Route object expects a router and an optional path
export class Route {
  constructor(router) {
    this.path = undefined; // Path is optional
    this.router = router; // Router is required
  }
}



// // route.interface.js

// // The Route object expects a router and an optional path
// export class Route {
//   constructor(router) {
//     this.path = undefined; // Path is optional
//     this.router = router; // Router is required
//   }
// }

// interfaces/route.interface.js
import { Router } from 'express';

export class Route {
  constructor() {
    this.router = Router();
    this.path = '/';
  }

  initializeRoutes() {
    // This should be implemented by child classes
    throw new Error('initializeRoutes must be implemented');
  }

  getRouter() {
    return this.router;
  }
}

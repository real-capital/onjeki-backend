import 'reflect-metadata';
import App from './app.js';
// import TestRoute from "./routes/test.route";
// import UtilsRoute from "./routes/utils/utils.route";
import AuthRoute from './routes/auth/auth.route.js';
import PropertyRoute from './routes/property/property.route.js';
import CategoryRoute from './routes/category/category.route.js';
import AmenitiesRoute from './routes/amenity/amenities.route.js';
import BuildingRoute from './routes/building/building.route.js';
import WIshlistRoute from './routes/wishlist/wishlist.routes.js';
import ChatRoute from './routes/message/chat.route.js';
// import SaleRoute from './routes/Sale/sales.route';
// import RentalRoute from './routes/Rental/rental.route';
// import buildingRoute from './routes/buildings/building.route';
// import amenityRoute from './routes/amenities/amenities.route';
// import LayoverRoute from './routes/layovers/layover.route';
// import wishListRoute from './routes/wishlist/wishlist.route';
// import bookingRoute from './routes/booking/booking.route';
// import adminRoute from './routes/admin/admin.route';

const app = new App([
  //   new TestRoute(),
  //   new UtilsRoute(),
  new AuthRoute(),
  new PropertyRoute(),
  new CategoryRoute(),
  new AmenitiesRoute(),
  new BuildingRoute(),
  new WIshlistRoute(),
  new ChatRoute(),

  // new SaleRoute(),
  //   new RentalRoute(),
  //   new LayoverRoute(),
  //   new buildingRoute(),
  //   new amenityRoute(),
  //   new wishListRoute(),
  //   new bookingRoute(),
  //   new adminRoute()
]);

app.listen();

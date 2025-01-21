// // tests/setup.js
// import mongoose from 'mongoose';
// import { MongoMemoryServer } from 'mongodb-memory-server';
// import dotenv from 'dotenv';

// dotenv.config({ path: '.env.test' });

// let mongod;

// export const setupTestDB = async () => {
//   mongod = await MongoMemoryServer.create();
//   const uri = mongod.getUri();
//   await mongoose.connect(uri);
// };

// export const teardownTestDB = async () => {
//   await mongoose.disconnect();
//   await mongod.stop();
// };

// // tests/integration/auth.test.js
// import request from 'supertest';
// import app from '../../app';
// import { setupTestDB, teardownTestDB } from '../setup';
// import UserModel from '../../models/user.model';

// describe('Auth Routes', () => {
//   beforeAll(async () => {
//     await setupTestDB();
//   });

//   afterAll(async () => {
//     await teardownTestDB();
//   });

//   describe('POST /auth/create', () => {
//     it('should create a new user and send OTP', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/create')
//         .send({
//           email: 'test@example.com'
//         });

//       expect(res.status).toBe(200);
//       expect(res.body.message).toContain('Otp on its way');
//     });
//   });
// });

// // tests/unit/services/property.service.test.js
// import PropertyService from '../../../services/property.service';
// import PropModel from '../../../models/property.model';

// jest.mock('../../../models/property.model');

// describe('PropertyService', () => {
//   let propertyService;

//   beforeEach(() => {
//     propertyService = new PropertyService();
//   });

//   describe('createProperty', () => {
//     it('should create a new property', async () => {
//       const mockProperty = {
//         title: 'Test Property',
//         price: 1000
//       };

//       PropModel.create.mockResolvedValue(mockProperty);

//       const result = await propertyService.createProperty(mockProperty);
//       expect(result).toEqual(mockProperty);
//     });
//   });
// });
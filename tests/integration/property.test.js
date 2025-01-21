// import request from 'supertest';
// import mongoose from 'mongoose';
// import app from '../../app';
// import { setupTestDB, teardownTestDB } from '../setup';
// import { generateToken } from '../helpers/auth';
// import PropModel from '../../models/property.model';

// describe('Property API', () => {
//   let authToken;
//   let testUser;

//   beforeAll(async () => {
//     await setupTestDB();
//     testUser = await createTestUser();
//     authToken = generateToken(testUser);
//   });

//   afterAll(async () => {
//     await teardownTestDB();
//   });

//   describe('POST /api/v1/properties', () => {
//     it('should create a new property', async () => {
//       const propertyData = {
//         title: 'Test Property',
//         description: 'Test Description',
//         price: 1000,
//         type: 'RENT',
//         location: {
//           country: 'Nigeria',
//           city: 'Lagos',
//           streetAddress: 'Test Street'
//         }
//       };

//       const res = await request(app)
//         .post('/api/v1/properties')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send(propertyData);

//       expect(res.status).toBe(201);
//       expect(res.body.data).toHaveProperty('_id');
//       expect(res.body.data.title).toBe(propertyData.title);
//     });
//   });
// });
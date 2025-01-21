// import BookingService from '../../../services/booking.service';
// import BookingModel from '../../../models/booking.model';
// import PropModel from '../../../models/property.model';
// import { BookingStatus } from '../../../enum/booking.enum';

// jest.mock('../../../models/booking.model');
// jest.mock('../../../models/property.model');

// describe('BookingService', () => {
//   let bookingService;

//   beforeEach(() => {
//     bookingService = new BookingService();
//     jest.clearAllMocks();
//   });

//   describe('createBooking', () => {
//     it('should create a booking successfully', async () => {
//       const mockProperty = {
//         _id: 'propertyId',
//         price: 100,
//         isBooked: false,
//         save: jest.fn()
//       };

//       const mockBooking = {
//         _id: 'bookingId',
//         property: 'propertyId',
//         status: BookingStatus.PENDING
//       };

//       PropModel.findById.mockResolvedValue(mockProperty);
//       BookingModel.create.mockResolvedValue(mockBooking);

//       const result = await bookingService.createBooking({
//         propertyId: 'propertyId',
//         startDate: new Date(),
//         endDate: new Date()
//       }, 'userId');

//       expect(result).toEqual(mockBooking);
//       expect(mockProperty.isBooked).toBe(true);
//       expect(mockProperty.save).toHaveBeenCalled();
//     });
//   });
// });

// services/payment/refund.service.js
import PaystackService from './payment.service.js';
import BookingModel from '../../models/booking.model.js';
import PaymentModel from '../../models/paymentModel.js';

class RefundService {
  constructor() {
    this.paystackService = new PaystackService();
  }

  async calculateRefundAmount(booking) {
    const property = await PropertyModel.findById(booking.property);
    const cancellationPolicy = property.rules.cancellationPolicy;
    const checkIn = new Date(booking.checkIn);
    const now = new Date();
    const daysUntilCheckIn = Math.ceil((checkIn - now) / (1000 * 60 * 60 * 24));

    let refundPercentage = 0;
    switch (cancellationPolicy) {
      case 'flexible':
        // Full refund if cancelled more than 24 hours before check-in
        refundPercentage = daysUntilCheckIn >= 1 ? 100 : 0;
        break;
      case 'moderate':
        // Full refund if cancelled 5 or more days before check-in
        // 50% refund if cancelled less than 5 days before
        refundPercentage = daysUntilCheckIn >= 5 ? 100 : 50;
        break;
      case 'strict':
        // Full refund if cancelled 14 or more days before check-in
        // 50% refund if cancelled 7-13 days before
        // No refund if cancelled less than 7 days before
        refundPercentage = 
          daysUntilCheckIn >= 14 ? 100 : 
          daysUntilCheckIn >= 7 ? 50 : 0;
        break;
    }

    return {
      refundPercentage,
      refundAmount: (booking.pricing.total * refundPercentage) / 100
    };
  }

  async processRefund(bookingId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the booking
      const booking = await BookingModel.findOne({
        _id: bookingId,
        guest: userId,
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] }
      }).populate('property');

      if (!booking) {
        throw new HttpException(404, 'Booking not found or cannot be refunded');
      }

      // Find the payment
      const payment = await PaymentModel.findOne({
        booking: bookingId,
        status: 'PAID'
      });

      if (!payment) {
        throw new HttpException(404, 'No paid payment found for this booking');
      }

      // Calculate refund amount
      const { refundPercentage, refundAmount } = await this.calculateRefundAmount(booking);

      // Initiate Paystack refund
      const refundResponse = await this.paystackService.initiateRefund({
        transactionReference: payment.transactionReference,
        amount: Math.round(refundAmount * 100), // Convert to kobo
        reason: 'Booking cancellation'
      });
        console.log(refundResponse);
      // Update payment status
      payment.status = 'REFUNDED';
      payment.refundedAt = new Date();
      await payment.save({ session });

      // Update booking status
      booking.status = BookingStatus.CANCELLED;
      booking.cancellation = {
        cancelledBy: userId,
        cancelledAt: new Date(),
        refundAmount,
        refundPercentage,
        refundStatus: 'PROCESSING'
      };
      booking.timeline.push({
        status: 'REFUND_INITIATED',
        message: `Refund processed: ${refundPercentage}% of total amount`
      });
      await booking.save({ session });

      // Remove booked dates from property
      const property = booking.property;
      await property.removeBookedDates(bookingId);

      await session.commitTransaction();

      // Send notifications
      await this.sendRefundNotifications(booking);

      return {
        booking,
        refundAmount,
        refundPercentage
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  async sendRefundNotifications(booking) {
    // Send email to guest about refund
    await emailService.sendRefundConfirmationEmail(booking);

    // Create notification record
    await NotificationModel.create({
      user: booking.guest,
      type: 'REFUND_PROCESSED',
      title: 'Booking Refund',
      message: `Refund processed for booking ${booking._id}`,
      booking: booking._id
    });
  }
}

export default RefundService;
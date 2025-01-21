export const processBookingReminderJob = async (job) => {
    const { booking } = job.data;
    
    // Send reminder notifications
    await notificationQueue.add({
      type: 'BOOKING_REMINDER',
      userId: booking.user,
      message: `Your stay at ${booking.property.title} starts tomorrow!`
    });
    
    // Send reminder email
    await emailQueue.add({
      type: 'BOOKING_REMINDER',
      data: booking
    });
  };
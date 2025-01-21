export const processEmailJob = async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case 'BOOKING_CONFIRMATION':
      await sendBookingConfirmationEmail(data);
      break;
    case 'PROPERTY_APPROVAL':
      await sendPropertyApprovalEmail(data);
      break;
    // Add more email types
  }
};

// utils/analytics.js
export const generateAnalytics = (data) => {
    const { bookings, properties, users } = data;
  
    return {
      bookings: analyzeBookings(bookings),
      properties: analyzeProperties(properties),
      users: analyzeUsers(users),
      revenue: calculateRevenue(bookings)
    };
  };
  
  const analyzeBookings = (bookings) => {
    const dailyBookings = groupByDate(bookings);
    const bookingsByType = groupByPropertyType(bookings);
    const averageStayDuration = calculateAverageStayDuration(bookings);
  
    return {
      total: bookings.length,
      dailyBookings,
      bookingsByType,
      averageStayDuration
    };
  };
  
  const analyzeProperties = (properties) => {
    const propertiesByType = groupByType(properties);
    const propertiesByLocation = groupByLocation(properties);
    const averagePrice = calculateAveragePrice(properties);
  
    return {
      total: properties.length,
      propertiesByType,
      propertiesByLocation,
      averagePrice
    };
  };
  
  const calculateRevenue = (bookings) => {
    const revenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);
    const revenueByDay = groupByDate(bookings, 'totalPrice');
  
    return {
      total: revenue,
      daily: revenueByDay
    };
  };
  
  // Helper functions for analytics
  const groupByDate = (items, valueKey = null) => {
    const grouped = {};
    items.forEach(item => {
      const date = item.createdAt.toISOString().split('T')[0];
      if (valueKey) {
        grouped[date] = (grouped[date] || 0) + item[valueKey];
      } else {
        grouped[date] = (grouped[date] || 0) + 1;
      }
    });
    return grouped;
  };
  
  const groupByPropertyType = (items) => {
    const grouped = {};
    items.forEach(item => {
      const type = item.property.type;
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  };
  
  const calculateAverageStayDuration = (bookings) => {
    if (bookings.length === 0) return 0;
    const totalDuration = bookings.reduce((acc, booking) => acc + booking.duration, 0);
    return totalDuration / bookings.length;
  };
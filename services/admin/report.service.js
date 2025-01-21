// services/report.service.js
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';

class ReportService {
  async generateBookingReport(filters) {
    const bookings = await BookingModel.find(filters)
      .populate('property user')
      .sort({ createdAt: -1 });

    return this.createExcelReport(bookings, 'bookings');
  }

  async generatePropertyReport(filters) {
    const properties = await PropModel.find(filters)
      .populate('user')
      .sort({ createdAt: -1 });

    return this.createExcelReport(properties, 'properties');
  }

  async createExcelReport(data, type) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type);

    // Set up columns based on report type
    if (type === 'bookings') {
      worksheet.columns = [
        { header: 'Booking ID', key: '_id' },
        { header: 'Property', key: 'propertyTitle' },
        { header: 'Guest', key: 'guestName' },
        { header: 'Check-in', key: 'startDate' },
        { header: 'Check-out', key: 'endDate' },
        { header: 'Total Price', key: 'totalPrice' },
        { header: 'Status', key: 'status' }
      ];
    } else if (type === 'properties') {
      worksheet.columns = [
        { header: 'Property ID', key: '_id' },
        { header: 'Title', key: 'title' },
        { header: 'Owner', key: 'ownerName' },
        { header: 'Type', key: 'type' },
        { header: 'Price', key: 'price' },
        { header: 'Status', key: 'listStatus' }
      ];
    }

    // Add data rows
    data.forEach(item => {
      worksheet.addRow(this.formatReportData(item, type));
    });

    // Style the worksheet
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Save to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  formatReportData(item, type) {
    if (type === 'bookings') {
      return {
        _id: item._id.toString(),
        propertyTitle: item.property.title,
        guestName: item.user.name,
        startDate: item.startDate.toLocaleDateString(),
        endDate: item.endDate.toLocaleDateString(),
        totalPrice: item.totalPrice,
        status: item.status
      };
    } else if (type === 'properties') {
      return {
        _id: item._id.toString(),
        title: item.title,
        ownerName: item.user.name,
        type: item.type,
        price: item.price,
        listStatus: item.listStatus
      };
    }
  }
}

export default new ReportService();
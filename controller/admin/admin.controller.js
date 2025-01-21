// controllers/admin.controller.js
import AdminService from '../../services/admin.service.js';
import { StatusCodes } from 'http-status-codes';

class AdminController {
  async getDashboardStats(req, res) {
    const stats = await AdminService.getDashboardStats();
    res.status(StatusCodes.OK).json({ data: stats });
  }

  async getPropertyReviewQueue(req, res) {
    const properties = await AdminService.getPropertyReviewQueue(req.query);
    res.status(StatusCodes.OK).json({ data: properties });
  }

  async reviewProperty(req, res) {
    const { propertyId } = req.params;
    const { status, comments } = req.body;
    
    const result = await AdminService.reviewProperty(propertyId, {
      status,
      comments,
      reviewedBy: req.user.id
    });
    
    res.status(StatusCodes.OK).json({ data: result });
  }

  async getUserManagement(req, res) {
    const users = await AdminService.getUsers(req.query);
    res.status(StatusCodes.OK).json({ data: users });
  }

  async getReports(req, res) {
    const reports = await AdminService.generateReports(req.query);
    res.status(StatusCodes.OK).json({ data: reports });
  }
}


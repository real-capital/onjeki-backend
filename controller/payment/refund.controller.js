// controllers/refund.controller.js
class RefundController {
  async processRefund(req, res) {
    try {
      const refundService = new RefundService();
      const refundResult = await refundService.processRefund(
        req.params.bookingId,
        req.user._id
      );

      res.json({
        status: 'success',
        data: refundResult,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}

export default RefundController;
class HttpResponse {
    constructor(status, message, data = null) {
      this.status = status;   // 'success' or 'error'
      this.message = message; // Response message
      this.data = data;       // Optional additional data, like error details
    }
  }
  
  export default HttpResponse;
  
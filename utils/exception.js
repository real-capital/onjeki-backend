class HttpException extends Error {
  constructor(status, message, errorCode = 'UNKNOWN_ERROR') {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

export default HttpException;

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  const response = {
    success: false,
    message: statusCode >= 500 ? "Internal server error" : error.message,
  };

  if (process.env.NODE_ENV !== "production") {
    response.debugMessage = error.message;
  }

  if (error.name === "ValidationError") {
    response.message = "Validation failed";
    response.errors = Object.values(error.errors).map((item) => item.message);
    return res.status(400).json(response);
  }

  if (error.code === 11000) {
    response.message = "A record with this value already exists";
    return res.status(409).json(response);
  }

  console.error(error);
  return res.status(statusCode).json(response);
}

module.exports = errorHandler;

const path = require("path");

function notFound(req, res) {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({
      message: "Route not found.",
    });
  }

  return res
    .status(404)
    .sendFile(path.join(__dirname, "../../public/404.html"));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const publicMessage =
    statusCode >= 500 ? "Internal server error." : err.message;

  if (statusCode >= 500) {
    console.error(err);
  }

  if (req.originalUrl.startsWith("/api/")) {
    return res.status(statusCode).json({
      message: publicMessage,
    });
  }

  return res.status(statusCode).send(publicMessage);
}

module.exports = {
  notFound,
  errorHandler,
};

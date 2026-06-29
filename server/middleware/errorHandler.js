module.exports = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'حدث خطأ غير متوقع في الخادم',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

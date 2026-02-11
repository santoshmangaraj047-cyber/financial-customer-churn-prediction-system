// backend/src/middleware/admin.middleware.js
const verifyAdmin = (req, res, next) => {
  // `req.user` comes from verifyToken middleware (must be used BEFORE this)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - no user found',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }

  next();
};

export default verifyAdmin;
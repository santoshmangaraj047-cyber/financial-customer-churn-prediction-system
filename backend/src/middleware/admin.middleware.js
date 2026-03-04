const isAdmin = (req, res, next) => {
  // req.user is added by verifyToken middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. No user data found."
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only."
    });
  }

  next();
};

export default isAdmin;
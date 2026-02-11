import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  // 1. Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  // 2. Check if token exists and starts with "Bearer"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  // 3. Extract token (remove "Bearer ")
  const token = authHeader.split(' ')[1];

  // 4. Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 5. Attach user info to request object
    req.user = decoded;
    
    // 6. Continue to next middleware/route handler
    next();
    
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

export default verifyToken;
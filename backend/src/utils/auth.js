import jwt from "jsonwebtoken";

const TOKEN_EXPIRY = "1d";

export function createAdminToken() {
  return jwt.sign({ role: "organizer" }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    verifyAdminToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

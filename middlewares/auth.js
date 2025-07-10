import { adminSecretKey } from "../app.js";
import { gossipoToken } from "../constants/config.js";
import { User } from "../models/usermodel.js";
import { ErrorHandler, ErrorTryCatch } from "./error.js";
import jwt, { decode } from "jsonwebtoken";
const isAuthenticated = ErrorTryCatch((req, res, next) => {
  const token = req.cookies["Gossipo-token"];
  if (!token) {
    return next(new ErrorHandler("Please Login to access this route", 401));
  }
  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  //   console.log(decodedData);
  req.user = decodedData._id;
  // console.log(req.user);

  next();
});

const adminOnly = (req, res, next) => {
  const token = req.cookies["Gossipo-admin-token"];
  if (!token) {
    return next(
      new ErrorHandler("Please Login as Admin to access this route", 401)
    );
  }
  const secretKey = jwt.verify(token, process.env.JWT_SECRET);
  const isMatch = secretKey === adminSecretKey;
  if (!isMatch) {
    return next(new ErrorHandler("Invalid Secret Key", 401));
  }

  next();
};

const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) {
      return next(err);
    }
    const authToken = socket.request.cookies[gossipoToken];
    if (!authToken) {
      return next(new ErrorHandler("Please Login to access this route", 401));
    }
    const decoded_data = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded_data._id);
    if (!user) {
      return next(new ErrorHandler("Please Login to access this route", 401));
    }
    socket.user = user;
    return next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Please Login to access this route", 401));
  }
};

export { isAuthenticated, adminOnly, socketAuthenticator };

import express from "express";
import {
  acceptFriendRequest,
  getMyFriends,
  getNotifications,
  login,
  Logout,
  myProfile,
  newUser,
  SearchUser,
  sendFriendRequest,
} from "../controllers/userController.js";
import { singleAvatar, uploadMulter } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  acceptFriendRequestValidator,
  registerValidator,
  sendRequestValidator,
  validate,
  validateLogin,
} from "../lib/validator.js";
const app = express.Router();
app.post("/new", singleAvatar, registerValidator(), validate, newUser);
app.post("/login", validateLogin(), validate, login);
////////////////
///// logged in
app.use(isAuthenticated);
app.get("/me", myProfile);
app.get("/logout", Logout);
app.get("/search", SearchUser);
app.put("/sendrequest", sendRequestValidator(), validate, sendFriendRequest);
app.put(
  "/acceptrequest",
  acceptFriendRequestValidator(),
  validate,
  acceptFriendRequest
);
app.get("/notifications", getNotifications);
app.get("/friends", getMyFriends);
export default app;

import express from "express";
import {
  adminLogin,
  adminLogout,
  allChats,
  allMessages,
  allUsers,
  getAdminData,
  getDashboardStats,
} from "../controllers/admincontroller.js";
import { adminLoginValidator, validate } from "../lib/validator.js";
import { adminOnly } from "../middlewares/auth.js";
const app = express.Router();
// app.get("/");
app.post("/verify", adminLoginValidator(), validate, adminLogin);
app.get("/logout", adminLogout);
/////////////////////////////////////////////////////////////////////////////
/// ONLY ADMIN
app.use(adminOnly);
app.get("/", getAdminData);
app.get("/users", allUsers);
app.get("/chats", allChats);
app.get("/messages", allMessages);
app.get("/stats", getDashboardStats);
export default app;

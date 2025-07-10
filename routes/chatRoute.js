import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  addMembers,
  CreateGroupChat,
  deleteChats,
  getChatDetails,
  getMessages,
  getMyGroups,
  leaveGroup,
  MyChats,
  removeMembers,
  renameGroup,
  sendAttachments,
} from "../controllers/chatcontroller.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import {
  addMembersValidator,
  createGroupChatValidator,
  deleteChatsValidator,
  getchatDetailsValidator,
  getMessagesValidator,
  leaveGroupValidator,
  removeMembersValidator,
  renameGroupValidator,
  sendAttachmentsValidator,
  validate,
} from "../lib/validator.js";
const app = express.Router();
app.use(isAuthenticated);
app.post("/new", createGroupChatValidator(), validate, CreateGroupChat);

app.get("/my", MyChats);
app.get("/my/groups", getMyGroups);
app.put("/addmembers", addMembersValidator(), validate, addMembers);
app.put("/removemember", removeMembersValidator(), validate, removeMembers);
app.delete("/leave/:id", leaveGroupValidator(), validate, leaveGroup);
app.post(
  "/message",
  attachmentsMulter,
  sendAttachmentsValidator(),
  validate,
  sendAttachments
);
app.get("/message/:id", getMessagesValidator(), validate, getMessages);
app
  .route("/:id")
  .get(getchatDetailsValidator(), validate, getChatDetails)
  .put(renameGroupValidator(), validate, renameGroup)
  .delete(deleteChatsValidator(), validate, deleteChats);
export default app;

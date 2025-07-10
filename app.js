import express from "express";
import { v2 as cloudinary } from "cloudinary";
import { newUser } from "./controllers/userController.js";
import { connectDb } from "./utils/feature.js";
import dotenv from "dotenv";
import UserRoute from "./routes/user.js";
import ChatRoute from "./routes/chatRoute.js";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import AdminRoute from "./routes/adminroute.js";
import {
  createGroupChats,
  createmessagesInaChat,
  createSingleChats,
  createUser,
} from "./seeders/userseeder.js";
import { Server } from "socket.io";
import { createServer } from "http";
import {
  CHAT_ENDED,
  CHAT_STARTED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE,
  START_TYPING,
  STOP_TYPING,
} from "./constants/event.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/messagemodel.js";
import cors from "cors";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";
dotenv.config({
  path: "./.env",
});
const mongoUrl = process.env.MONGO_URL;
connectDb(mongoUrl);
// createUser(10);
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const port = process.env.PORT || 3000;
export const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "dev";
const userSocketID = new Map();
const onlineUsers = new Set();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});
app.set("io", io);
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/api/v1/user", UserRoute);
app.use("/api/v1/chat", ChatRoute);
app.use("/api/v1/admin", AdminRoute);
app.get("/", (req, res) => {
  res.send("Hello world");
});
io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});
io.on("connection", (socket) => {
  const user = socket.user;

  userSocketID.set(user._id.toString(), socket.id);

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    const messageForDb = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const memberSockets = getSockets(members);
    io.to(memberSockets).emit(NEW_MESSAGE, {
      message: messageForRealTime,
      chatId,
      // sender: user._id,
    });
    io.to(memberSockets).emit(NEW_MESSAGE_ALERT, { chatId });
    // console.log("New Message", messageForRealTime);
    try {
      await Message.create(messageForDb);
    } catch (error) {
      console.log(error);
    }
  });
  socket.on(START_TYPING, ({ members, chatId }) => {
    // console.log("typing", members, chatId);

    const memberSocket = getSockets(members);
    // console.log(memberSocket);

    socket.to(memberSocket).emit(START_TYPING, { chatId });
    // console.log();
  });
  socket.on(STOP_TYPING, ({ members, chatId }) => {
    // console.log("typing", members, chatId);

    const memberSocket = getSockets(members);
    // console.log(memberSocket);

    socket.to(memberSocket).emit(STOP_TYPING, { chatId });
  });
  socket.on(CHAT_STARTED, ({ userId, member }) => {
    onlineUsers.add(userId.toString());
    const memberSocket = getSockets(member);
    io.to(memberSocket).emit(ONLINE, Array.from(onlineUsers));
  });
  socket.on(CHAT_ENDED, ({ userId, member }) => {
    onlineUsers.delete(userId.toString());
    const memberSocket = getSockets(member);
    io.to(memberSocket).emit(ONLINE, Array.from(onlineUsers));
  });
  socket.on("disconnect", () => {
    // console.log("User disconnected");
    userSocketID.delete(user._id.toString());
  });
});

app.use(errorMiddleware);
server.listen(port, () => {
  console.log(`Server is listening on port:${port} in ${envMode} mode`);
});

export { userSocketID };

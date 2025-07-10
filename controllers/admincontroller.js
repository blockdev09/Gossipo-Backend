import { ErrorHandler, ErrorTryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chatmodel.js";
import { User } from "../models/usermodel.js";
import { Message } from "../models/messagemodel.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/feature.js";
import { adminSecretKey } from "../app.js";
const adminLogin = ErrorTryCatch(async (req, res, next) => {
  const { secretKey } = req.body;
  const isMatch = secretKey === adminSecretKey;
  // console.log(isMatch);

  if (!isMatch) {
    return next(new ErrorHandler("Invalid Secret Key", 401));
  }
  const token = jwt.sign(secretKey, process.env.JWT_SECRET);
  // console.log(token);

  return res
    .status(200)
    .cookie("Gossipo-admin-token", token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 15,
    })
    .json({
      success: true,
      message: "Authentciated Successfully",
    });
});

const allUsers = ErrorTryCatch(async (req, res, next) => {
  const users = await User.find({});
  const transformedUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);
      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );
  return res.status(200).json({
    success: true,
    transformedUsers,
  });
});

const allChats = ErrorTryCatch(async (req, res, next) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");
  const transformedChats = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar?.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );
  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

const allMessages = ErrorTryCatch(async (req, res, next) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");
  // console.log(messages);

  const transformedMessages = messages
    .filter((msg) => msg.sender && msg.chat && msg.sender.avatar)
    .map(({ _id, content, attachments, sender, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    }));
  // console.log(transformedMessages);

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

const getDashboardStats = ErrorTryCatch(async (req, res, next) => {
  const [groupsCount, usersCount, messagesCount, totalchatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);
  // console.log("Hii");

  const today = new Date();
  const last7days = new Date();
  last7days.setDate(today.getDate() - 7);
  const last7daysmessages = await Message.find({
    createdAt: {
      $gte: last7days,
      $lte: today,
    },
  }).select("createdAt");
  const messages = new Array(7).fill(0);
  const dayInMs = 24 * 60 * 60 * 1000;
  last7daysmessages.forEach((message) => {
    const Approxindex =
      (today.getTime() - message.createdAt.getTime()) / dayInMs;
    const index = Math.floor(Approxindex);
    messages[6 - index]++;
  });
  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalchatsCount,
    messagesChart: messages,
  };
  return res.status(200).json({
    success: true,
    stats,
  });
});

const getAdminData = ErrorTryCatch(async (req, res, next) => {
  return res.status(200).json({
    admin: true,
  });
});

const adminLogout = ErrorTryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("Gossipo-admin-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged Out Successfully",
    });
});
export {
  allUsers,
  allChats,
  allMessages,
  getDashboardStats,
  adminLogin,
  getAdminData,
  adminLogout,
};

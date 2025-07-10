import {
  ALERT,
  NEW_ATTACHMENTS,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/event.js";
import { getOtherMembers } from "../lib/helper.js";
import { ErrorHandler, ErrorTryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chatmodel.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilestoCloudinary,
} from "../utils/feature.js";
import { User } from "../models/usermodel.js";
import { Message } from "../models/messagemodel.js";
const CreateGroupChat = ErrorTryCatch(async (req, res, next) => {
  const { name, members } = req.body;
  if (members.length < 2) {
    return next(
      new ErrorHandler("Group Chat must have atleast 3 members", 400)
    );
  }
  const allMembers = [...members, req.user];
  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });
  emitEvent(req, ALERT, allMembers, `Welcome to ${name} Group`);
  emitEvent(req, REFETCH_CHATS, members);
  return res.status(201).json({
    success: true,
    message: "Group Created Succefully",
  });
});

const MyChats = ErrorTryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );
  // console.log(chats);

  const transformedChats = chats.map(
    ({ _id, name, avatar, members, groupChat }) => {
      const othermembers = getOtherMembers(members, req.user);
      return {
        _id,
        groupChat,
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [othermembers?.avatar?.url],
        name: groupChat ? name : othermembers?.name,
        members: members.reduce((prev, curr) => {
          if (curr._id.toString() !== req.user.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
      };
    }
  );
  // console.log(transformedChats);
  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

const getMyGroups = ErrorTryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");
  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));
  // console.log(groups);

  return res.status(200).json({
    success: true,
    groups,
  });
});

const addMembers = ErrorTryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;
  if (!members || members.length < 1) {
    return next(new ErrorHandler("Please provide Members!", 400));
  }
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a Group Chat", 400));
  }
  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not allowed to add members", 403));
  }
  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));
  const allNewMembers = await Promise.all(allNewMembersPromise);
  const onlyUniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);
  chat.members.push(...onlyUniqueMembers);
  if (chat.members.length > 100) {
    return next(new ErrorHandler("Group Members limit reached!", 400));
  }
  await chat.save();
  const allUserName = allNewMembers.map((i) => i.name).join(",");
  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUserName} has been added in the group`
  );
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Members added Successfully",
  });
});

const removeMembers = ErrorTryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;
  const [chat, userToBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  if (!chat) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a Group Chat", 400));
  }
  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not allowed to add members", 403));
  }
  if (chat.members.length <= 3) {
    return next(new ErrorHandler("Group must have atleast 3 members", 400));
  }
  const allChatMembers = chat.members.map((i) => i.toString());
  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );
  await chat.save();
  emitEvent(
    req,
    ALERT,
    chat.members,
    `${userToBeRemoved.name} has been removed from the group`
  );
  emitEvent(req, REFETCH_CHATS, allChatMembers);
  return res.status(200).json({
    success: true,
    message: "Members removed successfully!",
  });
});

const leaveGroup = ErrorTryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a Group Chat", 400));
  }
  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );
  if (remainingMembers.length < 3) {
    return next(new ErrorHandler("Group must have atleast 3 members", 400));
  }
  if (chat.creator.toString() === req.user.toString()) {
    const randomElement = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
  }
  chat.members = remainingMembers;
  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);
  emitEvent(req, ALERT, chat.members, `User ${user.name} has left the group`);
  res.status(200).json({
    success: true,
    message: "Group Left successfully",
  });
});

const sendAttachments = ErrorTryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const files = req.files || [];
  if (files.length < 1) {
    return next(new ErrorHandler("Please provide Attachments", 400));
  }
  if (files.length > 5) {
    return next(new ErrorHandler("You can only upload upto 5 files", 400));
  }

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);
  if (!chat) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }

  const attachments = await uploadFilestoCloudinary(files);

  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };
  // console.log(messageForDB);

  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };
  // console.log(messageForRealTime);

  const message = await Message.create(messageForDB);
  // console.log(message);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });
  res.status(200).json({
    success: true,
    message,
  });
});

const getChatDetails = ErrorTryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) {
      return next(new ErrorHandler("Chat not Found", 404));
    }
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return next(new ErrorHandler("Chat not Found", 404));
    }
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

const renameGroup = ErrorTryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const { name } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat not found", 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a group chat", 400));
  }
  if (chat.creator.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are not allowed to rename the group", 403)
    );
  }
  chat.name = name;
  await chat.save();
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Group renamed succeddfully",
  });
});

const deleteChats = ErrorTryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat not found", 404));
  }
  const members = chat.members;
  if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are not allowed to delete the group", 403)
    );
  }
  if (chat.groupChat && !chat.members.includes(req.user.toString())) {
    return next(
      new ErrorHandler("You are not allowed to delete the chat", 403)
    );
  }
  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: {
      $exists: true,
      $ne: [],
    },
  });
  const public_ids = [];
  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => public_ids.push(public_id));
  });
  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);
  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

const getMessages = ErrorTryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const result_per_page = 10;
  const skip = (page - 1) * result_per_page;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }
  if (!chat.members.includes(req.user.toString())) {
    return next(
      new ErrorHandler("You are not allowed to access this chat", 401)
    );
  }
  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(result_per_page)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);
  // console.log(totalMessagesCount, result_per_page);

  const totalPages = Math.ceil(totalMessagesCount / result_per_page) || 0;
  // console.log(messages);

  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});

export {
  CreateGroupChat,
  MyChats,
  getMyGroups,
  addMembers,
  removeMembers,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChats,
  getMessages,
};

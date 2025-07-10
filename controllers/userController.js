import { compare } from "bcrypt";
import { User } from "../models/usermodel.js";
import {
  cookieOptions,
  emitEvent,
  sendToken,
  uploadFilestoCloudinary,
} from "../utils/feature.js";
import { ErrorHandler, ErrorTryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chatmodel.js";
import { Request } from "../models/requestmodel.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/event.js";
import { getOtherMembers } from "../lib/helper.js";
import { fr } from "@faker-js/faker";
const newUser = ErrorTryCatch(async (req, res, next) => {
  const { name, username, bio, password } = req.body;
  const file = req.file;

  if (!file) {
    return next(new ErrorHandler("Please upload your avatar", 400));
  }
  const result = await uploadFilestoCloudinary([file]);

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const user = await User.create({
    name,
    bio,
    username,
    password,
    avatar,
  });

  sendToken(res, user, 201, "User Created");
});

const login = ErrorTryCatch(async (req, res, next) => {
  const { username, password } = req.body;
  // console.log(username);

  const user = await User.findOne({ username }).select("+password");
  // console.log(user);

  if (!user) {
    return next(new ErrorHandler("Invalid Username", 404));
  }

  const isMatch = await compare(password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid Password", 404));
  }

  sendToken(res, user, 200, `Welcome back ${user.name}`);
});

const myProfile = ErrorTryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  // console.log(req.user);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  res.status(200).json({
    success: true,
    user,
  });
});

const Logout = ErrorTryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("Gossipo-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged Out Successfully",
    });
});

const SearchUser = ErrorTryCatch(async (req, res, next) => {
  const { name = "" } = req.query;
  const myChats = await Chat.find({ groupChat: false, members: req.user });
  // console.log(myChats.length);
  const allUsersFromMyChat = myChats.flatMap((chat) => chat.members);
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChat },
    name: { $regex: name, $options: "i" },
  });
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));
  return res.status(200).json({
    success: true,
    // message: name,
    // allMembersFromMyChat,
    users,
  });
});

const sendFriendRequest = ErrorTryCatch(async (req, res, next) => {
  const { userId } = req.body;
  // console.log(userId);
  // console.log(req.user);

  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });
  // console.log(request);

  if (request) {
    return next(new ErrorHandler("Request already sent", 400));
  }
  await Request.create({
    sender: req.user,
    receiver: userId,
  });
  emitEvent(req, NEW_REQUEST, [userId]);
  return res.status(200).json({
    success: true,
    message: "Friend Request Sent",
  });
});

const acceptFriendRequest = ErrorTryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;
  // console.log(requestId, accept);

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");
  //  console.log(request);

  if (!request) {
    return next(new ErrorHandler("Request not found", 404));
  }
  if (request.receiver._id.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are not authorized to accept this request", 403)
    );
  }
  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }
  const members = [request.sender._id, request.receiver._id];
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);
  emitEvent(req, REFETCH_CHATS, members);
  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id,
  });
});

const getNotifications = ErrorTryCatch(async (req, res, next) => {
  const requests = await Request.find({
    receiver: req.user,
  }).populate("sender", "name avatar");
  // console.log(requests);

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));
  // console.log(allRequests);

  return res.status(200).json({
    success: true,
    requests: allRequests,
  });
});

const getMyFriends = ErrorTryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats
    .map(({ members }) => {
      const otherUser = getOtherMembers(members, req.user);

      if (!otherUser) return null;
      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
    })
    .filter((friend) => friend !== null);
  // console.log(friends);

  if (chatId) {
    const chat = await Chat.findById(chatId);

    const availableFriends = friends.filter(
      (friend) => friend && !chat.members.includes(friend._id.toString())
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});
export {
  login,
  newUser,
  myProfile,
  Logout,
  SearchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getNotifications,
  getMyFriends,
};

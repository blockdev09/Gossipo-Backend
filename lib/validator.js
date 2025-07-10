import { body, check, param, validationResult } from "express-validator";
import { ErrorHandler } from "../middlewares/error.js";
const validate = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(", ");
  // console.log(errorMessages);
  if (errors.isEmpty()) {
    return next();
  } else {
    return next(new ErrorHandler(errorMessages, 400));
  }
};
const registerValidator = () => [
  body("name", "Please enter you name").notEmpty(),
  body("username", "Please enter your username").notEmpty(),
  body("bio", "Please enter your bio").notEmpty(),
  body("password", "Please enter your password").notEmpty(),
  // check("avatar", "Please upload your avatar").notEmpty(),
];
const validateLogin = () => [
  body("username", "Please enter your username").notEmpty(),
  body("password", "Please enter your password").notEmpty(),
];

const createGroupChatValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please add Members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members should be 2-100"),
];

const addMembersValidator = () => [
  body("members")
    .notEmpty()
    .withMessage("Please add Members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members should be 1-97"),
  body("chatId", "Please provide Chat ID").notEmpty(),
];

const removeMembersValidator = () => [
  body("userId", "Please provide User ID").notEmpty(),
  body("chatId", "Please provide Chat ID").notEmpty(),
];

const leaveGroupValidator = () => [
  param("id", "Please provide Chat ID").notEmpty(),
];

const sendAttachmentsValidator = () => [
  body("chatId", "Please provide Chat ID").notEmpty(),
];

const getMessagesValidator = () => [
  param("id", "Please provide Chat ID").notEmpty(),
];

const getchatDetailsValidator = () => [
  param("id", "Please provide Chat ID").notEmpty(),
];

const renameGroupValidator = () => [
  param("id", "Please provide Chat ID").notEmpty(),
  body("name", "Please provide Group Name").notEmpty(),
];
const deleteChatsValidator = () => [
  param("id", "Please provide Chat ID").notEmpty(),
];
const sendRequestValidator = () => [
  body("userId", "Please enter your User ID").notEmpty(),
];

const acceptFriendRequestValidator = () => [
  body("requestId", "Please enter Request ID").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please Add Accept")
    .isBoolean()
    .withMessage("Accept must be boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "Please enter your secret key").notEmpty(),
];

export {
  registerValidator,
  validate,
  validateLogin,
  createGroupChatValidator,
  addMembersValidator,
  removeMembersValidator,
  leaveGroupValidator,
  sendAttachmentsValidator,
  getMessagesValidator,
  getchatDetailsValidator,
  renameGroupValidator,
  deleteChatsValidator,
  sendRequestValidator,
  acceptFriendRequestValidator,
  adminLoginValidator,
};

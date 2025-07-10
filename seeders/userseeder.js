import { faker, simpleFaker } from "@faker-js/faker";
import { User } from "../models/usermodel.js";
import { Chat } from "../models/chatmodel.js";
import { Message } from "../models/messagemodel.js";
const createUser = async (numberofUsers) => {
  try {
    const userPromise = [];
    for (let i = 0; i < numberofUsers; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.username(),
        bio: faker.lorem.sentence(10),
        password: "password",
        avatar: {
          url: faker.image.avatar(),
          public_id: faker.system.fileName(),
        },
      });
      //   console.log(tempUser);

      userPromise.push(tempUser);
    }
    // console.log("1", userPromise);
    // console.log("2", Promise.all(userPromise));

    await Promise.all(userPromise);
    // console.log(numberofUsers);

    // console.log("3", Promise.all(userPromise));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const createSingleChats = async (chatsCount) => {
  try {
    const users = await User.find().select("_id");
    const chatPromises = [];
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        chatPromises.push(
          Chat.create({
            name: faker.lorem.words(2),
            members: [users[i], users[j]],
          })
        );
      }
    }
    await Promise.all(chatPromises);
    // console.log(`Chats created successfully`);
    process.exit();
  } catch (error) {
    // console.log(error);
    process.exit(1);
  }
};

const createGroupChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");
    const chatsPromises = [];
    for (let i = 0; i < numChats; i++) {
      const numMembers = simpleFaker.number.int({ min: 3, max: users.length });
      const members = [];
      for (let j = 0; j < numMembers; j++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex];
        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }
      const chat = Chat.create({
        name: faker.lorem.words(2),
        groupChat: true,
        members,
        creator: members[0], // Assuming the first member is the creator
      });
      chatsPromises.push(chat);
    }
    await Promise.all(chatsPromises);
    // console.log(`Group chats created successfully`);
    process.exit();
  } catch (error) {
    // console.error(error);
    process.exit(1);
  }
};

const createmessages = async (numMessages) => {
  try {
    const users = await User.find().select("_id");
    const chats = await Chat.find().select("_id");
    const messagePromises = [];
    for (let i = 0; i < numMessages; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomchats = chats[Math.floor(Math.random() * chats.length)];
      messagePromises.push(
        Message.create({
          chat: randomchats,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }
    await Promise.all(messagePromises);
    // console.log(`Messages created successfully: ${messagePromises.length}`);
    process.exit();
  } catch (error) {
    // console.error(error);
    process.exit(1);
  }
};

const createmessagesInaChat = async (numMessages, chatId) => {
  try {
    const users = await User.find().select("_id");
    const messagePromises = [];
    for (let i = 0; i < numMessages; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      messagePromises.push(
        Message.create({
          chat: chatId,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }
    await Promise.all(messagePromises);
    console.log(
      `Messages created successfully in chat ${chatId}: ${messagePromises.length}`
    );
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export {
  createUser,
  createSingleChats,
  createGroupChats,
  createmessages,
  createmessagesInaChat,
};

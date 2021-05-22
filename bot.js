const { ApiClient } = require("twitch");
const { StaticAuthProvider } = require("twitch-auth");
const clientId = "q6batx0epp608isickayubi39itsckt";
const accessToken = process.env.OAUTH_TOKEN.substring(6);
const gameList = process.env.GAME_LIST;
var gameURL = "";
gameList.split(",").forEach(element => (gameURL += "&game_id=" + element));
const authProvider = new StaticAuthProvider(clientId, accessToken);
const apiClient = new ApiClient({ authProvider });
const { ChatClient } = require("twitch-chat-client");
const chatAuthProvider = new StaticAuthProvider(clientId, accessToken);
const request = require("request");
var chatClient;

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync(".data/db.json");
const db = low(adapter);

db.defaults({ channels: [] }).write();

var channelsToJoin = [];
var myCursor = "";

db.get("channels")
  .value()
  .forEach(element => channelsToJoin.push(element.channel));

async function handleJoin(channel) {
  console.log("JOINED " + channel);
  if (
    db
      .get("channels")
      .find({ channel: channel.slice(1, channel.length) })
      .value() == undefined
  )
    db.get("channels")
      .push({ channel: channel.slice(1, channel.length) })
      .write();
}
async function handleMessage(channel, user, message, msg) {
  console.log(channel + " " + user + " " + message);
}

function getMore() {
  request(
    "https://api.twitch.tv/helix/streams?first=100&after=" + myCursor + gameURL,
    {
      json: true,
      headers: {
        "Client-ID": clientId,
        Authorization: "Bearer " + accessToken
      }
    },
    (err, res, body) => {
      if (err) {
        myCursor = "";
        return console.log(err);
      }
      if (body && body.pagination && body.pagination.cursor) {
        myCursor = body.pagination.cursor;
      }
      if (body && body.data) {
        if (body.data.length == 0) myCursor = "";
        for (var i = 0; i < body.data.length; ++i) {
          if (
            db
              .get("channels")
              .find({ channel: body.data[i].user_login })
              .value() == undefined
          )
            channelsToJoin.push(body.data[i].user_login);
          else
            console.log(
              "Channel " + body.data[i].user_login + " already crawled"
            );
        }
      }
    }
  );
  setTimeout(getMore, 10000);
}
setTimeout(getMore, 10000);

async function startChat() {
  try {
    chatClient = new ChatClient(chatAuthProvider, {
      channels: [process.env.CHANNEL_NAME]
    });
    const onJoinListener = chatClient.onJoin(handleJoin);
    await chatClient.connect();
  } catch (error) {
    console.error(error);
  }
}
startChat();

function checkJoin() {
  var result = channelsToJoin.shift();
  if (result) {
    chatClient.join(result);
  }
  setTimeout(checkJoin, 333);
}
checkJoin();

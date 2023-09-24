let clients = [];
let activeUsernames = [];
const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;

const sendToAll = (type, content) => {
  const payload = JSON.stringify({ type, content });
  clients.forEach((client) => client.send(payload));
};

const handleChatMessage = (ws, message) => {
  sendToAll("CHAT_MESSAGE", `${message.username}: ${message.content}`);
};

const handleSetUsername = (ws, username) => {
  if (activeUsernames.includes(username)) {
    ws.send(JSON.stringify({ type: "USERNAME_TAKEN" }));
  } else {
    activeUsernames.push(username);
    ws.id = username;
    sendToAll("USER_JOINED", username);
    ws.send(JSON.stringify({ type: "USERNAME_SET" }));
  }
};

const handleGetActiveUsers = (ws) => {
  ws.send(JSON.stringify({ type: "ACTIVE_USERS", content: activeUsernames }));
};

const server = Bun.serve({
  port,
  host,
  fetch(req, server) {
    const success = server.upgrade(req);
    if (success) return undefined;
    return new Response(
      "Hello human, try the client, this is a server...or not?"
    );
  },
  websocket: {
    async open(ws) {
      clients.push(ws);
      console.log("New client connected!");
      console.log(`Total clients: ${clients.length}`);
    },
    async message(ws, message) {
      let parsedMessage;

      try {
        parsedMessage = JSON.parse(message);
      } catch (error) {
        console.error("Failed to parse message:", message);
        return;
      }

      switch (parsedMessage.type) {
        case "CHAT_MESSAGE":
          handleChatMessage(ws, parsedMessage);
          break;
        case "SET_USERNAME":
          handleSetUsername(ws, parsedMessage.username);
          break;
        case "GET_ACTIVE_USERS":
          handleGetActiveUsers(ws);
          break;
        default:
          console.warn("Unhandled message type:", parsedMessage.type);
          break;
      }
    },
    async close(ws) {
      const username = ws.id;
      activeUsernames = activeUsernames.filter(
        (activeUsername) => activeUsername !== username
      );
      clients = clients.filter((client) => client !== ws);
      sendToAll("USER_LEFT", username);
    },
  },
});

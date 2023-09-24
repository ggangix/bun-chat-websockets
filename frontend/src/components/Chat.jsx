import { useState, useEffect, useRef } from "react";
import "./Chat.css";
const webSocketUrl =
  import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:3000";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [username, setUsername] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [hasSetUsername, setHasSetUsername] = useState(false);
  const ws = useRef(null);

  const initializeWebSocket = () => {
    ws.current = new WebSocket(webSocketUrl);

    ws.current.onmessage = (event) => {
      let parsedData;

      try {
        parsedData = JSON.parse(event.data);
      } catch (error) {
        setMessages((prevMessages) => [...prevMessages, event.data]);
        return;
      }

      switch (parsedData.type) {
        case "USERNAME_TAKEN":
          setHasSetUsername(false);
          break;
        case "USERNAME_SET":
          setHasSetUsername(true);
          break;
        case "ACTIVE_USERS":
          setActiveUsers(parsedData.content);
          break;
        case "CHAT_MESSAGE":
          setMessages((prevMessages) => [...prevMessages, parsedData.content]);
          break;
        case "LEFT_CHAT":
          setActiveUsers((prevUsers) =>
            prevUsers.filter((user) => user !== parsedData.content)
          );
          break;
        case "USER_JOINED":
          setActiveUsers((prevUsers) => [...prevUsers, parsedData.content]);
          break;
        default:
          break;
      }
    };
  };

  useEffect(() => {
    if (!ws.current) {
      initializeWebSocket();
    }
    return () => {
      if (username !== "") ws.current.close(1000, username);
    };
  }, []);

  const sendMessage = () => {
    if (inputValue.trim() !== "") {
      const payload = {
        type: "CHAT_MESSAGE",
        username: username,
        content: inputValue,
      };
      ws.current.send(JSON.stringify(payload));
      setInputValue("");
    }
  };

  const handleTouch = (callback) => {
    let touchEnded = false;
    return {
      onTouchEnd: () => {
        touchEnded = true;
        callback();
      },
      onClick: () => {
        if (touchEnded) return;
        callback();
      },
    };
  };

  if (!hasSetUsername) {
    return (
      <div className="usernamePrompt">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username..."
        />
        <button
          {...handleTouch(() => {
            ws.current.send(JSON.stringify({ type: "SET_USERNAME", username }));
            ws.current.send(JSON.stringify({ type: "GET_ACTIVE_USERS" }));
          })}
        >
          Join Chat
        </button>
      </div>
    );
  }

  return (
    <div className="chatContainer">
      <div className="chatBox">
        <h2>Active Users</h2>
        <ul>
          {activeUsers.map((user, index) => (
            <li key={index}>{user}</li>
          ))}
        </ul>
        <h2>Chat</h2>
        {messages.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </div>
      <div className="chatInput">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <button {...handleTouch(sendMessage)}>Send</button>
      </div>
    </div>
  );
}

export default Chat;

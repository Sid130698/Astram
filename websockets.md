# Astram WebSocket Implementation

This document explains the WebSocket setup in the Astram project, covering both the backend (Spring Boot) and frontend (JavaScript) components.

## Backend (Spring Boot)

The backend uses Spring Boot with Spring WebSocket to create a STOMP-based message broker.

### 1. Configuration (`WebSocketConfig.java`)

The core of the backend WebSocket setup is in `backend/src/main/java/com/astram/backend/config/WebSocketConfig.java`.

- **`@EnableWebSocketMessageBroker`**: This annotation enables WebSocket message handling, backed by a message broker.

- **`registerStompEndpoints(StompEndpointRegistry registry)`**: This method registers a STOMP endpoint.
  - `registry.addEndpoint("/ws")`: This line exposes a WebSocket endpoint at `/ws`. Clients will connect to this URL.
  - `.setAllowedOriginPatterns("*")`: This allows connections from any origin, which is useful for development but might be tightened in production.
  - `.withSockJS()`: This enables SockJS as a fallback for browsers that don't support WebSockets natively.

- **`configureMessageBroker(MessageBrokerRegistry config)`**: This method configures the message broker.
  - `config.enableSimpleBroker("/topic")`: This enables a simple, in-memory message broker. It designates that messages whose destination starts with `/topic` will be routed to the broker, which then broadcasts them to all subscribed clients.
  - `config.setApplicationDestinationPrefixes("/app")`: This sets the prefix for application-level destinations. Messages sent by clients to destinations prefixed with `/app` (e.g., `/app/game.test`) will be routed to `@MessageMapping`-annotated methods in controller classes.

### 2. Message Handling (`GameMessageController.java`)

The `backend/src/main/java/com/astram/backend/controller/GameMessageController.java` handles incoming messages from clients.

- **`@MessageMapping("/game.test")`**: This annotation maps messages sent to the destination `/app/game.test` to the `handleTestMessage` method.

- **`@SendTo("/topic/game")`**: This annotation specifies that the return value of the `handleTestMessage` method should be sent to the `/topic/game` destination. The message broker then pushes this message to all clients subscribed to `/topic/game`.

- **`handleTestMessage(GameMessage message)`**: This method receives a `GameMessage` object from a client, logs it to the console, and then returns it. The returned message is then broadcast to all subscribers.

## Frontend (HTML & JavaScript)

The frontend implementation is in `frontend/test.html`. It uses `SockJS` and `Stomp.js` to communicate with the backend.

### 1. Connection

- **`connect()` function**: This function is called when the page loads.
- **`new SockJS('http://localhost:8080/ws')`**: It creates a new SockJS connection to the backend's `/ws` endpoint.
- **`Stomp.over(socket)`**: It creates a STOMP client over the SockJS connection.
- **`stompClient.connect({}, ...)`**: This initiates the connection to the STOMP broker.

### 2. Subscription

- **`stompClient.subscribe('/topic/game', ...)`**: Once connected, the client subscribes to the `/topic/game` destination.
- The callback function provided to `subscribe` is executed whenever a message is received on this topic. It parses the JSON message body and displays the content in the log area.

### 3. Sending Messages

- **`sendMessage()` function**: This function is triggered by clicking the "Send" button or pressing Enter.
- **`stompClient.send('/app/game.test', {}, ...)`**: It sends a message to the `/app/game.test` destination on the backend.
- The message payload is a JSON string containing the sender's name and the message content from the input fields.

## How It All Works Together

1.  **Handshake**: A user opens `test.html`. The JavaScript code initiates a WebSocket connection to `http://localhost:8080/ws`.
2.  **Subscription**: Once connected, the client subscribes to the `/topic/game` topic. It is now listening for messages from the server on this topic.
3.  **Sending a Message**: The user types a name and a message and clicks "Send". The browser sends a STOMP message to the `/app/game.test` destination.
4.  **Backend Processing**: The Spring Boot application receives the message. Because the destination is `/app/game.test`, it routes the message to the `handleTestMessage` method in `GameMessageController`.
5.  **Broadcasting**: The `handleTestMessage` method processes the message and returns it. The `@SendTo("/topic/game")` annotation causes the returned message to be sent to the `/topic/game` topic.
6.  **Receiving the Message**: The message broker broadcasts the message to all clients subscribed to `/topic/game`. All open browser tabs running the `test.html` page receive the message.
7.  **Display**: The subscription callback in the JavaScript code is executed, and the received message is displayed in the log area of each client's page.

## User Differentiation

In the current implementation (`test.html`), there is no formal user authentication or session management.

- **How it works**: Users are differentiated solely by the **sender name** they type into the "Your name" input field.
- **Scenario**: If you open two browser tabs and use "Player1" in the first tab and "Player2" in the second, the chat log will show messages from "Player1" and "Player2". The server simply echoes back the sender name it receives in the message payload.
- **Limitation**: This is a very basic mechanism. There is nothing stopping two users from using the same name. A more robust implementation would involve user accounts, sessions, and server-side validation to uniquely identify each connected client.

## Further Explanations

### What is `/game.test`?

The destination `/game.test` is an arbitrary endpoint name chosen by the developer. Think of it like a specific URL path in a REST API.

- **`/game`**: This part of the name is a convention to group related actions. It suggests that this endpoint is part of the "game" feature.
- **`/test`**: This part specifies the action. In this case, it's a "test" message.

The name is defined in the backend controller with the annotation `@MessageMapping("/game.test")`. You could change it to something more descriptive, like `@MessageMapping("/chat.sendMessage")` or `@MessageMapping("/player.updatePosition")`. The client would then need to send messages to that new destination (`/app/chat.sendMessage`).

The key is that the destination string in the client's `stompClient.send()` call must match the string in a `@MessageMapping` annotation on the server.

### WebSocket Messaging vs. REST API Calls

Your intuition to compare this to a REST `POST` request is a great starting point. Let's clarify the difference.

- **REST `POST` Request**: When you make a `POST` request to `/users`, the browser establishes a *new* HTTP connection to the server, sends the request and headers, gets a response, and then *closes* the connection. Every API call is a separate, self-contained transaction. This is **stateless**.

- **WebSocket `SEND` Command**: This is fundamentally different.
  1.  **Persistent Connection**: First, the client establishes a single, long-lived WebSocket connection to the server (at `/ws`). This connection stays open. Think of it as an open telephone line.
  2.  **Sending a Message**: When you call `stompClient.send('/app/game.test', ...)` you are **not** making a new HTTP POST request. Instead, you are sending a STOMP `SEND` frame (a packet of data) *through the existing WebSocket connection*.
  3.  **The `/app` Prefix**: This is not a URL path in the traditional sense. It's a prefix configured on the server (`setApplicationDestinationPrefixes("/app")`) that tells the Spring message broker: "Any message coming to a destination starting with `/app` should be routed to a controller method." The broker then strips the `/app` prefix and looks for a `@MessageMapping` that matches the rest of the destination (e.g., `/game.test`).

**Analogy:**

- **REST API**: Like sending a letter. You write it, address it, send it. The post office delivers it. The transaction is over. To communicate again, you must send a new letter.
- **WebSocket**: Like making a phone call. You dial once to establish a connection. Then, you can have a continuous, two-way conversation without needing to hang up and redial for every sentence. Sending a message is like speaking into the phone. The `/app/game.test` destination is like saying "Hey, I want to talk about the game test," directing your message to the right listener on the other end of the line.

### Deep Dive into the `/game.test` Endpoint

Let's get very specific about `/game.test`.

**1. Who "hits" the endpoint?**

- **The Client Hits It**: Any connected WebSocket client (like our `test.html` page) can send a message to this endpoint.
- **It's Not an HTTP Endpoint**: It's crucial to understand that **you cannot "hit" this endpoint with a tool like Postman or a standard browser URL**. It is not an HTTP endpoint. It is a **message destination** that only exists within the context of the WebSocket connection. The "hitting" is done by the `stompClient.send('/app/game.test', ...)` command in the JavaScript.

**2. For whom is the endpoint?**

- **It's for the Server-Side Controller**: The endpoint `/app/game.test` is a specific address for the `handleTestMessage` method in the `GameMessageController`. When the client sends a message to this destination, it's explicitly saying, "I want the `handleTestMessage` method on the server to process this message."

**3. Can it be dynamic? What would that mean?**

Yes, absolutely. This is a very powerful feature. "Dynamic" can mean a few things:

**A) Dynamic Destinations (Creating Chat Rooms)**

Imagine you want private chat rooms. You need a way for users to send messages to a specific room. You can achieve this with dynamic endpoints.

- **Backend Controller (`GameMessageController.java`)**:
  You would change the `@MessageMapping` to include a placeholder.

  ```java
  // The {roomId} is a placeholder
  @MessageMapping("/chat/{roomId}")
  // The @DestinationVariable extracts the value from the path
  // The return value is sent to a dynamic topic, e.g., /topic/chat/room123
  @SendTo("/topic/chat/{roomId}")
  public GameMessage handleChatMessage(@DestinationVariable String roomId, GameMessage message) {
      // Now you know the message was for a specific room
      System.out.println("Received message for room " + roomId);
      return message;
  }
  ```

- **Frontend Client (`test.html`)**:
  The client would then send messages to a specific room's destination.

  ```javascript
  // Let's say the user joined room "room123"
  const currentRoomId = "room123";

  function sendMessageToRoom(messageContent) {
      stompClient.send(
          `/app/chat/${currentRoomId}`, // The destination is now dynamic
          {},
          JSON.stringify({ content: messageContent, sender: 'Player1' })
      );
  }

  // The client must also SUBSCRIBE to the dynamic topic to get messages for that room
  stompClient.subscribe(`/topic/chat/${currentRoomId}`, function(message) {
      // This will only receive messages sent to "room123"
      log("Message from room: " + JSON.parse(message.body).content);
  });
  ```

- **What This Means**: This is the foundation of multi-room chat or game lobbies. By using a dynamic `{roomId}` in the message destination, you create a system where:
  - The server can handle messages for thousands of rooms with a single controller method.
  - Clients can send messages to a specific room.
  - Clients only receive messages for the rooms they are subscribed to.

**B) Dynamic Payloads**

The content of the message itself is also dynamic. The `GameMessage` object can be expanded to include different types of information, allowing you to handle various actions through the same endpoint.

```java
// In GameMessage.java
public enum MessageType {
    CHAT,
    JOIN,
    LEAVE,
    PLAYER_MOVE
}
private MessageType type;
// ... other fields
```

Your controller could then inspect the `type` field and perform different logic based on its value, even if all messages arrive at the same `/app/game.action` endpoint.

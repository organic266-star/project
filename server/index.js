// Import required modules
import express from "express"; 
import dotenv from "dotenv";  
import cors from "cors";  
import cookieParser from "cookie-parser"; 
import { createServer } from "http";  
import { Server } from "socket.io";  
 
// Import custom route files
import authRoute from "./rout/authRout.js"; 
import userRoute from "./rout/userRout.js";  
import dbConnection from "./db/dbConnect.js";  

//  Load environment variables (from `.env` file)
dotenv.config();

//  Create an Express application
const app = express(); 
  
//  Set up server port (from `.env` or default to 3000)
const PORT = process.env.PORT || 3000;

//  Create an HTTP server to work with Express (needed for WebSockets)
const server = createServer(app);

//  Allowed frontend origins for CORS (Cross-Origin Resource Sharing)
const allowedOrigins = ["https://project-1-32rc.onrender.com"]; 
console.log(allowedOrigins);  
//  Middleware to handle CORS

app.use(cors({
  origin: function(origin, callback){
    if(!origin || allowedOrigins.includes(origin)){
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET","POST","PUT","DELETE"]
}));
// 🛠 Middleware for handling JSON requests and cookies
app.use(express.json());  
app.use(cookieParser());  

//  Define API routes
app.use("/api/auth", authRoute); 
app.use("/api/user", userRoute);  


//  Test Route to check if the server is running
app.get("/ok", (req, res) => {
  res.json({ message: "Server is running!" });  
});

//  Initialize Socket.io for real-time communication
const io = new Server(server, {
  pingTimeout: 60000,  
  cors: {
    origin: allowedOrigins,  
    methods: ["GET", "POST"],  
    credentials: true, 
  },
});
console.log("[SUCCESS] Socket.io initialized with CORS"); 

//  Store online users and active calls
let onlineUsers = [];  
const activeCalls = new Map();  

//  Handle WebSocket (Socket.io) connections
io.on("connection", (socket) => {
  console.log(`[INFO] New connection: ${socket.id}`);  

  // 🔹 Emit an event to send the socket ID to the connected user
  socket.emit("me", socket.id);

  //  User joins the chat system
  socket.on("join", (user) => {
    if (!user || !user.id) {
      console.warn("[WARNING] Invalid user data on join");  
      return;
    }

    socket.join(user.id); // 🔹 Add user to a room with their ID
    const existingUser = onlineUsers.find((u) => u.userId === user.id);  

    if (existingUser) {
      existingUser.socketId = socket.id; // Update socket ID if user reconnects
    } else {
      //  Add new user to online users list
      onlineUsers.push({
        userId: user.id,
        name: user.name,
        socketId: socket.id,
      });
    }

    io.emit("online-users", onlineUsers);  
  });

  //  Handle outgoing call request
  socket.on("callToUser", (data) => {
    const callee = onlineUsers.find((user) => user.userId === data.callToUserId); // Find the user being called

    if (!callee) {
      socket.emit("userUnavailable", { message: "User is offline." }); // ❌ Notify caller if user is offline
      return;
    }

    //  If the user is already in another call
    if (activeCalls.has(data.callToUserId)) {
      socket.emit("userBusy", { message: "User is currently in another call." });

      io.to(callee.socketId).emit("incomingCallWhileBusy", {
        from: data.from,
        name: data.name,
        email: data.email,
        profilepic: data.profilepic,
      });

      return;
    }

    //  Emit an event to the receiver's socket (callee)
    io.to(callee.socketId).emit("callToUser", {
      signal: data.signalData, // WebRTC signal data
      from: data.from, // Caller ID
      name: data.name, // Caller name
      email: data.email, // Caller email
      profilepic: data.profilepic, // Caller profile picture
    });
  });

  //  Handle when a call is accepted
  socket.on("answeredCall", (data) => {
    io.to(data.to).emit("callAccepted", {
      signal: data.signal, // WebRTC signal
      from: data.from, // Caller ID
    });

    //  Track active calls in a Map
    activeCalls.set(data.from, { with: data.to, socketId: socket.id });
    activeCalls.set(data.to, { with: data.from, socketId: data.to });
  });

  //  Handle call rejection
  socket.on("reject-call", (data) => {
    io.to(data.to).emit("callRejected", {
      name: data.name, // Rejected user's name
      profilepic: data.profilepic // Rejected user's profile picture
    });
  });

  //  Handle call ending
  socket.on("call-ended", (data) => {
    io.to(data.to).emit("callEnded", {
      name: data.name, // User who ended the call
    });

    //  Remove call from active calls
    activeCalls.delete(data.from);
    activeCalls.delete(data.to);
  });

  //  Handle user disconnecting from the server
  socket.on("disconnect", () => {
    const user = onlineUsers.find((u) => u.socketId === socket.id);  
    if (user) {
      activeCalls.delete(user.userId);  

      //  Remove all calls associated with this user
      for (const [key, value] of activeCalls.entries()) {
        if (value.with === user.userId) activeCalls.delete(key);
      }
    }

    //  Remove user from the online users list
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    
    //  Broadcast updated online users list
    io.emit("online-users", onlineUsers);

    //  Notify others that the user has disconnected
    socket.broadcast.emit("discounnectUser", { disUser: socket.id });

    console.log(`[INFO] Disconnected: ${socket.id}`); // Debugging: User disconnected
  });
});

//  Start the server after connecting to the database
(async () => {
  try {
    await dbConnection(); // Connect to MongoDB
    server.listen(PORT, () => {
      console.log(` Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(" Failed to connect to the database:", error);
    process.exit(1); // Exit the process if the database connection fails
  }
})();

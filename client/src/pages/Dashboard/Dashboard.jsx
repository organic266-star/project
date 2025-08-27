import React, { use, useEffect, useRef, useState } from 'react';
import socketInstance from '../components/socketio/VideoCallSocket';
import { FaBars, FaTimes, FaPhoneAlt, FaMicrophone, FaVideo, FaVideoSlash, FaMicrophoneSlash } from "react-icons/fa";
import Lottie from "lottie-react";
import { Howl } from "howler";
import wavingAnimation from "../../assets/waving.json";
import { FaPhoneSlash } from "react-icons/fa6";
import apiClient from "../../apiClient";
import { useUser } from '../../context/UserContextApi';
import { RiLogoutBoxLine } from "react-icons/ri";
import { useNavigate } from 'react-router-dom';
import Peer from 'simple-peer'


//ringtone for incoming call 
const ringtone = new Howl({
  src: ["/ringtone.mp3"],
  loop: true,      
  volume: 1.0,
  html5: true,    
});


  //  ringtone for calling user
const ringtone2 = new Howl({
    src: ["/ringtone2.mp3"],  
    loop: true,   
    volume: 1.0,  
  });



  
const Dashboard = () => {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOnline, setUserOnline] = useState([]);
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const myVideo = useRef(null);
  const reciverVideo = useRef(null);
  const connectionRef = useRef(null);
  const hasJoined = useRef(false);

  const [reciveCall, setReciveCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerWating, setCallerWating] = useState(false)

  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [rejectorData, setCallrejectorData] = useState(null);


  // 🔹 State to track microphone & video status
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

 

 
 
  const socket = socketInstance.getSocket();

  useEffect(() => {
    
    
    if (user && socket && !hasJoined.current) {
      
      socket.emit("join", { id: user._id, name: user.username });
     
      hasJoined.current = true;
    }
     
    socket.on("me", (id) => setMe(id));
    
    socket.on("callToUser", (data) => {
      setReciveCall(true);   
      setCaller(data);       
      setCallerName(data.name);   
      setCallerSignal(data.signal);   
      
      ringtone.play();
    });
    // Listen for "callRejected" event, which is triggered when the other user declines the call.
    socket.on("callRejected", (data) => {
      setCallRejectedPopUp(true);
      setCallrejectorData(data);
      
      ringtone.stop();
      ringtone2.stop();
    });
    // Listen for "callEnded" event, which is triggered when the other user ends the call.
    socket.on("callEnded", (data) => {
      console.log("Call ended by", data.name);  
      ringtone.stop();
      ringtone2.stop();
      endCallCleanup();  
    });
    // Listen for "userUnavailable" event, meaning the user being called is not online.
    socket.on("userUnavailable", (data) => {
      alert(data.message || "User is not available.");  
    });
    // Listen for "userBusy" event, meaning the user is already on another call.
    socket.on("userBusy", (data) => {
      alert(data.message || "User is currently in another call.");  
    });
    // Listen for "online-users" event, which provides the list of currently online users.
    socket.on("online-users", (onlineUsers) => {
       console.log("Online users from server:", onlineUsers);
      setUserOnline(onlineUsers);  
    });
    // Cleanup function: Runs when the component unmounts or dependencies change.
    return () => {
      socket.off("me");   
      socket.off("callToUser");   
      socket.off("callRejected");   
      socket.off("callEnded");  
      socket.off("userUnavailable");   
      socket.off("userBusy");  
      socket.off("online-users");   
    };
  }, [user, socket]);  


  const startCall = async () => {
    try {
      //  Request access to the user's media devices (camera & microphone)
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,  
        audio: {
          echoCancellation: true,  
          noiseSuppression: true   
        }
      });
      
      setStream(currentStream);
      //  Assign the stream to the local video element for preview
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
        myVideo.current.muted = true;  
        myVideo.current.volume = 0;    
      }
      
      currentStream.getAudioTracks().forEach(track => (track.enabled = true));
    
      setCallRejectedPopUp(false);
      setIsSidebarOpen(false);
      setCallerWating(true); 
      setSelectedUser(modalUser._id);
      //  Create a new Peer connection (WebRTC) as the call initiator
      const peer = new Peer({
        initiator: true,  
        trickle: false,   
        stream: currentStream  
      });
      //  Handle the "signal" event (this occurs when the WebRTC handshake is initiated)
      peer.on("signal", (data) => {
        //  Emit a "callToUser" event to the server with necessary call details
        socket.emit("callToUser", {
          callToUserId: modalUser._id, 
          signalData: data,  
          from: me,  
          name: user.username, 
          email: user.email,  
          profilepic: user.profilepic,  
      
        });
      });
ringtone2.play();
      //  Handle the "stream" event (this is triggered when the remote user's media stream is received)
      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream;  
          reciverVideo.current.muted = false;  
          reciverVideo.current.volume = 1.0;  
        }
      });
      //  Listen for "callAccepted" event from the server (when the recipient accepts the call)
      socket.once("callAccepted", (data) => {
        setCallRejectedPopUp(false);
        setCallAccepted(true);  
        setCallerWating(false); 
        setCaller(data.from); 
        peer.signal(data.signal);  

   ringtone.stop();
  ringtone2.stop();
      });
      //  Store the peer connection reference to manage later (like ending the call)
      connectionRef.current = peer;
      //  Close the user detail modal after initiating the call
      setShowUserDetailModal(false);
    } catch (error) {
      console.error("Error accessing media devices:", error);  
    }
  };

  const handelacceptCall = async () => {
    // Stop ringtone when call is accepted

    ringtone.stop();
    ringtone2.stop();

    try {
      //  Request access to the user's media devices (camera & microphone)
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,  
        audio: {
          echoCancellation: true,  
          noiseSuppression: true   
        }
      });

      //  Store the stream in state so it can be used later
      setStream(currentStream);

      //  Assign the stream to the local video element for preview
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      // Ensure that the audio track is enabled
      currentStream.getAudioTracks().forEach(track => (track.enabled = true));

      // Update call state
      setCallAccepted(true);  
      setReciveCall(true);  
      setCallerWating(false); 
      setIsSidebarOpen(false);  

      //  Create a new Peer connection as the receiver (not the initiator)
      const peer = new Peer({
        initiator: false,  
        trickle: false, 
        stream: currentStream  
      });

      //  Handle the "signal" event (this occurs when the WebRTC handshake is completed)
      peer.on("signal", (data) => {
        socket.emit("answeredCall", {
          signal: data, 
          from: me, 
          to: caller.from, 
        });
      });

      //  Handle the "stream" event (this is triggered when the remote user's media stream is received)
      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream; 
          reciverVideo.current.muted = false; 
          reciverVideo.current.volume = 1.0; 
        }
      });

      // ✅ If there's an incoming signal (from the caller), process it
      if (callerSignal) peer.signal(callerSignal);

      // ✅ Store the peer connection reference to manage later (like ending the call)
      connectionRef.current = peer;
    } catch (error) {
      console.error("Error accessing media devices:", error); 
    }
  };

  const handelrejectCall = () => {
    // ✅ Stop ringtone when call is accepted
    ringtone.stop();
    ringtone2.stop();

    // ✅ Update the state to indicate that the call is rejected
    setCallerWating(false);
    setReciveCall(false); 
    setCallAccepted(false); 

    // ✅ Notify the caller that the call was rejected
    socket.emit("reject-call", {
      to: caller.from, 
      name: user.username, 
      profilepic: user.profilepic 
    });
  };

  const handelendCall = () => {
     
    console.log("🔴 Sending call-ended event...");
    //  Stop ringtone when call is accepted
    ringtone.stop();
    ringtone2.stop();
    
    socket.emit("call-ended", {
      to: caller?.from || selectedUser,  
      name: user.username 
    });

    endCallCleanup();
  };

  const endCallCleanup = () => {
    // Stop all media tracks (video & audio) to release device resources
    console.log("🔴 Stopping all media streams and resetting call...");
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());  
    }
    if (reciverVideo.current) {
      console.log("🔴 Clearing receiver video");
      reciverVideo.current.srcObject = null;
    }
    if (myVideo.current) {
      console.log("🔴 Clearing my video");
      myVideo.current.srcObject = null;
    }
    connectionRef.current?.destroy();
    
    ringtone.stop();
    ringtone2.stop();
    setCallerWating(false);
    setStream(null); 
    setReciveCall(false); 
    setCallAccepted(false);  
    setSelectedUser(null); 
    setTimeout(() => {
      window.location.reload();  
    }, 100);
  };


  // 🎤 Toggle Microphone
  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // const toggleCam = () => {
  //   if (stream) {
  //     const videoTrack = stream.getVideoTracks()[0];
  //     if (videoTrack) {
  //       videoTrack.enabled = !isCamOn;
  //       setIsCamOn(videoTrack.enabled);
  //     }
  //   }
  // };

  function createBlackVideoTrack() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const stream = canvas.captureStream();
  return stream.getVideoTracks()[0];
}


const toggleCam = async () => {
  if (!connectionRef.current || !stream) return;
  const peer = connectionRef.current;
  const videoTrack = stream.getVideoTracks()[0];

  if (isCamOn) {
    // 🔴 Turn OFF → stop the real camera track
    if (videoTrack) {
      videoTrack.stop();
      stream.removeTrack(videoTrack);
    }

    // Add black dummy track so remote sees black
    const blackTrack = createBlackVideoTrack();
    peer.replaceTrack(videoTrack, blackTrack, stream);
    stream.addTrack(blackTrack);

    if (myVideo.current) {
      // ✅ Always use full stream
      myVideo.current.srcObject = stream;
    }
    setIsCamOn(false);

  } else {
    // 🟢 Turn ON → request real camera again
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const newVideoTrack = newStream.getVideoTracks()[0];

      const oldTrack = stream.getVideoTracks()[0]; // currently black track
      peer.replaceTrack(oldTrack, newVideoTrack, stream);
      stream.removeTrack(oldTrack);
      stream.addTrack(newVideoTrack);

      if (myVideo.current) {
        // ✅ Use the updated stream with real camera track
        myVideo.current.srcObject = stream;
      }
      setIsCamOn(true);

    } catch (err) {
      console.error("Error turning camera back on:", err);
    }
  }
};





  const allusers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user');
      if (response.data.success !== false) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    allusers();
  }, []);

  const isOnlineUser = (userId) => userOnline.some((u) => u.userId === userId);

  const handelSelectedUser = (userId) => {
    if (callAccepted || reciveCall) {
      alert("You must end the current call before starting a new one.");
      return;
    }
    const selected = filteredUsers.find(user => user._id === userId);
    setModalUser(selected);
    setShowUserDetailModal(true);
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    if (callAccepted || reciveCall) {
      alert("You must end the call before logging out.");
      return;
    }
    try {
      await apiClient.post('/auth/logout');
      socket.off("disconnect");
      socket.disconnect();
      socketInstance.setSocket();
      updateUser(null);
      localStorage.removeItem("userData");
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  console.log(callerWating);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-br from-blue-900 to-purple-800 text-white w-64 h-full p-4 space-y-4 fixed z-20 transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
      >

         {/* 🔹 Logo Section */}
  <div className="flex items-center gap-3 mb-6">
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 font-bold text-lg">
      C
    </div>
    <h1 className="text-xl font-bold tracking-wide">ChatSphere</h1>

     <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes />
          </button>
  </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>
          
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 mb-2"
        />

        {/* User List */}
        <ul className="space-y-4 overflow-y-auto">
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedUser === user._id
                ? "bg-green-600"
                : "bg-gradient-to-r from-purple-600 to-blue-400"
                }`}
              onClick={() => handelSelectedUser(user._id)}
            >
              <div className="relative">
                <img
                  src={user.profilepic || "/default-avatar.png"}
                  alt={`${user.username}'s profile`}
                  className="w-10 h-10 rounded-full border border-white"
                />
                {isOnlineUser(user._id) && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full shadow-lg animate-bounce"></span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{user.username}</span>
                <span className="text-xs text-gray-400 truncate w-32">
                  {user.email}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Logout */}
        {user && <div
          onClick={handleLogout}
          className="absolute bottom-2 left-4 right-4 flex items-center gap-2 bg-red-400 px-4 py-1 cursor-pointer rounded-lg"
        >
          <RiLogoutBoxLine />
          Logout
        </div>}
      </aside>

      {/* Main Content */}
      {selectedUser || reciveCall || callAccepted ? (
        <div className="relative w-full h-screen bg-black flex items-center justify-center">
          {/* Remote Video */}
          {callerWating ? <div>
              <div className="flex flex-col items-center">
                <p className='font-black text-xl mb-2'>User Details</p>
                <img
                  src={modalUser.profilepic || "/default-avatar.png"}
                  alt="User"
                  className="w-20 h-20 rounded-full border-4 border-blue-500 animate-bounce"
                />
                <h3 className="text-lg font-bold mt-3 text-white">{modalUser.username}</h3>
                <p className="text-sm text-gray-300">{modalUser.email}</p>
              </div>
            </div> : 
          <video
            ref={reciverVideo}
            autoPlay
            className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
          />
          }
          {/* Local PIP Video */}
         <div className="absolute bottom-[75px] md:bottom-0 right-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg flex items-center justify-center w-32 h-40 md:w-56 md:h-52">
  
    <video
      ref={myVideo}
              autoPlay
              playsInline
              className="w-32 h-40 md:w-56 md:h-52 object-cover rounded-lg"
    />
 
</div>


          {/* Username + Sidebar Button */}
          <div className="absolute top-4 left-4 text-white text-lg font-bold flex gap-2 items-center">
            <button
              type="button"
              className="md:hidden text-2xl text-white cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars />
            </button>
            {callerName || "Caller"}
          </div>

          {/* Call Controls */}
          <div className="absolute bottom-4 w-full flex justify-center gap-4">
            <button
              type="button"
              className="bg-red-600 p-4 rounded-full text-white shadow-lg cursor-pointer"
              onClick={handelendCall}
            >
              <FaPhoneSlash size={24} />
            </button>
            {/* 🎤 Toggle Mic */}
            <button
              type="button"
              onClick={toggleMic}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isMicOn ? "bg-green-600" : "bg-red-600"
                }`}
            >
              {isMicOn ? <FaMicrophone size={24} /> : <FaMicrophoneSlash size={24} />}
            </button>

            {/* 📹 Toggle Video */}
            <button
              type="button"
              onClick={toggleCam}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isCamOn ? "bg-green-600" : "bg-red-600"
                }`}
            >
              {isCamOn ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
            </button>


          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 md:ml-72 text-white">
          {/* Mobile Sidebar Toggle */}
          <button
            type="button"
            className="md:hidden text-2xl text-black mb-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars />
          </button>

          {/* Welcome */}
          <div className="flex items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
            <div className="w-20 h-20">
              <Lottie animationData={wavingAnimation} loop autoplay />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Hey {user?.username || "Guest"}! 👋
              </h1>
              <p className="text-lg text-gray-300 mt-2">
                Ready to <strong>connect with friends instantly?</strong>
                Just <strong>select a user</strong> and start your video call! 🎥✨
              </p>
            </div>
          </div>

          {/* Instructions */}
          
        </div>
      )}
      {/*call user pop up */}
      {showUserDetailModal && modalUser && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className='font-black text-xl mb-2'>User Details</p>
              <img
                src={modalUser.profilepic || "/default-avatar.png"}
                alt="User"
                className="w-20 h-20 rounded-full border-4 border-blue-500"
              />
              <h3 className="text-lg font-bold mt-3">{modalUser.username}</h3>
              <p className="text-sm text-gray-500">{modalUser.email}</p>

              <div className="flex gap-4 mt-5">
                <button
                  onClick={() => {
                    setSelectedUser(modalUser._id);
                    startCall(); // function that handles media and calling
                    setShowUserDetailModal(false);
                  }}
                  className="bg-green-600 text-white px-4 py-1 rounded-lg w-28 flex items-center gap-2 justify-center"
                >
                  Call <FaPhoneAlt />
                </button>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="bg-gray-400 text-white px-4 py-1 rounded-lg w-28"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Call rejection PopUp */}
      {callRejectedPopUp && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call Rejected From...</p>
              <img
                src={rejectorData.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
              />
              <h3 className="text-lg font-bold mt-3">{rejectorData.name}</h3>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    startCall(); // function that handles media and calling
                  }}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Call Again <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    endCallCleanup();
                    setCallRejectedPopUp(false);
                    setShowUserDetailModal(false);
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Back <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Incoming Call Modal */}
      {reciveCall && !callAccepted && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call From...</p>
              <img
                src={caller?.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
              />
              <h3 className="text-lg font-bold mt-3">{callerName}</h3>
              <p className="text-sm text-gray-500">{caller?.email}</p>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={handelacceptCall}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Accept <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={handelrejectCall}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Reject <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default Dashboard;
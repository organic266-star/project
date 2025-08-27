import { io } from "socket.io-client";

let socket;

const getSocket = () => {
    if (!socket) {
        socket = io("https://chatsphere-anva.onrender.com")
    }
    return socket;
}

const setSocket = () => {
    socket = null;
}

export default {
    getSocket, setSocket
}

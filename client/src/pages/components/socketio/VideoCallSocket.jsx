import { io } from "socket.io-client";

let socket;

const getSocket = () => {
    if (!socket) {
        socket = io("http://localhost:3000")
    }
    return socket;
}

const setSocket = () => {
    socket = null;
}

export default {
    getSocket, setSocket
}
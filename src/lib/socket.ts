import { Server, Socket } from "socket.io";

let io: Server;

export function initSocket(server: any){
    if(!io){
        io = new Server(server, {
            cors: {
                origin: "*",
            },
        });

        io.on("connection", (socket) => {
            console.log("Client Connected:", socket.id);

            socket.on("disconnect", () => {
                console.log("Disconnected:", socket.id);
            })
        });
    }
    return io;
}

export function getIO(){
    if(!io){
        throw new Error("Socket.io not initialized");
    }

    return io;
}
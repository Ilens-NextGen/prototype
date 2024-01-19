import io from 'socket.io-client';
const socket = io(
    import.meta.env.VITE_SOCKET_URL,
    {
        transports: ['websocket', 'polling', 'flashsocket'],
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 10,
        upgrade: false,
    }
);




socket.on('connect', () => {
    console.log('connected');
    }
);

socket.on('disconnect', () => {
    console.warn('disconnected');
    }
);

socket.on('connect_error', (err) => {
    console.warn(err);
    }

);

socket.on('connect_timeout', (timeout) => {
    console.error(timeout);
    }
);

socket.on('error', (error) => {
    console.error(error);
    }
);


export default socket;

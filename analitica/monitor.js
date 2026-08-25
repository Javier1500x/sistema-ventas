let visibilityState = document.visibilityState;
let lastActivityTime = Date.now();
let activityTimeout;
const ACTIVITY_DEBOUNCE_TIME = 1000; // Un segundo de gracia para agrupar eventos

const sendActivityEvent = (socket, eventType, data = {}) => {
    if (socket && socket.connected) {
        socket.emit('frontendActivity', {
            eventType,
            visibilityState,
            lastActivityTime: new Date(lastActivityTime).toISOString(),
            ...data
        });
    }
};

const handleVisibilityChange = (socket) => {
    visibilityState = document.visibilityState;
    console.log(`[Monitor Frontend] Visibilidad: ${visibilityState}`);
    sendActivityEvent(socket, 'visibilityChange', { newVisibilityState: visibilityState });
};

const handleUserActivity = (socket) => {
    lastActivityTime = Date.now();
    if (activityTimeout) {
        clearTimeout(activityTimeout);
    }
    activityTimeout = setTimeout(() => {
        sendActivityEvent(socket, 'userActivity');
    }, ACTIVITY_DEBOUNCE_TIME);
};

export const initializeFrontendMonitor = (socket, userId) => {
    if (!socket) {
        console.warn("[Monitor Frontend] Socket.io no disponible para inicializar el monitor.");
        return;
    }

    console.log(`[Monitor Frontend] Inicializando monitor de actividad para usuario: ${userId}`);

    // Enviar estado inicial al cargar la página
    sendActivityEvent(socket, 'initialLoad', { userId });

    // Manejar cambios de visibilidad de la página
    document.addEventListener('visibilitychange', () => handleVisibilityChange(socket));

    // Manejar actividad del usuario (debounce para evitar sobrecargar)
    document.addEventListener('mousemove', () => handleUserActivity(socket));
    document.addEventListener('keydown', () => handleUserActivity(socket));
    document.addEventListener('scroll', () => handleUserActivity(socket));

    // Emitir periódicamente un "heartbeat" si la página está visible pero sin actividad reciente
    setInterval(() => {
        if (document.visibilityState === 'visible' && (Date.now() - lastActivityTime) > (ACTIVITY_DEBOUNCE_TIME * 5)) {
            sendActivityEvent(socket, 'heartbeat');
        }
    }, 30000); // Cada 30 segundos
};

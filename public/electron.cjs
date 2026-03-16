const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

// Mantén una referencia global del objeto window, si no lo haces, la ventana 
// se cerrará automáticamente cuando el objeto JavaScript sea recolectado por el garbage collector.
let mainWindow;

// Inicia el servidor de backend
const backendPath = path.join(__dirname, '..', 'backend', 'server.js');

// Configuración de entorno para el backend
const env = { ...process.env };

if (app.isPackaged || process.env.NODE_ENV !== 'development') {
    // En producción, guardamos la DB en la carpeta de datos de usuario para evitar bloqueos de Windows
    const userDataPath = app.getPath('userData');
    env.DB_PATH = path.join(userDataPath, 'inventory.db');
} else {
    // En desarrollo, usamos la carpeta local
    env.DB_PATH = path.join(__dirname, '..', 'backend', 'inventory.db');
}

const backendProcess = fork(backendPath, [], {
    env,
    stdio: 'inherit' // Permite ver los logs del backend en la consola de Electron
});

function createWindow() {
    // Crea la ventana del navegador.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Carga el index.html de la app.
    if (process.env.NODE_ENV === 'development') {
        // En desarrollo, carga el servidor de Vite
        mainWindow.loadURL('http://localhost:5173');
        // Abre las DevTools.
        mainWindow.webContents.openDevTools();
    } else {
        // En producción, carga el archivo build/index.html
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    // Se emite cuando la ventana se cierra.
    mainWindow.on('closed', function () {
        // Elimina la referencia al objeto window, usualmente guardarías las ventanas
        // en un array si tu app soporta múltiples ventanas, este es el momento
        // en el que deberías eliminar el elemento correspondiente.
        mainWindow = null;
    });
}

// Este método será llamado cuando Electron haya terminado
// la inicialización y esté listo para crear ventanas del navegador.
// Algunas APIs solo pueden ser usadas después de que este evento ocurra.
app.on('ready', createWindow);

// Sal cuando todas las ventanas hayan sido cerradas.
app.on('window-all-closed', function () {
    // En macOS es común para las aplicaciones y sus barras de menú
    // que permanezcan activas hasta que el usuario salga explícitamente con Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    // Termina el proceso del backend cuando la app de Electron se cierra
    backendProcess.kill();
});

app.on('activate', function () {
    // En macOS es común volver a crear una ventana en la app cuando el
    // icono del dock es presionado y no hay otras ventanas abiertas.
    if (mainWindow === null) {
        createWindow();
    }
});

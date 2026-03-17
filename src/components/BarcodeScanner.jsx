import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';
import { playBeep } from '../utils/audio';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [error, setError] = useState('');
  const [isCamsLoaded, setIsCamsLoaded] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode;
    let isMounted = true;
    let startPromise = null;

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          if (!isMounted) return; // componente desmontado antes de recibir cámaras
          setIsCamsLoaded(true);
          
          // Asegurar que no hay otra instancia anclada
          html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;
          
          startPromise = html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0
            },
            (decodedText, decodedResult) => {
              // Successfully decoded
              playBeep();
              onScan(decodedText);
            },
            (errorMessage) => {
              // Ignore standard parse errors
            }
          );
          
          await startPromise;
        } else {
          if (isMounted) setError('No se encontraron cámaras disponibles.');
        }
      } catch (err) {
        console.error("Error starting scanner:", err);
        if (isMounted) setError('Error al acceder a la cámara. Asegúrate de dar los permisos.');
      }
    };

    // Agregar un pequeño retraso para permitir que el DOM renderice el div #reader perfectamente
    const timeoutId = setTimeout(() => {
        startScanner();
    }, 100);

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      if (scannerRef.current) {
        if (startPromise) {
          // Esperar a que inicie para poder detenerlo sin romper la librería
          startPromise.then(() => {
            scannerRef.current.stop()
              .then(() => {
                scannerRef.current.clear();
              })
              .catch(err => console.error("Error stopping scanner", err));
          }).catch(err => console.error("Start promise failed so no need to stop", err));
        }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
        <div className="p-4 bg-violet-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-2 font-bold">
            <Camera size={20} />
            Escanear Código
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-violet-500 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 min-h-[300px] flex flex-col justify-center bg-slate-50 relative">
          {error ? (
            <div className="text-center text-red-500 flex flex-col items-center p-4">
              <AlertCircle size={40} className="mb-2 opacity-50" />
              <p className="font-semibold text-sm">{error}</p>
              <button 
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {!isCamsLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border-2 border-slate-200"></div>
              <p className="text-center text-xs text-slate-500 mt-4">
                Apunta la cámara al código de barras del producto. Se agregará automáticamente.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;

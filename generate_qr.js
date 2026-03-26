import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const url = 'https://sistema-ventas-tjby.onrender.com/#catalog';
const outputPath = 'public/catalog_qr.png';

async function generateQR() {
    try {
        await QRCode.toFile(outputPath, url, {
            color: {
                dark: '#4f46e5', // Indigo-600 to match theme
                light: '#ffffff'
            },
            width: 512,
            margin: 2
        });
        console.log(`QR Code generated successfully at ${outputPath}`);
    } catch (err) {
        console.error('Error generating QR code:', err);
    }
}

generateQR();

const https = require('https');

/**
 * Envía un mensaje por WhatsApp usando CallMeBot
 * @param {string} phone Número en formato internacional (+34...)
 * @param {string} apiKey Clave de CallMeBot
 * @param {string} text Mensaje a enviar
 */
const sendWhatsAppMessage = (phone, apiKey, text) => {
    return new Promise((resolve, reject) => {
        if (!phone || !apiKey) {
            console.warn('Notification skipped: Phone or API Key missing.');
            return resolve(false);
        }

        const encodedText = encodeURIComponent(text);
        // CallMeBot WhatsApp URL
        const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedText}&apikey=${apiKey}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('WhatsApp notification sent successfully');
                    resolve(true);
                } else {
                    console.error('CallMeBot WhatsApp error:', data);
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.error('Error sending WhatsApp notification:', err.message);
            reject(err);
        });
    });
};

/**
 * Envía una alerta de stock bajo por WhatsApp
 * @param {string} phone 
 * @param {string} apiKey 
 * @param {string} productName 
 * @param {number} currentStock 
 */
const sendLowStockAlert = async (phone, apiKey, productName, currentStock) => {
    const message = `⚠️ *Alerta de Stock Bajo* ⚠️\n\nEl producto *${productName}* se está agotando. \nStock actual: *${currentStock}*\n\n_Sistema de Ventas_`;
    return await sendWhatsAppMessage(phone, apiKey, message);
};

module.exports = {
    sendWhatsAppMessage,
    sendLowStockAlert
};

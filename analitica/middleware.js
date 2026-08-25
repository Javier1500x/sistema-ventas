const UAParser = require('ua-parser-js');

const logAnalytics = (req, res, next) => {
    // Extraer IP de x-forwarded-for (el primer elemento es el cliente)
    const ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
    // Encabezados comunes de Cloudflare para país y ciudad
    const country = req.headers['cf-ipcountry'] || 'Desconocido';
    const city = req.headers['cf-ipcity'] || 'Desconocido';

    const userAgent = req.headers['user-agent'];
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name || 'Desconocido';
    const os = parser.getOS().name || 'Desconocido';
    const deviceType = parser.getDevice().type || 'Desktop'; // 'mobile', 'tablet', 'wearable', etc.

    const logEntry = {
        timestamp: new Date().toISOString(),
        ip,
        country,
        city,
        browser,
        os,
        device: deviceType,
        url: req.originalUrl,
        method: req.method,
        userId: req.user ? req.user.id : 'Anonimo' // req.user es populado por authenticateToken
    };

    console.log(`[ANALYTICS] ${JSON.stringify(logEntry)}`);
    next();
};

module.exports = logAnalytics;

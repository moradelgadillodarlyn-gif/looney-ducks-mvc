const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hashGuardado] = stored.split(':');
    const hashIntento = crypto.scryptSync(password, salt, 64).toString('hex');
    const bufA = Buffer.from(hashGuardado, 'hex');
    const bufB = Buffer.from(hashIntento, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { hashPassword, verifyPassword };

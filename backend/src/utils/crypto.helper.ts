import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY || 'this_is_a_32byte_key_123456789012';

// Pad key to 32 bytes to match the Python implementation
const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'), 'utf8');

export const decryptCookies = (encryptedData: string): string => {
  try {
    // Decode base64
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    
    // Extract IV (first 16 bytes) and ciphertext
    const iv = encryptedBuffer.subarray(0, 16);
    const ciphertext = encryptedBuffer.subarray(16);
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting cookies:', error);
    throw new Error('Failed to decrypt cookies');
  }
}; 
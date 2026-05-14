import jwt from 'jsonwebtoken';

const SECRET = 'openhub-dev-secret-change-in-production';

// Simulate what the server does
const payload = { userId: 'u123', sessionId: 's456' };
const token = jwt.sign(payload, SECRET, { expiresIn: '7d' });

console.log('Token:', token.substring(0, 30) + '...');

try {
  const verified = jwt.verify(token, SECRET);
  console.log('Verified OK:', JSON.stringify(verified));
} catch (e) {
  console.log('Verify FAILED:', e.message);
}

const express = require('express'), helmet = require('helmet'), rateLimit = require('express-rate-limit');
const compression = require('compression'), fs = require('fs'), path = require('path');
const app = express(), PROD = process.env.NODE_ENV === 'production', pub = path.join(__dirname, 'public');

app.set('trust proxy', 1); // hosts like Render/Railway/Fly terminate HTTPS in front of the app
if (PROD) app.use((q, s, n) => (q.secure ? n() : s.redirect(301, 'https://' + q.headers.host + q.url)));
app.use(helmet({ contentSecurityPolicy: { directives: {
  ...helmet.contentSecurityPolicy.getDefaultDirectives(),
  'upgrade-insecure-requests': PROD ? [] : null } } }));
app.use(compression());
app.use(rateLimit({ windowMs: 60e3, limit: 100, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(pub, { extensions: ['html'], maxAge: '1d' }));

const contactLimit = rateLimit({ windowMs: 36e5, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { ok: false, errors: { form: 'Too many messages from this connection. Try again in an hour.' } } });

app.post('/api/contact', contactLimit, express.json({ limit: '5kb' }), (q, s) => {
  const b = q.body || {}, who = String(b.who || '').trim(), email = String(b.email || '').trim(), message = String(b.message || '').trim();
  // Spam traps: hidden field must be empty, and a human takes more than 3s to fill the form.
  if (b.website || !Number(b.ts) || Date.now() - Number(b.ts) < 3000) return s.json({ ok: true });
  const errors = {};
  if (who.length < 2 || who.length > 80) errors.who = 'Enter your name (2 to 80 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) errors.email = 'Enter a valid email address, like name@example.com.';
  if (message.length < 10 || message.length > 2000) errors.message = 'Write a message between 10 and 2000 characters.';
  if (Object.keys(errors).length) return s.status(400).json({ ok: false, errors });
  fs.appendFile(path.join(__dirname, 'messages.jsonl'), JSON.stringify({ t: new Date().toISOString(), who, email, message }) + '\n', () => {});
  s.json({ ok: true });
});

app.use((q, s) => s.status(404).sendFile(path.join(pub, '404.html')));
app.use((e, q, s, n) => s.status(e.status || 500).json({ ok: false, errors: { form: 'Something went wrong. Please try again.' } }));
app.listen(process.env.PORT || 3000, () => console.log('UseItUp running'));

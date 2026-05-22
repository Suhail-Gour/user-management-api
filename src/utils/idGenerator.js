const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(__dirname, '..', 'data', 'counter.json');

function initCounter() {
  if (!fs.existsSync(COUNTER_FILE)) {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ lastCounter: 0 }));
  }
}

function generateUserId() {
  initCounter();

  const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
  data.lastCounter += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data));

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(data.lastCounter).padStart(4, '0');

  return `USR-${year}${month}${day}-${seq}`;
}

module.exports = { generateUserId };
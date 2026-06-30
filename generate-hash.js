const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('\n========================================');
  console.log('COPY THIS HASH:');
  console.log('========================================');
  console.log(hash);
  console.log('========================================\n');
  process.exit(0);
}

generateHash();

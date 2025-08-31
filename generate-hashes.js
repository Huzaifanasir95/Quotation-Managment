const bcrypt = require('bcrypt');

async function generateHashes() {
  const passwords = {
    admin: 'admin123',
    sales: 'sales123', 
    procurement: 'procurement123',
    finance: 'finance123',
    auditor: 'auditor123'
  };

  console.log('-- Generated Password Hashes for QMS Users --');
  console.log('-- Copy these hashes into the SQL commands --\n');

  for (const [role, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`-- ${role} user password: ${password}`);
    console.log(`'${hash}',\n`);
  }
}

generateHashes().catch(console.error);

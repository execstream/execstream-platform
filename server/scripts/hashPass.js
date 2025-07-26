

import bcrypt from "bcryptjs";

const hashPass = async () => {
  const args = process.argv.slice(2); 

  const password = args[0];

  if (!password) {
    console.error("Error: Please provide a password to hash.");
    console.log("Usage: npm run hash -- <your_password>");
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  console.log(password_hash);
};

hashPass();
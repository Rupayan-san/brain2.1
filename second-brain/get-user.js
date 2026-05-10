const mongoose = require("mongoose");
const User = require("./backend/dist/models/User").default;
const dotenv = require("dotenv");

dotenv.config({ path: "./backend/.env" });

async function checkUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({});
  if (users.length > 0) {
    console.log("Found user: " + users[0]._id);
  } else {
    console.log("No users found");
  }
  process.exit(0);
}
checkUser();

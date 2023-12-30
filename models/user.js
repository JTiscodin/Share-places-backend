const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }, //The unique helps searching fast, but if we need to check the email exists of not we use an external package called 'mongoose-unique-validator'
  password: { type: String, required: true, minlenght: 8 },
  image: { type: String, required: true },
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }],
});

userSchema.plugin(uniqueValidator);
module.exports = new mongoose.model("User", userSchema);

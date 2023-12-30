const uuid = require("uuid/v4");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const secret = process.env.SECRET;
const getUsers = async (req, res, next) => {
  let users;
  try {
    //In order to not pass sensitive information, we exclude the password field, in the below way, just for safety
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError("Fetching users failed, please try again", 500);
    return next(error);
  }
  res.json({
    users: users.map((e) => {
      return e.toObject({ getters: true });
    }),
  });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }
  const { name, email, password } = req.body;

  //Although we are using a mongoose validation library, it returns the error in a simple way, so we are just adding manual validation for good user Experience
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Signing Up failed", 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("User exists already, please login", 422);
    return next(error);
  }
  if (!req.file) {
    const error = new HttpError("Please send a file", 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Couldn't create user please try again", 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again", 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      secret,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again", 500);
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  let identifiedUser;
  try {
    identifiedUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "There was an error while finding user, please try again",
      500
    );
  }
  if (!identifiedUser) {
    return next(
      new HttpError(
        "Could not identify user, credentials seem to be wrong.",
        401
      )
    );
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, identifiedUser.password);
  } catch (err) {
    const error = new HttpError("Couldn't log you in, please try again", 500);
  }

  if (!isValidPassword) {
    return next(
      new HttpError(
        "Could not identify user, credentials seem to be wrong.",
        401
      )
    );
  }
  let token;
  try {
    token = jwt.sign(
      { userId: identifiedUser._id, email: identifiedUser.email },
      secret,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again", 500);
    return next(error);
  }
  res.json({
    userId: identifiedUser._id,
    email: identifiedUser._id,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;

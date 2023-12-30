const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
require("dotenv").config()
const secret = process.env.SECRET

module.exports = (req, res, next) => {
  //To prevent browser sending 'OPTIONS' requrest we do the following
  //Sometimes this is what browser sends, so we got to handle that
  if(req.method === "OPTIONS"){
    return next();
  }
  try {
    const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error("Authentication Failed");
    }
    const decodedToken = jwt.verify(token, secret);
    //We can dynamically add data to a req like this 
    req.userData = {userId: decodedToken.userId}
    next();
  } catch (err) {
    const error = new HttpError("Authentication failed", 401);
    return next(error)
  }
};

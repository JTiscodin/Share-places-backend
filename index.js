const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");
require('dotenv').config()
const cors = require("cors");
const app = express();
const fs = require("fs");
const path = require("path")
app.use(bodyParser.json());

app.use(cors());
app.use("/uploads/images", express.static("uploads/images"))


app.use("/api/places", placesRoutes); // => /api/places...
app.use("/api/users", usersRoutes);
app.use("/", (req, res, next) => {
  res.send({ message: "Hello there " });
});

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});
let uri = process.env.CONNECTION_URL
let port = process.env.PORT
mongoose
  .connect(
    uri
  )
  .then(() => {
    console.log("Connected successfully");
    app.listen(port, () => {
      console.log("Server started on port 5000");
    });
  })
  .catch((e) => {
    console.log(e);
  });

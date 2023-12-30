const uuid = require("uuid/v4");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const fs = require("fs");
let DUMMY_PLACES = [
  {
    id: "p1",
    title: "Empire State Building",
    description: "One of the most famous sky scrapers in the world!",
    location: {
      lat: 40.7484474,
      lng: -73.9871516,
    },
    address: "20 W 34th St, New York, NY 10001",
    creator: "u1",
  },
];

//All the logic of getting the place through all the different places lies here
const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) }); // => { place } => { place: place }
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  //let places;
  //Explained what populate does here, below in delete place function
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Can't find the places for the given user",
      404
    );
    return next(error);
  }
  //if(!places || places.length===0)
  if (!userWithPlaces || userWithPlaces.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }
  res.json({ places: userWithPlaces.places });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address} = req.body;

  const createdPlace = new Place({
    title,
    description,
    location: { lat: 55.5, lng: 65.5 },
    address,
    image: req.file.path,
    creator: req.userData.userId,
  });
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("Creating Place failed, please try again", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user by provided id.", 404);
    return next(error);
  }

  //Starting mongoose session
  //Sessions are used to handle multiple database operations and revert back, if any of the operation fails in that session
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    // Push is standard Mongoose operation to push objects in a mongoDB array.
    user.places.push(createdPlace);
    await user.save({ session: sess });
    //Now since everything is done we commit the transaction
    await sess.commitTransaction();

    await sess.endSession();
    //So now only at this point all the changes takes place in mongoDB, before all the commands like save, waited and didn't actually happen, but as soon as the session ends it gets commited to the DB, and if there is any error it rolls back to original state, this is pretty much what sessions and transactions are.
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }
  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;
  // This is the options object provided by mongoose, by Default it is set to 'before' but we want to give them updated one, so we give them custom options "https://mongoosejs.com/docs/api/model.html#Model.findByIdAndUpdate()"
  let options = {
    returnDocument: "after",
  };

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "There was something wrong, couldn't update place",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You aren't authorized to make changes", 401);
    return next(error);
  }
  place.title = title;
  place.description = description;
  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Couldn't update place something went wrong",
      500
    );
    return next(error);
  }
  res.status(200).json({ place });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    //Populate method will fetch the documents from the related database, when we use populate, in this case we tell them, creator field in the Place schema is ref to "User", so it fetches the details of that particular user as well, so we can modify it according to our need.

    place = await Place.findById(placeId).populate("creator");

    // Now with populate, the creator field is full object, instead of being only the object Id, so we can access the whole creator's property with the above command of that particular place.
  } catch (err) {
    const error = new HttpError(
      "There was an error while trying to delete the place",
      500
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError("Could not find place for this id", 404);
    return next(error);
  }

  if (place.creator.id.toString() !== req.userData.userId) {
    const error = new HttpError(
      "You are not authorized to delete this place",
      401
    );
    return next(error);
  }
  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    //we can save the creator, because we used populate, still confused how it's working.
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong, couldn't delete place",
      500
    );
    return next(error);
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Deleted place." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

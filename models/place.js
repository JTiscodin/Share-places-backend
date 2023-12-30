const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  address: { type: String, required: true },
  //mongoose.Types.ObjectId will give creator a unique id, and the 'ref', we should type the name of our model, to depict the relation between the collections
  creator: {type: mongoose.Types.ObjectId, required: true, ref:"User"},
});

module.exports = new mongoose.model("Place", placeSchema)
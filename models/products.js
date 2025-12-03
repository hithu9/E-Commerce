const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    tags: { type: [String], default: [] }
  },
  { timestamps: true } // Automatically stores createdAt & updatedAt
);

module.exports = mongoose.model("Product", productSchema);

// app.js
require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const Product = require("./models/products");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 5000;

// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, "public")));

// --- VIEW ENGINE ---
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// --- BODY PARSER ---
app.use(bodyparser.urlencoded({ extended: true }));

// --- SESSION ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "vogueMartSecretKey",
    resave: false,
    saveUninitialized: true,
  })
);

// --- MIDDLEWARE: pass user to templates ---
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// --- HOME PAGE ---
app.get("/", async (req, res) => {
  const products = await Product.find().limit(3);
  res.render("index", { products });
});

// --- SIGNUP ---
app.get("/signup", (req, res) => res.render("signup", { error: null }));

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.render("signup", { error: "User already exists with this email" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ name, email, password: hashedPassword }).save();

    res.redirect("/login");
  } catch {
    res.render("signup", { error: "Error during signup. Try again." });
  }
});

// --- LOGIN ---
app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.render("login", { error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render("login", { error: "Invalid credentials" });

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    res.redirect("/");
  } catch {
    res.render("login", { error: "Error logging in. Try again." });
  }
});

// --- LOGOUT ---
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// --- PROFILE ---
app.get("/profile", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("profile", { user: req.session.user });
});

// --- ADD PRODUCT ---
app.post("/save", async (req, res) => {
  try {
    const { name, description, price, image, tags } = req.body;
    const tagArray = tags ? tags.split(",").map((t) => t.trim()) : [];
    await new Product({ name, description, price, image, tags: tagArray }).save();
    res.redirect("/products");
  } catch (err) {
    res.send("Error saving product: " + err);
  }
});

// --- PRODUCTS PAGE with SEARCH ---
app.get("/products", async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const regex = new RegExp(searchQuery, "i");

    const products = searchQuery
      ? await Product.find({ $or: [{ name: regex }, { tags: regex }] })
      : await Product.find();

    const allTags = [
      ...new Set((await Product.find()).flatMap((p) => p.tags)),
    ];

    res.render("products", { products, allTags, searchQuery });
  } catch (err) {
    res.send("Error fetching products: " + err);
  }
});

// --- PRODUCT DETAILS + SIMILAR PRODUCTS ---
app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.send("Product not found");

    const similarProducts = await Product.aggregate([
      { $match: { _id: { $ne: product._id } } },
      {
        $addFields: {
          commonTags: { $size: { $setIntersection: ["$tags", product.tags] } },
        },
      },
      { $match: { commonTags: { $gte: 2 } } },
      { $limit: 4 },
    ]);

    res.render("productDetails", { product, similarProducts });
  } catch (err) {
    res.send("Error fetching product: " + err);
  }
});

// --- CART ROUTES ---
app.get("/add-to-cart/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.send("Product not found");

    if (!req.session.cart) req.session.cart = [];
    req.session.cart.push(product);

    res.redirect("/cart");
  } catch (err) {
    res.send("Error adding to cart: " + err);
  }
});

app.get("/remove-from-cart/:id", (req, res) => {
  if (!req.session.cart) return res.redirect("/cart");
  req.session.cart = req.session.cart.filter((item) => item._id != req.params.id);
  res.redirect("/cart");
});

app.get("/cart", (req, res) => {
  res.render("cart", { cart: req.session.cart || [] });
});

// --- PURCHASE ROUTES ---
app.get("/purchase/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.send("Product not found");

    req.session.buyItem = product;
    res.render("purchase", { product, message: null });
  } catch (err) {
    res.send("Error fetching product: " + err);
  }
});

app.post("/place-order", (req, res) => {
  if (!req.session.buyItem) return res.send("No product selected.");

  req.session.cart = [];
  req.session.buyItem = null;

  res.render("purchase", { product: null, message: "Order Placed Successfully! ✔" });
});

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✓"))
  .catch((err) => console.log("DB Error ❌:", err));

// --- START SERVER ---
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

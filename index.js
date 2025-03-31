const express = require("express");
const app = express();
const carRoutes = require("./routes/carRoutes");

app.use(express.static("./views"));
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));
app.use("/", carRoutes);

app.listen(80, () => {
    console.log("Server is running on port 80");
});

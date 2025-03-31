const express = require("express");
const router = express.Router();
const multer = require("multer");
const carController = require("../controllers/carController");

// Multer Config
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(file.originalname.toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        return mimetype && extname ? cb(null, true) : cb("Error: Images Only!");
    },
    limits: { fileSize: 10000000 }
});

// Routes
router.get("/SaiGonCar", carController.getCars);
router.post("/insert", upload.single("HinhDaiDien"), carController.insertCar);
router.post("/delete", upload.fields([]), carController.deleteCar);

module.exports = router;

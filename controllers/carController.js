const { v4: uuidv4 } = require('uuid');
const { s3, bucketName } = require("../config/awsConfig");
const CarModel = require("../models/carModel");

exports.getCars = async (req, res) => {
    try {
        const data = await CarModel.getAllCars();
        res.render("index.ejs", { data });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
};

exports.insertCar = async (req, res) => {
    const { TenXe, LoaiXe, GiaXe } = req.body;
    if (!TenXe || !LoaiXe || !GiaXe) {
        return res.status(400).send({ error: "Please fill all the fields!" });
    }
    if (parseFloat(GiaXe) <= 0) {
        return res.status(400).send({ error: "Price must be greater than 0!" });
    }
    if (!req.file) {
        return res.status(400).send({ error: "Please choose a file!" });
    }

    try {
        s3.upload({
            Bucket: bucketName,
            Key: req.file.originalname,
            Body: req.file.buffer
        }, async (error, data) => {
            if (error) {
                return res.status(500).send({ error: error.message });
            }
            await CarModel.insertCar({
                MaXe: uuidv4(),
                TenXe,
                LoaiXe,
                GiaXe: parseFloat(GiaXe),
                HinhDaiDien: data.Location
            });
            res.redirect('/SaiGonCar');
        });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
};

exports.deleteCar = async (req, res) => {
    const listChecked = Object.keys(req.body);
    if (listChecked.length === 0) {
        return res.redirect('/SaiGonCar');
    }

    try {
        for (const MaXe of listChecked) {
            await CarModel.deleteCar(MaXe);
        }
        res.redirect('/SaiGonCar');
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
};

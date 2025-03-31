const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require("dotenv").config();
//config
const app = express();
app.use(express.static("./views"))
app.set('view engine', 'ejs');
app.set("views", "./views");

// AWS

AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    region: process.env.REGION
});
const bucketName = process.env.BUCKET;
const dynamoName = process.env.DYNAMO;

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Multer
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        checkFile(file, cb);
    },
    limits: { fileSize: 10000000 } // 10MB
});

const checkFile = (file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb("Error: Images Only!");
    }
}

app.get('/SaiGonCar', async (req, res) => {
    try {
        const data = await dynamoDB.scan({ TableName: dynamoName }).promise();
        res.render('index.ejs', { data: data.Items });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
});

app.post('/insert', upload.single('HinhDaiDien'), async (req, res) => {
    const { TenXe, LoaiXe, GiaXe } = req.body
    if (TenXe === "" || LoaiXe === "" || GiaXe === "") {
        return res.status(500).send({ error: "Please fill all the fields!" });
    } else if (parseFloat(GiaXe) <= 0) {
        return res.status(500).send({ error: "Price must be greater than 0!" });
    }else if(req.file === undefined){
        return res.status(500).send({ error: "Please choose a file!" });
    }
    try {
        s3.upload({
            Bucket: bucketName,
            Key: req.file.originalname,
            Body: req.file.buffer,

        }, async (error, data) => {
            if (error) {
                return res.status(500).send({ error: error.message });
            } else {
                const { Location } = data;
                await dynamoDB.put({
                    TableName: dynamoName,
                    Item: {
                        MaXe: uuidv4(),
                        TenXe,
                        LoaiXe,
                        GiaXe: parseFloat(GiaXe),
                        HinhDaiDien: Location
                    }
                }).promise();
                res.redirect('/SaiGonCar');
            }
        })
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
})


app.post("/delete", upload.fields([]), async (req, res) => {
    const listChecked = Object.keys(req.body);
    console.log("Danh sách MaXe cần xóa:", listChecked); // In ra danh sách các MaXe

    if (listChecked.length === 0) {
        return res.redirect('/SaiGonCar');
    }

    try {
        deleteItem = (index) => {
            dynamoDB.delete({
                TableName: dynamoName,
                Key: {
                    MaXe: listChecked[index]
                }
            }, (error) => {
                if (error) {
                    return res.status(500).send({ error: error.message });
                } else {
                    if (index === 0) {
                        res.redirect('/SaiGonCar');
                    } else {
                        deleteItem(index - 1);
                    }
                }

            })
        }
        deleteItem(listChecked.length - 1);
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
})

app.get("/", (req, res) => {
    res.redirect('/SaiGonCar');
})

app.listen(80, () => {
    console.log('Server is running on port 80');
})
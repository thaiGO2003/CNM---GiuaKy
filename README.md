# Hướng Dẫn Tạo Dự Án MVC Với DynamoDB Và S3 Bucket

## 1. Giới Thiệu
Dự án này sử dụng **Node.js** với mô hình **MVC (Model-View-Controller)** kết hợp với **AWS DynamoDB** để lưu trữ dữ liệu và **AWS S3 Bucket** để lưu trữ hình ảnh.

## 2. Yêu Cầu Hệ Thống
- **Node.js** (>= v14)
- **AWS Account** (để tạo DynamoDB & S3 Bucket)
- **Git** (tuỳ chọn)

## 3. Cài Đặt Dự Án
### 3.1. Tạo thư mục và khởi tạo dự án
```sh
mkdir MyProject && cd MyProject
npm init -y
```

### 3.2. Cài đặt các thư viện cần thiết
```sh
npm i aws-sdk ejs express express-session body-parser dotenv multer
npm i nodemon --save-dev
```

### 3.3. Cấu hình `package.json`
Mở file `package.json` và sửa đổi phần `scripts`:
```json
"scripts": {
  "start": "nodemon index.js"
}
```

## 4. Cấu Hình AWS
### 4.1. Tạo DynamoDB Table
- Truy cập **AWS DynamoDB** → **Create Table**
- **Table name**: `Tên bảng`
- **Partition key**: `MaXe (String)`
- **Không có Sort Key**

### 4.2. Tạo S3 Bucket
- Truy cập **AWS S3** → **Create Bucket**
- **Bucket name**: `thaigo-bucket`
- **Public Access**: Enable public access
- **Bucket Policy**:
```json
{
    "Version": "2012-10-17",
    "Id": "PublicReadPolicy",
    "Statement": [
        {
            "Sid": "PublicReadAccess",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::thaigo-bucket/*"
        }
    ]
}
```

## 5. Tạo File `.env`
Tạo file `.env` trong thư mục dự án và thêm các giá trị AWS:
```
ACCESS_KEY=your_access_key
SECRET_KEY=your_secret_key
REGION=your_region
BUCKET=thaigo-bucket
DYNAMO=your_dynamo_table
```

## 6. Viết Code `config/awsConfig.js`
Tạo file `config/awsConfig.js` và thêm đoạn code sau:
```js
const AWS = require('aws-sdk');
require("dotenv").config();

AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    region: process.env.REGION
});

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const bucketName = process.env.BUCKET;
const dynamoName = process.env.DYNAMO;

module.exports = { s3, dynamoDB, bucketName, dynamoName };
```

## 7. Viết Code `models/carModel.js`
Tạo file `models/carModel.js` và thêm đoạn code sau:
```js
const { dynamoDB, dynamoName } = require("../config/awsConfig");

const CarModel = {
    getAllCars: async () => {
        const data = await dynamoDB.scan({ TableName: dynamoName }).promise();
        return data.Items;
    },

    insertCar: async (car) => {
        return await dynamoDB.put({
            TableName: dynamoName,
            Item: car
        }).promise();
    },

    deleteCar: async (MaXe) => {
        return await dynamoDB.delete({
            TableName: dynamoName,
            Key: { MaXe }
        }).promise();
    }
};

module.exports = CarModel;
```

## 8. Viết Code `controllers/carController.js`
Tạo file `controllers/carController.js` và thêm đoạn code sau:
```js
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
```

## 9. Viết Code `routes/carRoutes.js`
Tạo file `routes/carRoutes.js` và thêm đoạn code sau:
```js
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
```

## 10. Viết Code `index.js`
Tạo file `index.js` và thêm đoạn code sau:
```js
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
```

## 11. Tạo File `views/index.ejs`
Tạo thư mục `views` và file `index.ejs`:
```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<style>

</style>

<body>
    <h1>Danh sách các dòng xe</h1>

    <form action="/insert" method="post" enctype="multipart/form-data">
        <div style="display: flex;">
            <label for="" style="width: 100px;">Tên dòng xe(*)</label>
            <input type="text" style="width: 100px;" name="TenXe">
        </div>
        <br>
        <div style="display: flex;">
            <label for="LoaiXe" style="width: 100px;">Loại xe(*)</label>
            <select style="width: 120px;" name="LoaiXe" id="LoaiXe">
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Coupe">Coupe</option>
                <option value="Convertible">Convertible</option>
                <option value="Truck">Truck</option>
            </select>
        </div>        
        <br>

        <div style="display: flex;">
            <label for="" style="width: 100px;">Giá(*)</label>
            <input style="width: 100px;" type="text" name="GiaXe">
        </div>
        <br>

        <div style="display: flex;">
            <label for="" style="width: 100px;">Hình ảnh(*)</label>
            <input style="width: 200px;" type="file" name="HinhDaiDien" accept="*" >
        </div>

        <button type="submit">Thêm xe </button>
    </form>
    <br>

    <form action="/delete" method="post" enctype="multipart/form-data">
        <button type="submit">Xóa</button>
        <table cellpadding="0" cellspacing="0" border="1"
            style="display: flex; justify-content: center; align-items: center; border: 0;">
            <tr>
                <th style="width: 100px;">STT</th>
                <th style="width: 100px;">Tên xe</th>
                <th style="width: 100px;">Loại xe</th>
                <th style="width: 100px;">Giá(Triệu)</th>
                <th style="width: 100px;">Chi tiết</th>
                <th style="width: 100px;">Hành động</th>
            </tr>

            <% for( let index=0; index < data.length; index++ ) { %>
                <tr style="height: 20px; text-align: center; border: solid 1px black;">
                    <td>
                        <%= index + 1 %>
                    </td>

                    <td>
                        <%= data[index].TenXe %>
                    </td>
                    <td>
                        <%= data[index].LoaiXe %>
                    </td>
                    <td>
                        <%= data[index].GiaXe %>
                    </td>
                    <td><img src="<%= data[index].HinhDaiDien %>" alt="" height="100%" width="100px"></td>
                    <td>
                        <input type="checkbox" name="<%=  data[index].MaXe%>" value="<%= data[index].MaXe %>">
                    </td>
                </tr>
                <% } %>
        </table>
    </form>
</body>

</html>
```

## 12. Chạy Dự Án
```sh
npm start
```
Mở trình duyệt: [http://localhost/SaiGonCar](http://localhost/SaiGonCar)

---
🚀 **Giờ bạn đã có một dự án MVC kết nối với AWS DynamoDB và S3 Bucket!** 🎉


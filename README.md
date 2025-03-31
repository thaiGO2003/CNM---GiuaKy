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

## 6. Viết Code `index.js`
Tạo file `index.js` và thêm đoạn code sau:
```js
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
```

## 7. Tạo File `views/index.ejs`
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

## 8. Chạy Dự Án
```sh
npm start
```
Mở trình duyệt: [http://localhost/SaiGonCar](http://localhost/SaiGonCar)

---
🚀 **Giờ bạn đã có một dự án MVC kết nối với AWS DynamoDB và S3 Bucket!** 🎉


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
const { v4: uuidv4 } = require('uuid');
require("dotenv").config();

const app = express();
app.use(express.static("./views"));
app.set('view engine', 'ejs');
app.set("views", "./views");

AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    region: process.env.REGION
});

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const upload = multer({ storage: multer.memoryStorage() });

app.get('/SaiGonCar', async (req, res) => {
    try {
        const data = await dynamoDB.scan({ TableName: process.env.DYNAMO }).promise();
        res.render('index', { data: data.Items });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.post('/insert', upload.single('HinhDaiDien'), async (req, res) => {
    const { TenXe, LoaiXe, GiaXe } = req.body;
    if (!TenXe || !LoaiXe || !GiaXe || !req.file) {
        return res.status(400).send({ error: "Please fill all fields and upload an image." });
    }
    try {
        const uploadResult = await s3.upload({
            Bucket: process.env.BUCKET,
            Key: req.file.originalname,
            Body: req.file.buffer
        }).promise();

        await dynamoDB.put({
            TableName: process.env.DYNAMO,
            Item: {
                MaXe: uuidv4(),
                TenXe,
                LoaiXe,
                GiaXe: parseFloat(GiaXe),
                HinhDaiDien: uploadResult.Location
            }
        }).promise();
        res.redirect('/SaiGonCar');
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.post("/delete", async (req, res) => {
    const listChecked = Object.keys(req.body);
    if (listChecked.length === 0) {
        return res.redirect('/SaiGonCar');
    }
    try {
        for (const maXe of listChecked) {
            await dynamoDB.delete({
                TableName: process.env.DYNAMO,
                Key: { MaXe: maXe }
            }).promise();
        }
        res.redirect('/SaiGonCar');
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.listen(80, () => {
    console.log('Server is running on port 80');
});
```

## 7. Tạo File `views/index.ejs`
Tạo thư mục `views` và file `index.ejs`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Danh sách các dòng xe</title>
</head>
<body>
    <h1>Danh sách các dòng xe</h1>
    <form action="/insert" method="post" enctype="multipart/form-data">
        <input type="text" name="TenXe" placeholder="Tên xe">
        <input type="text" name="LoaiXe" placeholder="Loại xe">
        <input type="number" name="GiaXe" placeholder="Giá">
        <input type="file" name="HinhDaiDien">
        <button type="submit">Thêm xe</button>
    </form>
    <form action="/delete" method="post">
        <button type="submit">Xóa</button>
        <ul>
            <% data.forEach((item, index) => { %>
                <li>
                    <input type="checkbox" name="<%= item.MaXe %>">
                    <%= item.TenXe %> - <%= item.LoaiXe %> - <%= item.GiaXe %>
                    <img src="<%= item.HinhDaiDien %>" width="100">
                </li>
            <% }); %>
        </ul>
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


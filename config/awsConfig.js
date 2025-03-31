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
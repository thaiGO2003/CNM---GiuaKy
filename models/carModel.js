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

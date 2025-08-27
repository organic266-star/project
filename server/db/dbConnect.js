import mongoose from "mongoose"
import dotenv from "dotenv";
dotenv.config();

const dbConnection =async()=>{
try {
    await mongoose.connect( process.env.MONGOOSE_CONNECTION, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    mongoose.set("strictQuery", false); // Disable strict query mode
    // 🔥 Log successful connection
    console.log("Connected to DataBase");
} catch (error) {
    console.log("Mongo URI:", process.env.MONGOOSE_CONNECTION);

    console.log(error.message);
}
}

export default dbConnection
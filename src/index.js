import  mongoose from "mongoose";
import {DB_NAME} from "./constants.js";
import express from "express"
import connectDB from "./db/index.js";
import dotenv from 'dotenv';


dotenv.config({
    path:"./env"
});

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`server is running at ${process.env.PORT}`);
    })
    app.on("error",(error)=>{
        console.log(error);
        throw error;
    })
})
.catch((err)=>{
    console.log("mongo db error");
})
















// const app = express()
// ;(async()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/
//         ${DB_NAME}`)
//         app.on("error", () =>{
//             console.log("error");
//             throw error
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`app is on port ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("ERROR",error)
//         throw err
//     }
// })()
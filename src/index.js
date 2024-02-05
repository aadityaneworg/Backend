import  mongoose from "mongoose";
import {DB_NAME} from "./constants.js";
import express from "express"
import connectDB from "./db/index.js";
import dotenv from 'dotenv';

import {app} from './app.js'
dotenv.config({
    path:"./env"
});

app.get('/',(req,res)=>{
    res.send('server is ready')
})
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`server is running at ${process.env.PORT}
        \n at http://localhost:${process.env.PORT}`);
    })
    app.on("error",(error)=>{
        console.log(error);
        throw error;
    })
})
.catch((err)=>{
    console.log("mongo db error",err);
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
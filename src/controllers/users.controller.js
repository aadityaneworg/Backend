import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessandRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave:false})
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler( async (req, res) =>
{
    //get user information from frotend
    //validation-not empty
    //check if user already exists-username,email
    //check for images,avatar
    //upload to cloudinary,avatar
    //create user object-create entry in db
    //remove password and refreshToken field from response
    //check for user creation
    //resturn res
    const {fullname,email,username,password} = req.body;
    console.log("email:",email);
    console.log(("fullname :",fullname));
    
    if(
        [fullname,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{email},{username}]
})
    if (existedUser) {
        throw new ApiError(409,"User with same username or email already exists")
    }
    
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError("400","Avatar File is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError("400","Avatar File is required")
    }
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase() 
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

} )

const loginUser = asyncHandler(async(req,res)=>{
    //take data from req.body
    //take username or email
    //take password
    //find user
    //validate password
    //send access and refresh tokens
    //send cookies
    
    const{email,password,username} = req.body;

    if (!(username || email)) {
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if (!user) {
        throw new ApiError(404,"User not found")
    }

    const isPasswordvalid = await user.isPasswordCorrect(password)

    if (!isPasswordvalid) {
        throw new ApiError(401,"Wrong password")
    }

    const {accessToken , refreshToken} = await generateAccessandRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,refreshToken,accessToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            },
            
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json( new ApiResponse(200,{},"User logged out"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorised Access")
    }
    
   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if (!user) {
         throw new ApiError(401,"Invalid Refresh Token")
     }
 
     if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401,"Expired access or refresh token")
     }
 
     const options = {
         httpOnly:true,
         secure:true
     }
 
     const {accessToken,NewRefreshToken}= await generateAccessandRefreshToken(user._id)
 
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",NewRefreshToken)
     .json(
         new ApiResponse(
             200,
             {accessToken,refreshToken:NewRefreshToken},
             "New tokens generated"
         )
     )
   } catch (error) {
        throw new ApiError(402,error?.messsage||"Error while generating new tokens")
   }


})

const changeCurrentPassord = asyncHandler(async(req,res)=>{
    const{oldPassword,newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect  = await isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    res
    .status(200)
    .json(new ApiResponse(200,"Password Changed"))
})

const getCurrentUser  =  asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,
        req.user,
        "current user fetched successfully")    
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const{ fullname,email } = req.body

    if (!(fullname||email)) {
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullname,
                email:email    //there are two approaches
            }
        },
        {
            new:true
        }

        ).select("-password")


        return res
        .status(200)
        .json( new ApiResponse(200,user,"Account details updated successfully"))





})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    
    // const oldAvatar = req.file?.avatar?.[0]?.path
    // const oldAvatarurl = oldAvatar.url
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar  is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400,"error while uploading avatar to cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        
        {
            new:true
        }
        ).select(
            "-password"
        )
    
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar Updated Successfully")
    )
    

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"Cover Image  is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400,"error while uploading cover image to cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        
        {
            new:true
        }
        ).select(
            "-password"
        )

        return res
        .status(200)
        .json(
            new ApiResponse(200,user,"Cover Image Updated Successfully")
        )

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params;

    if (!username?.trim()) {
        throw new ApiError(400,"username not found")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ]
    )
    if (!channel?.length) {
        throw new ApiError(404,"channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})

const getUserWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    }
                ,{
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }]
            }
        },

    ])

    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
})




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassord,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}



// WRITE SEPARATE CONTROLLERS FOR IMAGE FILES
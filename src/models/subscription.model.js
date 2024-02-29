import mongoose, {Schema} from "mongoose";


const subscriptionSchema = new Schema ({

    subscriber :{
        type:Schema.Types.ObjectId, // one who is subscribing
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId, // the youtube channel to whom subscriber is subscribing.
        ref:"User"
    }

}
,{
    timestamps:true
})

export const SchemaSubscription = mongoose.model("Subscription",subscriptionSchema)
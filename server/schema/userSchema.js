import mongoose from "mongoose"

const userSchema = mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique:true
    },
    email: {
        type: String,
        required: true,
        unique:true
    }, 
    password: {
        type: String,
        required: true,
        minlength:6
    },
    gender:{
        type:String,
        required:true,
        enum:["male","female"]
    },
    profilepic:{
        type:String,
        default:"",
    },

    role: { 
    type: String, 
    enum: ["student", "developer", "designer", "mentor", "other"], 
    default: "developer"
  },
  skills: {
    type: [String],  // e.g. ["JavaScript", "React", "Node.js"]
    default: []
  },
  lookingFor: {
    type: String, // e.g. "pair programming", "project collab", "casual chat"
    default: "casual chat"
  },

 



},{timestamps:true});

const User = mongoose.model("User",userSchema)
export default User;
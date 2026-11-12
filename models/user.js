const {  createHmac,randomBytes } = require('node:crypto');

const { Schema, model } = require("mongoose");

const {createTokenForUser} = require("../services/authentication");

const usersSchema = new Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    salt: {
        type: String,
        
    },
    password: {
        type: String,
        required: true,
    },
    profileImageUrl: {
        type: String,
        default: "/images/default.jpg",

    },
    bookmarks: [{
        type: Schema.Types.ObjectId,
        ref: "blog",
    }],
    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER"
    }

}, { timestamps: true }
);

usersSchema.pre('save', function (next) {
    const user = this;

    if (!user.isModified('password')) return next();

    const salt = randomBytes(16).toString();
    const hashedPassword = createHmac('sha256',salt).update(user.password).digest("hex"); 
    
    this.salt=salt;
    this.password=hashedPassword;
    
    next();
});

usersSchema.static('matchPasswordandGenerateToken', async function(email, password){
   const normalizedEmail = String(email || "").trim().toLowerCase();
   const user = await this.findOne({ email: normalizedEmail });
   if(!user) {
    const error = new Error("Invalid email or password");
    error.code = "AUTH_INVALID_CREDENTIALS";
    throw error;
   }
   const salt = user.salt;
   const hashedPassword = user.password;
   const userProvidedHash = createHmac('sha256',salt).update(String(password || "")).digest("hex");
   if(hashedPassword !== userProvidedHash) {
    const error = new Error("Invalid email or password");
    error.code = "AUTH_INVALID_CREDENTIALS";
    throw error;
   }

   const token = createTokenForUser(user);
   return token;
});

const User = model('user', usersSchema);

module.exports = User;

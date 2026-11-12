const JWT = require("jsonwebtoken");

function getTokenSecret() {
    const secret = process.env.TOKEN_SECRET || process.env.secret;
    if (!secret) throw new Error("TOKEN_SECRET is not configured");
    return secret;
}



function createTokenForUser(user){
    const payload = {
        _id: user._id,
        email: user.email,
        profileImageURL: user.profileImageURL,
        role:user.role,
        fullName: user.fullName,
    };
    const token = JWT.sign(payload, getTokenSecret());
    return token;
}

function validateToken(token){
    const payload = JWT.verify(token, getTokenSecret());
    return payload;  
}

module.exports = {
    createTokenForUser,
    validateToken,

}

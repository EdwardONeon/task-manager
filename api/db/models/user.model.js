const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// JWT Secret
const jwtSecret = "AeqGd8IucFMFjgkJ05bn8634IUNww1Xm7iwuDPOQ";

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlenth: 1,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    sessions: [{
        token: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Number,
            required: true
        }
    }]
});

// Instance methods
UserSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject();
    // return the docoument except the password and sessions which should not be made available
    return _.omit(userObject, ['password', 'sessions']);
}

UserSchema.methods.generateAccessAuthToken = function() {
    const user = this;
    return new Promise((resolve, reject) => {
        // create the JSON web token and return that
        jwt.sign({_id: user._id.toHexString()}, jwtSecret, {expiresIn: "15m"}, (err, token) => {
            if (!err) {
                resolve(token);
            } else {
                reject();
            }
        })
    })
}

UserSchema.methods.generateRefreshAuthToken = function() {
    // this method generate a 64bype hex string
    return new Promise((resolve, reject) => {
        crypto.randomBytes(64, (err, buf) => {
            if (!err) {
                let token = buf.toString('hex');
                return resolve(token);
            }
        })
    })
}

UserSchema.methods.createSession = function() {
    let user = this;
    return user.generateRefreshAuthToken().then((refreshToken) => {
        return saveSessionToDatabase(user, refreshToken);
    }).then((refreshToken) => {
        //saved to database successfully and return the refresh token
        return refreshToken;
    }).catch((e) => {
        return Promise.reject("Failed to save session to database.\n" + e);
    })
}

// Model methods (static methods)
UserSchema.statics.getJWTSecret = () => {
    return jwtSecret;
}

UserSchema.statics.findByIdAndToken = function(_id, token) {
    // find user by id and token
    const User = this;
    return User.findOne({
        _id,
        'sessions.token': token
    });
}

UserSchema.statics.findByCredentials = function(email, password) {
    let User = this;
    return User.findOne({email}).then((user) => {
        if (!user) return Promise.reject();
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user)
                } else {
                    reject();
                }
            })
        })
    });
}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let secondsSinceEpoch = Date.now() / 1000;
    if (expiresAt > secondsSinceEpoch) {
        // hasn't expired
        return false;
    } else {
        //expired 
        return true;
    }

}

// Middleware
// Before a document is saved, this code runs
UserSchema.pre('save', function(next) {
    let user = this;
    let costFactor = 10;

    if(user.isModified('password')) {
        //if the password has been edited/changed then run this code
        // generate salt and return password
        bcrypt.genSalt(costFactor, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            })
        })
    } else {
        next();
    }
});

// Helper methods
let saveSessionToDatabase = (user, refreshToken) => {
    // save session to database
    return new Promise((resolve, reject) => {
        let expiresAt = generateRefreshTokenExpiryTime();
        user.sessions.push({'token': refreshToken, expiresAt});
        user.save().then(() => {
            return resolve(refreshToken);
        }).catch((e) => {
            reject(e)
        });
    });
}

let generateRefreshTokenExpiryTime = () => {
    let daysUntilExpire = "10";
    let secondsUntilExpire = ((daysUntilExpire * 24) * 60) * 60;
    return ((Date.now()/1000) + secondsUntilExpire);
}

const User = mongoose.model('User', UserSchema);

module.exports = {User};
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'User must have a name'],
    },
    email: {
        type: String,
        validate: [validator.isEmail],
        required: [true, 'User must have a email'],
        unique: true,
        lowercase: true,
    },
    photo: {
        type: String,
    },
    password: {
        type: String,
        required: [true, 'User must have a password'],
        minlength: 8,
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // THis only work on CREATE & SAVE!!
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passsords are not the same...!',
        },
    },
    passwordChangedAt: Date,
});

userSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);

    this.passwordConfirm = undefined;
    next();
});

userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changesPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const chagedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < chagedTimestamp;
    }
    return false;
};

const User = mongoose.model('User', userSchema);
module.exports = User;

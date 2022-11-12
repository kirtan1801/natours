const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AppError = require('../utils/appError');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const sendEmail = require('./../utils/email');

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    //Define a cookie and send it
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    res.cookie('jwt', token, cookieOptions);
    user.password = undefined;
    res.status(statusCode).json({
        status: 'Success',
        token,
        data: {
            user: user,
        },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangeAt: req.body.passwordChangeAt,
        role: req.body.role,
    });
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // 1) check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    // 2) check if user exist and password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('incorrect email or password', 401));
    }

    // 3) if everything ok, send token to client
    createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and checck if it's there
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new AppError(
                'You are not logged in! Please log in to get access',
                401
            )
        );
    }

    // 2) Varification of token
    const dcode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const freshUser = await User.findById(dcode.id);
    if (!freshUser) {
        return next(
            new AppError('The user belonging to the token does not exist.', 401)
        );
    }

    // 4) Check if user change password after the token was issued
    if (freshUser.changesPasswordAfter(dcode.iat)) {
        return next(
            new AppError(
                'User recently changed password! Please login again...',
                401
            )
        );
    }
    // Grant access to protected route
    req.user = freshUser;
    next();
});

exports.restrictTo =
    (...roles) =>
    (req, res, next) => {
        // roles[('admin', 'lead-guide')];
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perform this action',
                    403
                )
            );
        }
        next();
    };

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1) get user based on Posted email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with email address', 404));
    }

    //2) generate random rset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    //3) send it to user's email
    const resetURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/users/resetPPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email...!`;

    try {
        await sendEmail({
            email: user.email,
            subject: `Your password reset token (only valid for 10 mins)`,
            message,
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                'There was an error sending the email. Try again leter!',
                500
            )
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const hasedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hasedToken,
        passwordResetExpire: { $gt: Date.now() },
    });
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //1) get user from collection
    const user = await User.findById(req.user.id).select('+password');

    //2) check if POSTed current password is correct
    if (
        !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
        return next(new AppError('your current password is wrong.', 401));
    }

    //3) if so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // //4) Log user in, send JWT
    createSendToken(user, 200, res);
});

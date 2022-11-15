const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Tour must have a name'],
            unique: true,
            trim: true,
            //data validation
            maxlength: [
                40,
                'Tour name must have less or equal then 40 characters',
            ],
            minlength: [
                10,
                'Tour name must have more or equal then 10 characters',
            ],
            // validate: [
            //     validator.isAlpha,
            //     'Tour name must only contain characters',
            // ],
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, 'Tour must have a duration'],
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'Tour must have a group size'],
        },
        difficulty: {
            type: String,
            required: [true, 'Tour must have a group size'],
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficult is either: easy, medium, difficult',
            },
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating must be below 5.0'],
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
        },
        price: {
            type: Number,
            required: [true, 'Tour must have a price'],
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function (val) {
                    //This only points to current doc on NEW documents creation
                    return val < this.price * 0.1;
                },
                mesage: 'Discount price should be below 10% of the regular price',
            },
        },
        summary: {
            type: String,
            trim: true,
            required: [true, 'Tour must have a summary'],
        },
        description: {
            type: String,
            trim: true,
        },
        imageCover: {
            type: String,
            required: [true, 'Tour must have a image cover'],
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false,
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false,
        },
        startLocation: {
            // GeoJson data
            type: {
                type: String,
                default: 'Point',
                enum: ['Point'],
            },
            coordinates: [Number],
            address: String,
            description: String,
        },
        locations: [
            {
                type: {
                    type: String,
                    default: 'Point',
                    enum: ['Point'],
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number,
            },
        ],
        guides: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
            },
        ],
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

//Document Middleware: runs before .save() and .create() command not.insertMany()
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

//query middleware
tourSchema.pre(/^find/, function (next) {
    this.find({ secretTour: { $ne: true } });

    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt',
    });
    next();
});

tourSchema.post(/^find/, function (docs, next) {
    console.log(`Query took ${Date.now() - this.start}`);
    // console.log(docs);
    next();
});

//Aggregation Middleware
tourSchema.pre('aggregate', function (next) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
    next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        // eslint-disable-next-line node/no-unsupported-features/es-syntax
        const queryObj = { ...this.queryString };
        const excludedField = ['page', 'sort', 'limit', 'fields'];
        excludedField.forEach((el) => delete queryObj[el]);

        //1b)advance filtering
        let queryString = JSON.stringify(queryObj);
        queryString = queryString.replace(
            /\b(gte|gt|lte|lt)\b/g,
            (match) => `$${match}`
        );
        this.query = this.query.find(JSON.parse(queryString));
        // let query = Tour.find(JSON.parse(queryString));
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v');
        }
        return this;
    }

    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);

        // if (req.query.page) {
        //     const numTours = await Tour.countDocuments();
        //     if (skip >= numTours) throw new Error('This page does not exist');
        // }
        return this;
    }
}
module.exports = APIFeatures;

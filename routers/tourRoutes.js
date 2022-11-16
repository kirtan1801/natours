const express = require('express');
<<<<<<< HEAD
const tourController = require('./../controllers/tourController');
=======
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
>>>>>>> 94c07f6 (implementing review functionality)

const router = express.Router();

// router.param('id', tourController.checkId);
//router.param('id', tourController.checkBody);

router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router
    .route('/')
    .get(tourController.getAllTours)
    .post(tourController.createTour);

router
    .route('/:id')
    .get(tourController.getTour)
    .patch(tourController.updateTour)
    .delete(tourController.deleteTour);

module.exports = router;

process.noDeprecation = true;
require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');
var mongoose = require('mongoose');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

var router = express.Router();

mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
}, function(err) {
  if (err) {
    console.log('could not connect');
  } else {
    console.log('connected');
  }
});

// SIGNUP
router.post('/signup', function(req, res) {
  if (!req.body.username || !req.body.password) {
    return res.json({ success: false, msg: 'Please include both username and password to signup.' });
  }

  var user = new User();
  user.name = req.body.name;
  user.username = req.body.username;
  user.password = req.body.password;

  user.save(function(err) {
    if (err) {
      if (err.code == 11000)
        return res.json({ success: false, message: 'A user with that username already exists.' });
      else
        return res.json(err);
    }
    res.json({ success: true, msg: 'Successfully created new user.' });
  });
});

// SIGNIN
router.post('/signin', function(req, res) {
  var userNew = new User();
  userNew.username = req.body.username;
  userNew.password = req.body.password;

  User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
    if (err) return res.send(err);
    if (!user) return res.status(401).send({ success: false, msg: 'Authentication failed. User not found.' });

    user.comparePassword(userNew.password, function(isMatch) {
      if (isMatch) {
        var userToken = { id: user.id, username: user.username };
        var token = jwt.sign(userToken, process.env.SECRET_KEY);
        res.json({ success: true, token: 'JWT ' + token });
      } else {
        res.status(401).send({ success: false, msg: 'Authentication failed.' });
      }
    });
  });
});

// GET ALL MOVIES
router.route('/movies')
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movies = await Movie.find();
      res.status(200).json(movies);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error retrieving movies.' });
    }
  })
  .post(authJwtController.isAuthenticated, async (req, res) => {
    const { title, releaseDate, genre, actors } = req.body;
    if (!title || !releaseDate || !genre || !actors || actors.length === 0) {
      return res.status(400).json({ success: false, message: 'Please include title, releaseDate, genre, and at least one actor.' });
    }
    try {
      const movie = new Movie({ title, releaseDate, genre, actors });
      await movie.save();
      res.status(200).json({ success: true, message: 'Movie created successfully.', movie });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error saving movie.' });
    }
  });

// GET MOVIE BY TITLE — with optional ?reviews=true
router.route('/movies/:title')
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      if (req.query.reviews === 'true') {
        const result = await Movie.aggregate([
          { $match: { title: req.params.title } },
          {
            $lookup: {
              from: 'reviews',
              localField: '_id',
              foreignField: 'movieId',
              as: 'reviews'
            }
          }
        ]);

        if (!result || result.length === 0) {
          return res.status(404).json({ success: false, message: 'Movie not found.' });
        }

        return res.status(200).json({ success: true, movie: result[0] });
      }

      // No reviews param
      const movie = await Movie.findOne({ title: req.params.title });
      if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });
      res.status(200).json({ success: true, movie });

    } catch (err) {
      res.status(500).json({ success: false, message: 'Error retrieving movie.' });
    }
  })
  .put(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const updatedMovie = await Movie.findOneAndUpdate(
        { title: req.params.title },
        req.body,
        { new: true, runValidators: true }
      );
      if (!updatedMovie) return res.status(404).json({ success: false, message: 'Movie not found.' });
      res.status(200).json({ success: true, message: 'Movie updated successfully.', movie: updatedMovie });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error updating movie.' });
    }
  })
  .delete(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const deletedMovie = await Movie.findOneAndDelete({ title: req.params.title });
      if (!deletedMovie) return res.status(404).json({ success: false, message: 'Movie not found.' });
      res.status(200).json({ success: true, message: 'Movie deleted successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting movie.' });
    }
  });

// REVIEWS ROUTES
router.route('/reviews')
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const reviews = await Review.find();
      res.status(200).json({ success: true, reviews });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error retrieving reviews.' });
    }
  })

  .post(authJwtController.isAuthenticated, async (req, res) => {
    const { movieId, review, rating } = req.body;
    const username = req.user && req.user.username;

    // Validate all required fields
    if (!movieId || !username || !review || rating === undefined) {
      return res.status(400).json({ success: false, message: 'Please include movieId, username, review, and rating.' });
    }

    try {
      // Check movie exists first
      const movie = await Movie.findById(movieId);
      if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });

      const newReview = new Review({ movieId, username, review, rating });
      await newReview.save();
      res.status(200).json({ message: 'Review created!' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error saving review.' });
    }
  })

  .delete(authJwtController.isAuthenticated, async (req, res) => {
    const { movieId } = req.body;
    if (!movieId) {
      return res.status(400).json({ success: false, message: 'Please include movieId to delete a review.' });
    }
    try {
      const deletedReview = await Review.findOneAndDelete({ movieId });
      if (!deletedReview) return res.status(404).json({ success: false, message: 'Review not found.' });
      res.status(200).json({ success: true, message: 'Review deleted successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting review.' });
    }
  });



app.use('/', router);

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
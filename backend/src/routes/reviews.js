const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createReview,
  upsertProductRating,
  getMyProductRating,
  updateReview,
  deleteReview,
  moderateReview
} = require('../controllers/reviewController');

// Rutas públicas
router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', createReview);
router.put('/product/:productId/rating', upsertProductRating);
router.get('/product/:productId/my-rating', getMyProductRating);

// Editar y eliminar (por ID de reseña)
router.put('/:reviewId', updateReview);
router.delete('/:reviewId', deleteReview);

// Moderación (admin)
router.patch('/:reviewId/moderate', moderateReview);

module.exports = router;

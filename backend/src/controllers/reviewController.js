const Review = require('../models/review');
const User = require('../models/user');
const Product = require('../models/product');
const ProductRating = require('../models/productRating');
const mongoose = require('mongoose');

// Obtener reseñas de un producto
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ 
      product: productId, 
      isApproved: true 
    })
      .sort({ createdAt: 1 })
      .lean();

    const stats = await obtenerEstadisticasRating(productId);
    const userRating = await obtenerRatingUsuario(req.session?.userId, productId);

    res.json({
      success: true,
      data: reviews,
      stats: {
        ...stats,
        totalReviews: reviews.length
      },
      userRating
    });
  } catch (error) {
    console.error('Error obteniendo reseñas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Publicar reseña
const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { userName, comment } = req.body;
    const texto = typeof comment === 'string' ? comment.trim() : '';

    if (!texto) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje de reseña es requerido'
      });
    }

    if (texto.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'La reseña no puede superar 500 caracteres'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const authorData = await resolverAutor(req, userName);

    const review = new Review({
      product: productId,
      user: authorData.user,
      userName: authorData.userName,
      comment: texto
    });

    await review.save();

    res.status(201).json({
      success: true,
      message: 'Reseña publicada correctamente en el chat',
      data: review
    });
  } catch (error) {
    console.error('Error creando reseña:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear o actualizar calificación de usuario
const upsertProductRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating } = req.body;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Debes iniciar sesión para calificar'
      });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'La calificación debe ser un número entero entre 1 y 5'
      });
    }

    const product = await Product.findById(productId).select('_id');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const saved = await ProductRating.findOneAndUpdate(
      { product: productId, user: userId },
      { $set: { rating: parsedRating } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const stats = await actualizarRatingProducto(productId);

    return res.json({
      success: true,
      message: 'Calificación guardada',
      data: {
        rating: saved.rating
      },
      stats
    });
  } catch (error) {
    console.error('Error guardando calificación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener calificación del usuario autenticado para un producto
const getMyProductRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const userRating = await obtenerRatingUsuario(userId, productId);
    return res.json({
      success: true,
      data: { rating: userRating }
    });
  } catch (error) {
    console.error('Error obteniendo calificación del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Editar reseña
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Reseña no encontrada'
      });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'La calificación debe ser entre 1 y 5'
        });
      }
      review.rating = rating;
    }
    if (comment !== undefined) review.comment = comment.trim();

    await review.save();
    res.json({
      success: true,
      message: 'Reseña actualizada',
      data: review
    });
  } catch (error) {
    console.error('Error actualizando reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar reseña
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findByIdAndDelete(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Reseña no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Reseña eliminada'
    });
  } catch (error) {
    console.error('Error eliminando reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Moderar reseña (aprobar/rechazar)
const moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isApproved } = req.body;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { isModerated: true, isApproved: isApproved !== false },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Reseña no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Reseña moderada',
      data: review
    });
  } catch (error) {
    console.error('Error moderando reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

async function actualizarRatingProducto(productId) {
  const stats = await obtenerEstadisticasRating(productId);

  await Product.findByIdAndUpdate(productId, {
    rating: stats.avgRating,
    ratingCount: stats.totalRatings
  });

  return stats;
}

async function obtenerEstadisticasRating(productId) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return {
      avgRating: 0,
      totalRatings: 0
    };
  }

  const productObjectId = new mongoose.Types.ObjectId(productId);
  const agg = await ProductRating.aggregate([
    { $match: { product: productObjectId } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (!agg.length) {
    return {
      avgRating: 0,
      totalRatings: 0
    };
  }

  return {
    avgRating: Math.round((agg[0].avgRating || 0) * 10) / 10,
    totalRatings: agg[0].totalRatings || 0
  };
}

async function obtenerRatingUsuario(userId, productId) {
  if (!userId) return 0;
  const ownRating = await ProductRating.findOne({
    user: userId,
    product: productId
  })
    .select('rating')
    .lean();
  return ownRating?.rating || 0;
}

async function resolverAutor(req, fallbackName) {
  const userId = req.session?.userId;
  if (userId) {
    const user = await User.findById(userId).select('name').lean();
    if (user?.name) {
      return {
        user: userId,
        userName: user.name
      };
    }
  }

  const safeName = typeof fallbackName === 'string' ? fallbackName.trim() : '';
  if (!safeName) {
    const err = new Error('Debes iniciar sesión o indicar un nombre para publicar una reseña');
    err.status = 400;
    throw err;
  }

  return {
    user: undefined,
    userName: safeName
  };
}

module.exports = {
  getProductReviews,
  createReview,
  upsertProductRating,
  getMyProductRating,
  updateReview,
  deleteReview,
  moderateReview
};

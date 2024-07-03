const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllVideos
} = require('../controllers/categories');
const Category = require('../models/Category');
const router = express.Router();
const advancedResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.route('/').get(advancedResults(Category), getCategories);
router.get('/all-videos', getAllVideos);

// Protected routes
router.use(protect);
router
  .route('/')
  .post(authorize('admin'), createCategory);

router
  .route('/:id')
  .get(authorize('admin'), getCategory)
  .put(authorize('admin'), updateCategory)
  .delete(authorize('admin'), deleteCategory);

module.exports = router;

const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Category = require('../models/Category');
const Video = require('../models/Video');

exports.getCategories = asyncHandler(async (req, res, next) => {
  const categories = await Category.find();
  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

exports.getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return next(
      new ErrorResponse(`No category with that id of ${req.params.id}`)
    );
  }
  res.status(200).json({ success: true, data: category });
});

exports.createCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.create({
    ...req.body,
    userId: req.user.id
  });
  return res.status(200).json({ success: true, data: category });
});

exports.updateCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    context: 'query'
  });
  if (!category)
    return next(
      new ErrorResponse(`No category with that id of ${req.params.id}`)
    );
  res.status(200).json({ success: true, data: category });
});

exports.deleteCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findById(req.params.id);
  if (!category) {
    return next(
      new ErrorResponse(`No category with id of ${req.params.id}`, 404)
    );
  }
  await category.remove();
  return res.status(200).json({ success: true, category });
});

exports.getAllVideos = asyncHandler(async (req, res, next) => {
  let query = {};

  if (req.query.category) {
    query.categoryId = req.query.category;
  }

  const videos = await Video.find(query).populate('categoryId', 'title');

  res.status(200).json({
    success: true,
    count: videos.length,
    data: videos
  });
});

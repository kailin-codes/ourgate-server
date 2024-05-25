const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Video = require('../models/Video');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const STOCK_THUMBNAIL_URL = 'https://res.cloudinary.com/di38cp0gv/image/upload/v1722044739/172196810362008095_1_hm988x.png';

exports.getVideos = asyncHandler(async (req, res, next) => {
  const excludeId = req.query.excludeId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const query = { status: 'public' };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const total = await Video.countDocuments(query);
  const videos = await Video.find(query)
    .populate('userId', 'channelName photoUrl')
    .populate('categoryId')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const pagination = {};
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  console.log('Query:', query);
  console.log('Total videos:', total);
  console.log('Filtered videos:', videos);

  res.status(200).json({
    success: true,
    count: videos.length,
    pagination,
    data: videos
  });
});

exports.getVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id)
    .populate({
      path: 'categoryId'
    })
    .populate({ path: 'userId', select: 'channelName subscribers photoUrl' })
    .populate({ path: 'likes' })
    .populate({ path: 'dislikes' })
    .populate({ path: 'comments' });

  if (!video) {
    return next(new ErrorResponse(`No video with that id of ${req.params.id}`));
  }

  res.status(200).json({ success: true, data: video });
});

exports.videoUpload = asyncHandler(async (req, res, next) => {
  console.log('Video upload request received');
  console.log('Request files:', req.files);
  console.log('Request body:', req.body);

  if (!req.files || Object.keys(req.files).length === 0 || !req.files.video) {
    return next(new ErrorResponse(`Please upload a video`, 400));
  }

  const video = req.files.video;

  console.log('Received file:', video.name);
  console.log('File size:', video.size);

  if (!video.mimetype.startsWith('video')) {
    return next(new ErrorResponse(`Please upload a video file`, 400));
  }

  if (video.size > 100 * 1024 * 1024) {
    return next(new ErrorResponse(`Please upload a video less than 100MB`, 400));
  }

  try {
    const tempFilePath = video.tempFilePath;
    console.log('Temporary file path:', tempFilePath);

    const result = await cloudinary.uploader.upload(tempFilePath, {
      resource_type: "video",
      folder: "videos",
      chunk_size: 6000000,
      eager: [
        { width: 300, height: 300, crop: "pad", audio_codec: "none" },
        { width: 160, height: 100, crop: "crop", gravity: "south", audio_codec: "none" }
      ],
      eager_async: true
    });

    console.log('Cloudinary upload result:', result);

    fs.unlinkSync(tempFilePath);

    const videoModel = await Video.create({
      url: result.secure_url,
      title: path.parse(video.name).name,
      userId: req.user._id,
      thumbnailUrl: STOCK_THUMBNAIL_URL
    });

    res.status(201).json({ success: true, data: videoModel });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return next(new ErrorResponse(`Problem with video upload`, 500));
  }
});

exports.updateVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!video) {
    return next(new ErrorResponse(`No video with that id of ${req.params.id}`));
  }

  res.status(200).json({ success: true, data: video });
});

exports.updateViews = asyncHandler(async (req, res, next) => {
  let video = await Video.findById(req.params.id);

  if (!video) {
    return next(new ErrorResponse(`No video with that id of ${req.params.id}`));
  }

  video.views++;

  await video.save();

  res.status(200).json({ success: true, data: video });
});

exports.uploadVideoThumbnail = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    return next(new ErrorResponse(`No video with id of ${req.params.id}`, 404));
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.thumbnail;

  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  if (file.size > 5 * 1024 * 1024) {
    return next(new ErrorResponse(`Please upload an image less than 5MB`, 400));
  }

  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'video_thumbnails',
      width: 300,
      crop: "scale"
    });

    await Video.findByIdAndUpdate(req.params.id, { thumbnailUrl: result.secure_url });

    res.status(200).json({ success: true, data: result.secure_url });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return next(new ErrorResponse(`Problem with thumbnail upload`, 500));
  }
});

exports.deleteVideo = asyncHandler(async (req, res, next) => {
  let video = await Video.findOne({ userId: req.user._id, _id: req.params.id });

  if (!video) {
    return next(new ErrorResponse(`No video with id of ${req.params.id}`, 404));
  }

  try {
    const videoPublicId = video.url.split('/').slice(-1)[0].split('.')[0];
    const thumbnailPublicId = video.thumbnailUrl.split('/').slice(-1)[0].split('.')[0];

    await cloudinary.uploader.destroy(videoPublicId, { resource_type: "video" });
    if (video.thumbnailUrl !== STOCK_THUMBNAIL_URL) {
      await cloudinary.uploader.destroy(thumbnailPublicId);
    }

    await video.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return next(new ErrorResponse(`Problem deleting video`, 500));
  }
});

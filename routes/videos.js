const express = require('express')
const {
  getVideos,
  getVideo,
  videoUpload,
  updateVideo,
  updateViews,
  uploadVideoThumbnail,
  deleteVideo
} = require('../controllers/videos')
const Video = require('../models/Video')
const router = express.Router()
const advancedResults = require('../middleware/advancedResults')
const { protect } = require('../middleware/auth')

// Route for uploading a new video
router.post('/', protect, videoUpload)

// Route for fetching all videos for a user (new route)
router.get('/', protect, advancedResults(
  Video,
  [
    { path: 'userId' },
    { path: 'categoryId' },
    { path: 'likes' },
    { path: 'dislikes' },
    { path: 'comments' }
  ]
), getVideos)

// Route for fetching private videos
router.route('/private').get(
  protect,
  advancedResults(
    Video,
    [
      { path: 'userId' },
      { path: 'categoryId' },
      { path: 'likes' },
      { path: 'dislikes' },
      { path: 'comments' }
    ],
    {
      status: 'private'
    }
  ),
  getVideos
)

// Route for fetching public videos
router
  .route('/public')
  .get(
    advancedResults(
      Video,
      [
        { path: 'userId', select: 'channelName photoUrl' },
        { path: 'categoryId' },
        { path: 'likes' },
        { path: 'dislikes' }
      ],
      { status: 'public' }
    ),
    getVideos
  )

// Routes for specific video operations
router
  .route('/:id')
  .get(getVideo)
  .put(protect, updateVideo)
  .delete(protect, deleteVideo)

// Route for uploading video thumbnail
router.route('/:id/thumbnails').put(protect, uploadVideoThumbnail)

// Route for updating video views
router.route('/:id/views').put(updateViews)

module.exports = router

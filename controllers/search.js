const asyncHandler = require('../middleware/async')
const Video = require('../models/Video')
const User = require('../models/User')

exports.search = asyncHandler(async (req, res, next) => {
  const text = req.body.text
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 12
  const startIndex = (page - 1) * limit

  const channelsPromise = User.find(
    { $text: { $search: text } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .skip(startIndex)
    .populate('videos')

  const videosPromise = Video.find(
    { $text: { $search: text } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .skip(startIndex)
    .populate('userId')

  const [channels, videos] = await Promise.all([channelsPromise, videosPromise])

  const results = [...channels, ...videos].sort((a, b) => b.score - a.score)

  const totalChannels = await User.countDocuments({ $text: { $search: text } })
  const totalVideos = await Video.countDocuments({ $text: { $search: text } })
  const total = totalChannels + totalVideos
  const totalPages = Math.ceil(total / limit)

  console.log('Search results:', results) // Debug log

  res.status(200).json({
    success: true,
    count: results.length,
    totalPages,
    currentPage: page,
    data: results
  })
})

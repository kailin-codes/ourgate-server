const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

router.get('/*', async (req, res) => {
  const videoUrl = `https://res.cloudinary.com/${req.params[0]}`;
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    res.set('Content-Type', 'video/mp4');
    response.body.pipe(res);
  } catch (error) {
    console.error('Error proxying Cloudinary video:', error);
    res.status(500).send('Error fetching video');
  }
});

module.exports = router;

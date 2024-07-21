const fs = require('fs');
const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config/.env' });

// Load models
const User = require('./models/User');
const Category = require('./models/Category');
const Video = require('./models/Video');
const Comment = require('./models/Comment');
const Reply = require('./models/Reply');
const Feeling = require('./models/Feeling');
const History = require('./models/History');
const Subscription = require('./models/Subscription');

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Read JSON files
const users = JSON.parse(fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8'));
const categories = JSON.parse(fs.readFileSync(`${__dirname}/_data/categories.json`, 'utf-8'));
const videos = JSON.parse(fs.readFileSync(`${__dirname}/_data/videos.json`, 'utf-8'));
const comments = JSON.parse(fs.readFileSync(`${__dirname}/_data/comments.json`, 'utf-8'));
const replies = JSON.parse(fs.readFileSync(`${__dirname}/_data/replies.json`, 'utf-8'));
const feelings = JSON.parse(fs.readFileSync(`${__dirname}/_data/feelings.json`, 'utf-8'));
const histories = JSON.parse(fs.readFileSync(`${__dirname}/_data/histories.json`, 'utf-8'));
const subscriptions = JSON.parse(fs.readFileSync(`${__dirname}/_data/subscriptions.json`, 'utf-8'));

// Import into DB
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Video.deleteMany();
    await Comment.deleteMany();
    await Reply.deleteMany();
    await Feeling.deleteMany();
    await History.deleteMany();
    await Subscription.deleteMany();

    // Import users
    const createdUsers = await User.create(users);

    // Create a map of old to new user IDs
    const userMap = createdUsers.reduce((acc, user) => {
      acc[user.email] = user._id;
      return acc;
    }, {});

    // Import categories
    const createdCategories = await Category.create(
      categories.map(category => ({
        ...category,
        userId: userMap[category.userId] || userMap[Object.keys(userMap)[0]]
      }))
    );

    // Create a map of category titles to new IDs
    const categoryMap = createdCategories.reduce((acc, category) => {
      acc[category.title] = category._id;
      return acc;
    }, {});

// Import videos
const createdVideos = await Video.create(
      videos.map(video => {
        const user = createdUsers.find(u => u.email === video.userId);
        if (!user) {
          console.log(`No user found for video: ${video.title}, using first user as default`);
          return {
            ...video,
            userId: createdUsers[0]._id,
            categoryId: categoryMap[video.categoryId] || categoryMap[Object.keys(categoryMap)[0]]
          };
        }
        return {
          ...video,
          userId: user._id,
          categoryId: categoryMap[video.categoryId] || categoryMap[Object.keys(categoryMap)[0]]
        };
      })
    );

    console.log('Created videos:', createdVideos);


    console.log('Created videos:', createdVideos);  // Log created videos

    // Create a map of video titles to new IDs
    const videoMap = createdVideos.reduce((acc, video) => {
      acc[video.title] = video._id;
      return acc;
    }, {});

    // Import comments
    // Import comments
// Import comments
const createdComments = await Comment.create(
      comments.map(comment => {
        const video = createdVideos.find(v => v.title === comment.videoId);
        if (!video) {
          console.log(`No video found for comment: ${comment.text}, using first video as default`);
          return {
            ...comment,
            userId: userMap[comment.userId] || userMap[Object.keys(userMap)[0]],
            videoId: createdVideos[0]._id
          };
        }
        return {
          ...comment,
          userId: userMap[comment.userId] || userMap[Object.keys(userMap)[0]],
          videoId: video._id
        };
      })
    );

    console.log('Created comments:', createdComments);

    // Create a map of comment texts to new IDs
    const commentMap = createdComments.reduce((acc, comment) => {
      acc[comment.text] = comment._id;
      return acc;
    }, {});

// Import replies
const createdReplies = await Reply.create(
      replies.map(reply => {
        const comment = createdComments.find(c => c.text === reply.commentId);
        if (!comment) {
          console.log(`No comment found for reply: ${reply.text}, skipping`);
          return null;
        }
        return {
          ...reply,
          userId: userMap[reply.userId] || userMap[Object.keys(userMap)[0]],
          commentId: comment._id
        };
      }).filter(Boolean)
    );

    console.log('Created replies:', createdReplies);

    // Import feelings
    await Feeling.create(
      feelings.map(feeling => ({
        ...feeling,
        userId: userMap[feeling.userId] || userMap[Object.keys(userMap)[0]],
        videoId: videoMap[feeling.videoId] || videoMap[Object.keys(videoMap)[0]]
      }))
    );

    // Import histories
    await History.create(
      histories.map(history => ({
        ...history,
        userId: userMap[history.userId] || userMap[Object.keys(userMap)[0]],
        videoId: history.videoId ? (videoMap[history.videoId] || videoMap[Object.keys(videoMap)[0]]) : null
      }))
    );

    // Import subscriptions
    await Subscription.create(
      subscriptions.map(subscription => ({
        ...subscription,
        subscriberId: userMap[subscription.subscriberId] || userMap[Object.keys(userMap)[0]],
        channelId: userMap[subscription.channelId] || userMap[Object.keys(userMap)[1]]
      }))
    );

    console.log('Data Imported...'.green.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Category.deleteMany();
    await Video.deleteMany();
    await Comment.deleteMany();
    await Reply.deleteMany();
    await Feeling.deleteMany();
    await History.deleteMany();
    await Subscription.deleteMany();

    console.log('Data Destroyed...'.red.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
  }
};

if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
}

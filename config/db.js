const mongoose = require('mongoose');

// Set the strictQuery option to suppress the deprecation warning
mongoose.set('strictQuery', false);

const DBconnection = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
  } catch (err) {
    console.log(`For some reasons we couldn't connect to the DB`.red, err);
    process.exit(1); // Exit process with failure
  }
};

module.exports = DBconnection;

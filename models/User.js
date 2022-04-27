const mongoose = require('mongoose');


const User = mongoose.Schema({
	uid: String,
	email: String,
	name: String,
	pic: String,
});

module.exports = mongoose.model('User', User);

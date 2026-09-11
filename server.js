const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const createClient = require('redis').createClient;

const app = express();
app.use(express.json());
const redis = createClient({
    url: 'redis://127.0.0.1:6379'
});

redis.on('error', (err) => console.log('Redis Client Error', err));

mongoose.connect('mongodb://localhost:27017/')
.then(() => {console.log('connected to database')})
.catch((err) => {console.log('error in connecting')});

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        unique: true,
        required: true,        
    },
    email:{
        type: String,
        required: true,
        unique: true,
        },

    password:{
        type: String,
        required: true,
      },
    })

const User = mongoose.model('User', userSchema);

app.post('/users', async (req, res) => {

    const {username, email, password} = req.body;

    if(!username || !email || !password){
        return res.status(400).json({message: 
            !username ? 'username is required' : !email ? 'email is required' : 'password is required'});
    }

    const existingUser = await User.findOne({$or: [{username}, {email}]});
    if(existingUser){
        return res.status(400).json({message: 'username or email already exists'});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        username,
        email,
        password: hashedPassword,
    });

    await user.save();

    res.status(201).json({message: 'user registered successfully'});
});

app.get('/users', async (req, res) => {

    const {username, email} = req.body;

    if(!username && !email){
        return res.status(400).json({message: 'username or email is required'});
    }

    const rediskey = username

    ? `user:username:${username}`
    : `email:${email}`;

    const cachedUser = await redis.get(rediskey);

    if(cachedUser){

        console.log('User Found In Redis');

        const user = JSON.parse(cachedUser);

    if(username && user.username !== username){
        return res.status(404).json({message: 'username not matched'});
    }

    if(email && user.email !== email){
        return res.status(404).json({message: 'email not matched'});
    }
        return res.status(200).json(user);
    }

    console.log('User Not Find In Redis, Checking MongoDB');

    const user = await User.findOne({$or: [{username: username}, {email: email}]});

    if(!user){
        return res.status(404).json({message: 'user not found'});
    }
    if(username && user.username !== username){
        return res.status(404).json({message: 'username not matched'});
    }
    if(email && user.email !== email){
        return res.status(404).json({message: 'email not matched'});
    }

    const userData = {
        username: user.username,
        email: user.email,
        password: user.password
    };

    await redis.set(rediskey, JSON.stringify(userData), {
        EX: 300
    });

    console.log('User Found In MongoDB, Saving To Redis');

    return res.status(200).json(userData);
});


app.put('/users', async (req, res) => {
    const { username, email, password, newUsername, newEmail, newPassword } = req.body;

   if (!username && !email && !password) {
    return res.status(400).json({ message: 'Please provide username, email, or password' });
}

if (!!username !== !!newUsername) {
    return res.status(400).json({
        message: username ? 'Please provide new username' : 'Please provide username'
    });
}

if (!!email !== !!newEmail) {
    return res.status(400).json({
        message: email ? 'Please provide new email' : 'Please provide email'
    });
}

if (newPassword && !password) {
    return res.status(400).json({ message: 'Please provide current password' });
}

    const user = await User.findOne({
        $or: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
        ]
    });

   if (!user) {
    return res.status(404).json({ message: 'User not found' });
}

if (username && user.username !== username) {
    return res.status(400).json({ message: 'Incorrect username' });
}

if (email && user.email !== email) {
    return res.status(400).json({ message: 'Incorrect email' });
}

if (password && !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: 'Incorrect password' });
}

    const unchangedFields = [];
    if (newUsername && newUsername === user.username) {
        unchangedFields.push('new username and old username are the same');
    }
    if (newEmail && newEmail === user.email) {
        unchangedFields.push('new email and old email are the same');
    }

    if (unchangedFields.length > 0) {
        return res.status(400).json({
            message: unchangedFields.join(' and ')
        });
    }

    const conflictingFields = [];
    const existingUsers = await User.find({
        $or: [
            ...(newUsername ? [{ username: newUsername }] : []),
            ...(newEmail ? [{ email: newEmail }] : [])
        ]
    });

    for (const existingUser of existingUsers) {
        if (existingUser._id.toString() === user._id.toString()) {
            continue;
        }
        if (newUsername && existingUser.username === newUsername) {
            conflictingFields.push('new username');
        }
        if (newEmail && existingUser.email === newEmail) {
            conflictingFields.push('new email');
        }
    }

    if (conflictingFields.length > 0) {
        return res.status(400).json({
            message: `${conflictingFields.join(' and ')} already exist`
        });
    }

    if (newUsername) {
        user.username = newUsername;
    }

    if (newEmail) {
        user.email = newEmail;
    }

    if (newPassword) {
        if (await bcrypt.compare(newPassword, user.password)) {
            return res.status(400).json({ message: 'New password and old password are the same' });
        }
        user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    return res.status(200).json({ message: 'User updated successfully' });
});

redis.connect().then(() => {
    console.log('connected to redis');
}).catch((err) => {
    console.log('error in connecting to redis', err);
}); 

app.listen(3000, () => {
    console.log('server is running http://localhost:3000');
});
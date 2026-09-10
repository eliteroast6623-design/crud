const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const app = express();
app.use(express.json());

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

    if(!username || !email){

        !username ? res.status(400).json({message: 'username is required'}) : res.status(400).json({message: 'email is required'});
    }

    const user = await User.findOne({$or: [{username}, {email}]})

    if(!user) {
        return res.status(404).json({message: 'user not found'});
    }

    return res.status(200).json({
        id: user._id,
        username: user.username,
        email: user.email,
        password: user.password
    })






















    // const { username, email } = req.body;

    // if (!username && !email) {
    //     return res.status(400).json({
    //         message: 'username or email is required'
    //     });
    // }

    // const user = await User.findOne(
    //     username ? { username } : { email }
    // ).lean();

    // if (!user) {
    //     return res.status(404).json({
    //         message: 'user not found'
    //     });
    // }

    // return res.status(200).json({
    //     username: user.username,
    //     email: user.email,
    //     password: user.password
    // });
});
    






app.listen(3000, () => {
    console.log('server is running http://localhost:3000');
});


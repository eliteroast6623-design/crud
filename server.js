require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const createClient = require('redis').createClient;
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/jxl']
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const middleware = (req, res, next) => {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'access token is missing'
        });
    }

    jwt.verify(
        token,
            process.env.ACCESS_TOKEN_SECRET,
                async (err, decoded) => {

    if (err) {
        return res.status(403).json({message: 
            'invalid access token'
        });
    }

    try {

const revoked = await redis.get(`denylist:${decoded.jti}`);

    if (revoked) {
        return res.status(401).json({message: 
            'access token revoked'
        });
    }

const existingUser = await User.findById(
    decoded.userId
    ).select('deleted sessionVersion');

    if (!existingUser) {
        return res.status(401).json({message: 
            'user not found'
        });
    }

    if (existingUser.deleted) {
        return res.status(401).json({message: 
            'account deleted'
        });
    }

    if (
        decoded.sessionVersion !==
            existingUser.sessionVersion
            ) {
                return res.status(401).json({message:
                    'session revoked'
                });
            }

    req.user = decoded;
        next();
        } catch (error) {
            console.error('Auth middleware error:', error);
                return res.status(500).json({message: 
                    'Internal server error'
                });
            }
        }
    );
};
    
const app = express();

    app.use(express.json());

const redis = createClient({
    url: 'redis://127.0.0.1:6379'
});

    redis.on('error', (err) => console.log('Redis Client Error', err));

app.get('/healthz', (req, res) => {
    res.status(200).json({ message: 'ok' });
});

app.get('/readyz' , (req, res) => {
const mongoReady = mongoose.connection.readyState === 1;
const redisReady = redis.isReady;

    if (!mongoReady || !redisReady) {
        return res.status(503).json({
            status: 'not ready',
            mongo: mongoReady,
            redis: redisReady
        });
    }

    return res.status(200).json({
        status: 'ready',
        mongo: true,
        redis: true
    });
});

const authActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
    },
    eventType: { 
        type: String, enum: ['login', 'otp-login'], required: true
    },
    createdAt: {
        type: Date, default: Date.now
    }
});

const AuthActivity = mongoose.model('AuthActivity', authActivitySchema);

    mongoose.connect('mongodb://localhost:27017/crud-app',)
    .then(() => {console.log('connected to database')})
    .catch((err) => {console.log('error in connecting')});

const userSchema = new mongoose.Schema({
    phone:{
        type: String, required: true
    },
    countryCode:{
        type: String, required: true
    },
    email:{
        type: String, required: true
    },
    password:{
        type: String, required: true
    },
    username:{
        type: String, required: true,       
    },
    address:{
        type: String, required: true,
    },
    dateOfBirth:{
        type: String, required: true,
    },
    signedIn:{
        type: Boolean, default: false
    },
    avatar:{
        secureUrl:{
            type: String, default: null
        },
        publicId:{
            type: String, default: null
        },
        contentType:{
            type: String, default: null
        },
        size:{
            type: Number, default: null
        }
    },
    deleted: { 
        type: Boolean, default: false 
    },
    version:{
        type: Number, default: 0
    },
    sessionVersion:{
        type: Number, default: 0
    }
})

const User = mongoose.model('User', userSchema);
 
    User.collection.createIndex({
        phone: 1,},
            {unique: true,
                partialFilterExpression: {deleted: false}
            })

    User.collection.createIndex({
        email: 1,},
            {unique: true,
                partialFilterExpression: {deleted: false}
            })

app.post('/users', async (req, res) => {

const {phone, countryCode, email, password, username, address, dateOfBirth } = req.body;

const missingFields = [];

    if (!phone) missingFields.push('phone');
    if (!countryCode) missingFields.push('countryCode');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!username) missingFields.push('username');
    if (!address) missingFields.push('address');
    if (!dateOfBirth) missingFields.push('dateOfBirth');

    if (missingFields.length > 0) {
    return res.status(400).json({
        message: `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`
    });
}

const phoneExists = await User.exists({phone, deleted: false});
const emailExists = await User.exists({email, deleted: false});

    if(phoneExists || emailExists){
        return res.status(400).json({
            message: phoneExists ? (emailExists ? 'phone no. and email already exists' : 'phone no. already exists') : 'email already exists'
        })
    }

const hashedPassword = await bcrypt.hash(password, 13);

const user = new User({
    phone, countryCode, email, password: hashedPassword, username, address, dateOfBirth,
    });

const redirect = (path) => {
    return path;
}

    await user.save();

    res.status(201).json({message: 'created user resource', next: redirect('/users/otp/request')});
    }
);


app.post('/users/otp/request', async (req, res) => {

const {phone, countryCode, email, password, username, address, dateOfBirth } = req.body;

const missingFields = [];

    if (!phone) missingFields.push('phone');
    if (!countryCode) missingFields.push('countryCode');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!username) missingFields.push('username');
    if (!address) missingFields.push('address');
    if (!dateOfBirth) missingFields.push('dateOfBirth');

    if (missingFields.length > 0) {
    return res.status(400).json({
        message: `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`
    });
}

const user = await User.findOne({$or: [{phone}, {countryCode}, {email}, {username}, {address}, {dateOfBirth}, {deleted: false}]});

const notMatchedFields = [];

    if (!user) {
        return res.status(404).json({ message: 'user not found' });
    }

    if (user.phone !== phone) notMatchedFields.push('phone');
    if (user.countryCode !== countryCode) notMatchedFields.push('countryCode');
    if (user.email !== email) notMatchedFields.push('email');
    if (user.username !== username) notMatchedFields.push('username');
    if (user.address !== address) notMatchedFields.push('address');
    if (user.dateOfBirth !== dateOfBirth) notMatchedFields.push('dateOfBirth');

    if (notMatchedFields.length > 0) {
        return res.status(404).json({
            message: `${notMatchedFields.join(', ')} ${notMatchedFields.length === 1 ? 'does' : 'do'} not match`
        });
    }

    if(!await bcrypt.compare(password, user.password)){
        return res.status(400).json({message: 'incorrect password'});
    }

const cooldown = await redis.get(`otp:cooldown:${phone}`);

    if(cooldown){
        return res.status(429).json({message: 'wait for 30 seconds'});
    }

const otp = crypto.randomInt(100000, 999999).toString();
const otpHash = await bcrypt.hash(otp, 13);

    await redis.set(`otp:${phone}`, otpHash, {
        EX: 300
    });

    await redis.set(`otp:cooldown:${phone}`, '1', { EX: 30 });
    console.log('OTP:', otp);

const redirect = (path) => {
    return path;
    }

    return res.status(200).json({
        message: 'OTP sent successfully', next: redirect('/users/otp/verify')
   })
});


app.post('/users/otp/verify', async (req, res) => {

const {phone, countryCode, email, password, username, address, dateOfBirth, otp } = req.body;

const missingFields = [];

    if (!phone) missingFields.push('phone');
    if (!countryCode) missingFields.push('countryCode');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!username) missingFields.push('username');
    if (!address) missingFields.push('address');
    if (!dateOfBirth) missingFields.push('dateOfBirth');
    
    if (missingFields.length > 0) {
    return res.status(400).json({
        message: `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`
    });
}

const user = await User.findOne({$or: [{phone}, {countryCode}, {email}, {username}, {address}, {dateOfBirth}], deleted: false});

const notMatchedFields = [];

    if (!user) {
        return res.status(404).json({ message: 'user not found' });
    }

    if (user.phone !== phone) notMatchedFields.push('phone');
    if (user.countryCode !== countryCode) notMatchedFields.push('countryCode');
    if (user.email !== email) notMatchedFields.push('email');
    if (user.username !== username) notMatchedFields.push('username');
    if (user.address !== address) notMatchedFields.push('address');
    if (user.dateOfBirth !== dateOfBirth) notMatchedFields.push('dateOfBirth');

    if (notMatchedFields.length > 0) {
        return res.status(404).json({
            message: `${notMatchedFields.join(', ')} ${notMatchedFields.length === 1 ? 'does' : 'do'} not match`
        });
    } 

const otpKey = `otp:${phone}`;
const attemptsKey = `otp:attempts:${phone}`;
const sharedOtpHash = await redis.get(otpKey);

    if (!sharedOtpHash) {
        return res.status(400).json({
            message: 'OTP expired or wrong otp'
        });
    }

const attempts = Number(await redis.get(attemptsKey)) || 0;

    if (attempts >= 5) {
        await redis.del(otpKey);
        await redis.del(attemptsKey);

        return res.status(400).json({
            message: 'too many attempts'
        })
    }

const isValidOtp = await bcrypt.compare(otp, sharedOtpHash);

    if (!isValidOtp) {
const newAttempts = attempts + 1;

    if (newAttempts >= 5) {
        await redis.del(otpKey);
        await redis.del(attemptsKey);
        return res.status(400).json({
            message: 'too many incorrect attempts'
        })
    }

        await redis.set(
            attemptsKey,
            newAttempts,
            { EX: 300 }
        )

        return res.status(400).json({
            message: `Invalid OTP. ${5 - newAttempts} attempts remaining`
        });
    }

const accessToken = jwt.sign(
    { userId: user._id,
        sessionVersion: user.sessionVersion
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m',
        jwtid: crypto.randomUUID() }
);
const refreshToken = jwt.sign(
    { userId: user._id,
        sessionVersion: user.sessionVersion
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d',
        jwtid: crypto.randomUUID()
     }
);

    await AuthActivity.create({
    userId: user._id,
    eventType: 'otp-login'
});

    await redis.del(otpKey);
    await redis.del(attemptsKey);

const redirect = (path) => {
        return path;
    }

    return res.status(200).json({
        message: 'OTP verified', accessToken, refreshToken, next: redirect('/users/login')
    })
})
    

app.post('/users/login', async (req, res) => {

const {username, email, password} = req.body;

const missingFields = [];

    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!username) missingFields.push('username');
    
    if (missingFields.length > 0) {
    return res.status(400).json({
        message: `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`
    });
}

const user = await User.findOne({$or: [{username}, {email}], deleted: false});
    if(!user){
        return res.status(404).json({message: 'user not found'});
    }

    if(!await bcrypt.compare(password, user.password)){
        return res.status(400).json({message: 'incorrect password'});
    }
const accessToken = jwt.sign(
        { userId: user._id, sessionVersion: user.sessionVersion },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m',
            jwtid: crypto.randomUUID() }
    );
const refreshToken = jwt.sign(
        { userId: user._id, sessionVersion: user.sessionVersion },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d',
            jwtid: crypto.randomUUID()
         }
    );
    await AuthActivity.create({
        userId: user._id,
        sessionVersion: user.sessionVersion,
        eventType: 'login'
});
const signInStatus = await User.findOneAndUpdate(
        { $or: [{ username }, { email }] },
        { $set: { signedIn: true } },
        { new: true }
    );

    const redirect = (path) => {
        return path;
    }

    await user.save();

    return res.status(200).json({message: 'login successful', accessToken, refreshToken, next: redirect('/users/me')});
    });


app.get('/users/me', middleware,async (req, res) => {

    try {

const userId = req.user.userId;
const redisKey = `user:profile:${userId}`;
const cachedUser = await redis.get(redisKey);

    if (cachedUser) {
        console.log('User Found In Redis');

const user = JSON.parse(cachedUser);
        return res.status(200).json(user);
    }

    console.log('User Not Found In Redis, Checking MongoDB');
    

const user = await User.findById(userId).select(
        'phone countryCode username email address dateOfBirth version sessionVersion signedIn avatar'
    );

    if (!user || user.deleted) {                                                   
        return res.status(404).json({                                                   
            message: 'user not found'                                                   
    });                                                   
}

const userData = {
    phone: user.phone,
    countryCode: user.countryCode,
    username: user.username,
    email: user.email,
    address: user.address,
    dateOfBirth: user.dateOfBirth,
    version: user.version,
    sessionVersion: user.sessionVersion,
    signedIn: user.signedIn,
    avatar: user.avatar
};

    await redis.set(
        redisKey,
        JSON.stringify(userData),
        {
            EX: 300
        }
    );

    console.log('User Found In MongoDB, Saving To Redis');

    return res.status(200).json(userData);

    } catch (error) {

    console.log(error);

    return res.status(500).json({
        message: 'server error',
    });
}
});


app.post('/users/logout', middleware, async (req, res) => {

const {jti, exp, userId} = req.user;
    if(!jti || !exp){
        return res.status(400).json({message:
            'invalid access token'
        })
    }
    const user = await User.findById(userId);

    if(!user){
        return res.status(404).json({message:
            'user not found'
        })
    }

const now = Math.floor(Date.now() / 1000);
const remainingLifetime = exp - now;

    if (remainingLifetime > 0) {
        await redis.set(
            `denylist:${jti}`,
            '1',
            {
                 EX: remainingLifetime
            }
        );
    }

    if(!user.signedIn){
        return res.status(400).json({message: 'user is not signed in'});
    }
    
const signoutStatus = await user.updateOne(
        { $set: { signedIn: false } },
        { new: true }
    );
    return res.status(200).json({message: 'logout successful'});
});


app.get('/users/:id', async (req, res) => {

const { id } = req.params;

    try {

const existingUser = await User.findById(id)
    
    if (!existingUser || existingUser.deleted) {
        return res.status(404).json({
            message: 'user not found'
        })
    }

    return res.status(200).json({
        username: existingUser.username,
        countryCode: existingUser.countryCode,
        avatar: existingUser.avatar
    });

    } catch (error) {
        console.log(error);

    return res.status(500).json({
        message: 'Internal server error'
    });
    }
});


app.patch('/users/me/update/:id', async (req, res) => {

    try {

const userId = req.params.id;

const {username, email, password, address, dateOfBirth, version} = req.body;


    if (version === undefined) {
        return res.status(400).json({message: 
            'version is required'
        });
    }
    if (username === undefined && email === undefined && password === undefined && address === undefined && dateOfBirth === undefined) {
        return res.status(400).json({message: 
            'please provide at least one field'
        });
    }

const updateUser = Object.fromEntries(
    Object.entries({username, email, address, dateOfBirth})
        .filter(([key, value]) => value !== undefined)
    );

    if (password !== undefined) {
        updateUser.password = await bcrypt.hash(password, 13);
    }

const existingUser = await User.findById(userId);

    if (!existingUser || existingUser.deleted) {
        return res.status(404).json({message: 
            'User not found'
        });
    }

const updatedUser = await User.findOneAndUpdate( {
    _id: userId,
    deleted: false,
    version: version
    },
    {
        $set: updateUser,
        $inc: {
                version: 1
            }
        },
        {
            returnDocument: 'after',
            runValidators: true
        }).select('-password');

    if (!updatedUser) {

const currentUser = await User.findById(userId)
    .select('version deleted');

    if (!currentUser || currentUser.deleted) {
        return res.status(404).json({message: 
            'User not found'
        });
    }

    return res.status(409).json({message: 
        'Profile was modified by another',
        currentVersion: currentUser.version
        });
    }

    await redis.del(`user:profile:${userId}`);

    return res.status(200).json({
        message: 'Profile updated successfully',
        version: updatedUser.version,
        user: updatedUser
    });

    } catch (error) {

    console.error('Profile update error:', error);

    return res.status(500).json({message: 
        'Internal server error'
    });
}
});


app.put('/users/me/replace/:id', async (req, res) => {

const userId = req.params.id;

const { username, email, password, address, dateOfBirth } = req.body;
    
    if (!username && !email && !password && !address && !dateOfBirth) {
        return res.status(400).json({
            message: 'please provide at least one field'
        })
    }

const existingUser = await User.findById(userId);

    if (!existingUser || existingUser.deleted) {
        return res.status(404).json({
            message: 'User not found'
        });
    }

const updateUser = Object.fromEntries(
    Object.entries({ username, email, password, address, dateOfBirth, version })
        .filter(([value]) => value !== undefined)
    );

    if (password !== undefined) {
        updateUser.password = await bcrypt.hash(password,13);
    }

const updatedUser = await User.findByIdAndUpdate(
    userId,
        { $set: updateUser },
        { returnDocument : 'after',}
    ).select('-password');
    const hashedPassword = await bcrypt.hash(password, 13);
    updatedUser.password = hashedPassword;
    await updatedUser.save();

    return res.status(200).json({
        message: 'profile replaced',
        user: updatedUser})
    });


app.post('/users/me/avatar/presign', middleware, async (req, res) => {

    try {

const userId = req.user.userId;

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/jxl'];    

const { contentType } = req.body;

    if (!contentType) {
        return res.status(400).json({
            message: 'contentType is required'
    });
        }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)){
        return res.status(400).json({
            message: 'unsupported content type'
        })
    }

const randomId = crypto.randomUUID();
const folder = `avatars/${userId}`;
const publicId = randomId;
const timestamp = Math.floor(Date.now() / 1000);
const signature = cloudinary.utils.api_sign_request({
    
    timestamp: timestamp,
    folder: folder,
    public_id: publicId
},
    process.env.CLOUDINARY_API_SECRET
);

    return res.status(200).json({message:
        'Avatar upload authorization generated',

    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder:folder,
    publicId,
    contentType,
    maxSize:MAX_AVATAR_SIZE
    });} 
    
    catch (error) {
    console.error('Avatar presign error:',error);

    return res.status(500).json({message:
        'Failed to generate avatar upload authorization'
    });
}});


app.post('/users/me/avatar/confirm', middleware, async (req, res) => {
        
    try {
        
const userId = req.user.userId;

const { publicId } = req.body;

    if (!publicId) {
        return res.status(400).json({ message:
            'publicId is required'
                });
            }
            
const expectedPrefix =`avatars/${userId}/`;

    if (!publicId.startsWith(expectedPrefix)) {
        return res.status(403).json({
            message: 'Invalid avatar object'
                });
            } 

    let resource;

    try {resource =
        await cloudinary.api.resource(publicId,{
            resource_type: 'image',
            type: 'upload'
    });
    }

    catch (error) {if (error?.http_code === 404) {
        return res.status(404).json({message:
            'Uploaded avatar not found'
        }); 
    }
    throw error;
    }

    if (resource.resource_type !== 'image') {
        await cloudinary.uploader.destroy(
            publicId,
            {
            resource_type: 'image',
            type: 'upload'
            }
        );

    return res.status(400).json({message:
        'Uploaded object is not an image'
        });
    }

const allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'jxl'];
const actualFormat =resource.format?.toLowerCase();
  
    if (!allowedFormats.includes(actualFormat)) {
        await cloudinary.uploader.destroy(
            publicId,{
                resource_type: 'image',
                type: 'upload'
            }
        );

    return res.status(400).json({message:
        'Unsupported avatar format'
        });
    }

const actualSize = resource.bytes;

    if (
        typeof actualSize !== 'number' ||
        actualSize <= 0 ||
        actualSize > MAX_AVATAR_SIZE
        ) {
        await cloudinary.uploader.destroy(
            publicId,
        {
            resource_type: 'image',
            type: 'upload'
        });

    return res.status(400).json({message:
        'Avatar size exceeds allowed limit'
            });
        }

const formatToContentType = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    jxl: 'image/jxl'
    };

const actualContentType =formatToContentType[actualFormat];
const user = await User.findById(userId);

    if (!user) {
        await cloudinary.uploader.destroy(
            publicId,{
                resource_type: 'image',
                type: 'upload'
            });

    return res.status(404).json({message:
        'User not found'
    });
}

const oldAvatarPublicId =
    user.avatar?.publicId || null;

    user.avatar = {
    publicId: publicId,
    secureUrl: resource.secure_url,
    contentType: actualContentType,
    size: actualSize
    };

    await user.save();

    if (
        oldAvatarPublicId &&
        oldAvatarPublicId !== publicId
    ) {

    try {
    await cloudinary.uploader.destroy(
        oldAvatarPublicId,
        {
            resource_type: 'image',
            type: 'upload'
        });
    } 

    catch (deleteError) {
        console.error(
            'Failed to delete old avatar:',
                deleteError
            );}
        }

    return res.status(200).json({message:
        'Avatar updated successfully',
            avatar: {
                publicId:publicId,
                secureUrl:resource.secure_url,
                contentType:actualContentType,
                size:actualSize
            }
        });
    } 
    
    catch (error) {
        console.error(
            'Avatar confirmation error:', error
        );

    return res.status(500).json({message:
        'Failed to confirm avatar'
    });
}
});


app.delete('/users/me/delete', middleware, async (req, res) => {

    try {

const userId = req.user.userId;

const user = await User.findOne({
    _id: userId,
        deleted: false
    });

    if (!user) {
        return res.status(404).json({message: 
            'user not found'
        });
    }

    await user.updateOne(
        {
            _id: userId,
             deleted: true
        },
        {
            $set: {
                deleted: true,
                signedIn: false
            },
            $inc: {
                sessionVersion: 1,
                version: 1
            }
        }
    );

    await redis.del(`user:profile:${userId}`);

    await redis.del(`refreshToken:${userId}`);

    if (user.avatar?.publicId) {

        try {
            await cloudinary.uploader.destroy(
                    user.avatar.publicId,
                    {
                        resource_type: 'image',
                        type: 'upload'
                    }
                );

    } catch (cloudinaryError) {
        console.error(
            'Failed to delete avatar:',
            cloudinaryError
        );
    }
    const signoutStatus = await User.findOneAndUpdate(
        { $or: [{ username }, { email }] },
        { $set: { deleted: true } },
        { new: true }
    );
}

    return res.status(200).json({message:
        'account deleted'
    });
    } catch (error) {

    console.error(
        'delete account error:',
            error
        );

        return res.status(500).json({message: 
            'failed to delete account'
        });
    }
});


app.get('/users/:id/auth-activity', async (req, res) => {

    try {
        
const { id } = req.params;
const { eventType, from, to } = req.query;

const filter = {
    userId: new mongoose.Types.ObjectId(id)
    }

    if (eventType) {
        filter.eventType = eventType;
        }
    if (from || to) {
        filter.createdAt = {};
        if (from && to) {
            filter.createdAt.$gte = new Date(from);
            filter.createdAt.$lte = new Date(to);
        }
    }

const result = await AuthActivity.aggregate([{
    $match: filter
    },
        {
            $facet: {
                totalLogins: [
                    {
                        $count: 'count'
                    }
                ],
            loginTimestamps: [
                {
                    $sort: {
                        createdAt: -1
                        }
                },
                {
                    $project: {
                    _id: 0,
                    eventType: 1,
                    timestamp: '$createdAt'
                    }
                }
            ]
        }
    }
]);

const totalLogins =
    result[0].totalLogins.length > 0
    ? result[0].totalLogins[0].count
    :0;

    return res.status(200).json({
        userId: id,
        totalLogins,
        logins: result[0].loginTimestamps});
    }
 
    catch (error) {
        console.error('auth activity error:', error);

    return res.status(500).json({
        message: 'Internal server error'
    });
}
});

redis.connect().then(() => {
    console.log('connected to redis');
}).catch((err) => {
    console.log('error in connecting to redis', err);
}); 

app.listen(3000, () => {
    console.log('server is running http://localhost:3000');
});
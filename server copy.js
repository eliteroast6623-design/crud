const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = expres();
app.use = (cors());
app.use = (express.json());

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
});
// package imports 
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
require("dotenv").config();

// file imports 
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
const User = require("../models/User");
const OTP = require("../models/OTP");


// signup module 
const signUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, accountType, contactNumber, otp } = req.body;

        // validating feilds 
        if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
            return res.status(403).json({
                success: false,
                message: "All fields are required",
            })
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password and ConfirmPassword Value does not match, please try again',
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User is already registered',
            });
        }

        // check for the recent OTP
        const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);

        if (response.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'OTP NOT Found',
            })
        }
        else if (otp !== response[0].otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Encrypting password
        const hashedPassword = await bcrypt.hash(password, 10);

        let approved = "";
        approved === "Instructor" ? (approved = false) : (approved = true);

        // Create user profile
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumer: null,
        });

        const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password: hashedPassword,
            accountType: accountType,
            approved: approved,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
        })

        return res.status(200).json({                      //return res
            success: true,
            user,
            message: 'User is registered Successfully',
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "User cannot be registrered. Please try again",
        })
    }
}


//Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(403).json({
                success: false,
                message: 'Please Fill up All the Required Fields',
            });
        }


        const user = await User.findOne({ email }).populate("additionalDetails");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User is not registrered, please signup first",
            });
        }

        // Comparing the login password with DB password
        if (await bcrypt.compare(password, user.password)) {
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType,
            }

            // new token generated for user
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "20h"
            });

            user.token = token;

            const options = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: process.env.NODE_ENV === "production" ? true : false,
            }

            return res.cookie("token", token, options).status(200).json({
                success: true,
                token,
                user,
                message: 'Logged in successfully',
            })
        }
        else {
            return res.status(401).json({
                success: false,
                message: 'Password is incorrect',
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Login Failure, please try again',
        });
    }
};


//sendOTP
const sendOTP = async (req, res) => {

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(500).json({
                success: false,
                message: 'Mail Not Found!',
            })
        }

        const checkUserPresent = await User.findOne({ email });

        if (checkUserPresent) {
            return res.status(401).json({
                success: false,
                message: 'User already registered',
            })
        }

        // Generating OTP

        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        let result = await OTP.findOne({ otp: otp });

        while (result) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
            });
        }

        // Creating entry in DB 

        const otpPayload = { email, otp };

        await OTP.create(otpPayload);

        return res.status(200).json({
            success: true,
            message: 'OTP Sent Successfully',
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }

};


// Change Password
const changePassword = async (req, res) => {
    try {
        const userDetails = await User.findById(req.user.id);

        const { oldPassword, newPassword, confirmNewPassword } = req.body;

        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return res.status(500).json({
                success: false,
                message: "Missing Feilds."
            })
        }

        const isPasswordMatch = await bcrypt.compare(oldPassword, userDetails.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: "The password is incorrect" });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(401).json({ success: false, message: "The password and confirm password does not match" });
        }

        const encryptedPassword = await bcrypt.hash(newPassword, 10);

        const updatedUserDetails = await User.findByIdAndUpdate(req.user.id, { password: encryptedPassword }, { new: true });

        try {

            const emailResponse = await mailSender(updatedUserDetails.email, passwordUpdated(updatedUserDetails.email, `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`));

        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            });
        }

        return res.status(200).json({ success: true, message: "Password updated successfully" });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error occurred while updating password",
            error: error.message,
        });
    }
};


module.exports = { signUp, login, sendOTP, changePassword };



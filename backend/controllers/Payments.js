const User = require("../models/User")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const mailSender = require("../utils/mailSender")
const mongoose = require("mongoose")
const { instance } = require("../config/razorpay")
const {paymentSuccess} = require("../mail/templates/paymentSuccess.js")
const crypto = require("crypto")
const {courseEnrollmentEmail} = require('../mail/templates/courseEnrollmentEmail')

// create the order
exports.capturePayment = async (req, res) => {
    const { courses } = req.body;
    const userId = req.user.id;
    try {
        // validation of the body
        if (!courses || courses.length == 0) {
            return res.json({
                success: false,
                message: "Please Select the course to purchase."
            })
        }
        // calculate the cart total at the backend
        let totalAmount = 0;
        for (const course_id of courses) {
            let course;
            try {
                course = await Course.findById(course_id);
                if (!course) {
                    // place some error here
                    return res.json({
                        success: false,
                        message: 'Could not find the course',
                    });
                }
                // to check user already purchased the course
                const uid = new mongoose.Types.ObjectId(userId);
                if (course.studentsEnrolled.includes(uid)) {
                    // place some error here 
                    return res.status(200).json({
                        success: false,
                        message: 'Student is already enrolled',
                    });
                }
                totalAmount += course.price;
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    message: error.message,
                });
            }
        }
        const options = {
            amount: totalAmount * 100,
            currency: "INR",
            receipt: Math.random(Date.now()).toString()
        }

        // init the razor pay order with the options
        try {
            const paymentRes = await instance.orders.create(options);
            console.log(paymentRes)

            return res.status(200).json({
                success: true,
                message: "Success intilize order",
                currency: paymentRes.currency,
                amount: paymentRes.amount,
                id : paymentRes.id
            })
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

exports.sendPaymentSuccessEmail = async (req, res) => {
    const { amount, orderId, paymentId } = req.body
    const userId = req.user.id;

    // body validation
    if (!amount || !paymentId) {
        return res.status(400).json({
            success: false,
            message: 'Please provide valid payment details',
        });
    }

    // send successfull email to student
    try {
        const enrolledStudent = await User.findById(userId);
        await mailSender(enrolledStudent.email,
            `Study Notion Payment successful`,
            paymentSuccess(amount / 100, paymentId, orderId, enrolledStudent.firstName, enrolledStudent.lastName))
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

exports.verifySignature = async (req, res) => {
    // get and validate the payment details 

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const { courses } = req.body;
    const userId = req.user.id;


    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
            success: false,
            message: 'Payment details are incomplete',
        });
    }



    const enrolleStudent = async (courses, userId) => {
        if (!courses || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid courses and user ID',
            });
        }
        try {
            //update the course
            for (const course_id of courses) {
                const course = await Course.findByIdAndUpdate(
                    course_id,
                    { $push: { studentsEnrolled: userId } },
                    { new: true }
                );
                //update the user
                await User.updateOne(
                    { _id: userId },
                    { $push: { courses: course_id } },
                    { new: true }
                );
                //set course progress
                const newCourseProgress = new CourseProgress({
                    userID: userId,
                    courseID: course_id,
                })
                await newCourseProgress.save()

                //add new course progress to user
                await User.findByIdAndUpdate(userId, {
                    $push: { courseProgress: newCourseProgress._id },
                }, { new: true });

                //send email
                const recipient = await User.findById(userId);
                const courseName = course.courseName;
                const courseDescription = course.courseDescription;
                const thumbnail = course.thumbnail;
                const userEmail = recipient.email;
                const userName = recipient.firstName + " " + recipient.lastName;
                const emailTemplate = courseEnrollmentEmail(courseName, userName, courseDescription, thumbnail);
                await mailSender(
                    userEmail,
                    `You have successfully enrolled for ${courseName}`,
                    emailTemplate,
                );
            }
            return res.status(200).json({
                success: true,
                message: 'Payment successful',
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }


    }

    // verify the signature 
    try {
        const body = `${razorpay_order_id}|${razorpay_payment_id}`
        const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET).update(body.toString()).digest("hex");
        console.log("VERFYING SIGNATURE")
        if (generatedSignature === razorpay_signature) {
            await enrolleStudent(courses, userId);
            return res.status(200).json({  
                success : true, 
                message : "Payment Success"
            })
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Invalid Signature Found.",
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
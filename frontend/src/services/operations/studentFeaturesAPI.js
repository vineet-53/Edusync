import toast from "react-hot-toast";
import edusync from "../../assets/Logo/logo"
import { apiConnector } from "../apiconnector";
import { courseEndpoints } from "../apis";
import { resetCart } from "../../slices/cartSlice";

// embedding the razorpay script for the razorpay UI
function loadScript(src) {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;

        script.onload = () => {
            resolve(true);
        }
        script.onerror = () => {
            resolve(false);
        }
        document.body.appendChild(script);
    })
}

// generate the checkout stage 1
// or init the order
export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
    const toastId = toast.loading("Loading...")

    try {
        if (!await loadScript("https://checkout.razorpay.com/v1/checkout.js")) {
            toast.error("SDK failed loading")
            return;
        }

        const orderResponse = await apiConnector("POST", courseEndpoints.COURSE_PAYMENT_API, { courses }, {
            Authorization: `Bearer ${token}`
        });

        if (!orderResponse.data.success) {
            throw new Error(orderResponse.data.message);
        }

        console.log("PRINTING ORDER", orderResponse);

        const options = {
            key: process.env.RAZORPAY_KEY,
            currency: orderResponse.data.message.currency,
            amount: `${orderResponse.data.message.amount}`,
            order_id: orderResponse.data.message.id,
            name: "Edusync",
            description: "Thank You for Purchasing the Course",
            image: edusync,
            prefill: {
                name: `${userDetails.firstName}`,
                email: userDetails.email
            },
            handler: function (response) {
                sendPaymentSuccessEmail(response, orderResponse.data.message.amount, token);
                verifyPayment({ ...response, courses }, token, navigate, dispatch);
            }
        }
    }
    catch (err) {
        toast.error("Error making payment")
    }
    finally {
        toast.dismiss(toastId)
    }
}

async function sendPaymentSuccessEmail(response, amount, token) {
    try{
        await apiConnector("POST", courseEndpoints.SEND_PAYMENT_SUCCESS_EMAIL_API, {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            amount,
        },{
            Authorization: `Bearer ${token}`
        })
    }
    catch(error) {
        console.log("PAYMENT SUCCESS EMAIL ERROR....", error);
    }
}


async function verifyPayment(bodyData, token, navigate, dispatch) {
    const toastId = toast.loading("Verifying Payment....");
    dispatch(setPaymentLoading(true));
    try{
        const response  = await apiConnector("POST", courseEndpoints.COURSE_VERIFY_API, bodyData, {
            Authorization:`Bearer ${token}`,
        })

        if(!response.data.success) {
            throw new Error(response.data.message);
        }
        toast.success("payment Successful, ypou are addded to the course");
        navigate("/dashboard/enrolled-courses");
        dispatch(resetCart());
    }   
    catch(error) {
        console.log("PAYMENT VERIFY ERROR....", error);
        toast.error("Could not verify Payment");
    }
    toast.dismiss(toastId);
    dispatch(setPaymentLoading(false));
}
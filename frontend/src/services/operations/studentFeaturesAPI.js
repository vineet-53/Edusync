import toast from "react-hot-toast";
import edusync from "../../assets/Logo/logo"
import { apiConnector } from "../apiconnector";
import { studentEndpoints } from "../apis";
import { resetCart } from "../../slices/cartSlice";
import { setPaymentLoading } from "../../slices/courseSlice";
const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY;


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
        let res = await loadScript("https://checkout.razorpay.com/v1/checkout.js")
        if (!res) {
            toast.error("SDK failed loading")
            return;
        }
        console.log("SDK success")

        const orderResponse = await apiConnector("POST", studentEndpoints.COURSE_PAYMENT_API, { courses }, {
            Authorization: `Bearer ${token}`
        });

        if (!orderResponse.data.success) {
            throw new Error(orderResponse.data.message);
        }

        console.log("PRINTING ORDER", orderResponse);

        const options = {
            key: razorpayKey,
            currency: orderResponse.data.currency,
            amount: `${orderResponse.data.amount}`,
            order_id: orderResponse.data.id,
            name: "Edusync",
            description: "Thank You for Purchasing the Course",
            image: edusync,
            prefill: {
                name: `${userDetails.firstName}`,
                email: userDetails.email
            },
            handler: function (response) {
                sendPaymentSuccessEmail(response, orderResponse.data.amount, token);
                verifyPayment({ ...response, courses }, token, navigate, dispatch);
            }
        }

        const paymentObject = new window.Razorpay(options); 
        await paymentObject.open(); 
        paymentObject.on("payment.failed", function (response) {
            toast.error("Payment Failed")
        })
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
        await apiConnector("POST", studentEndpoints.SEND_PAYMENT_SUCCESS_EMAIL_API, {
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
        console.log("BODYDATA" , bodyData)
        const response  = await apiConnector("POST", studentEndpoints.COURSE_VERIFY_API, bodyData, {
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

const otpService = {
    generateOTP: () => {
        // Generate a 6-digit OTP
        return Math.floor(100000 + Math.random() * 900000).toString();
    },
    sendOTP: async (phone_no, otp) => {
        // Integrate with an SMS API to send the OTP
        console.log(`Sending OTP ${otp} to ${phone_no}`);
        // Implementation for sending OTP to the user’s phone number
    }
};

export default otpService;

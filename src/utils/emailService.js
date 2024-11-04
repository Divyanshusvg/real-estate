// import nodemailer from 'nodemailer';
// import {ApiError} from './ApiError.js'; // Adjust path as needed
//  // Adjust path as needed

// // Configure Nodemailer transporter
// const transporter = nodemailer.createTransport({
//     host: process.env.MAIL_HOST,
//     port: process.env.MAIL_PORT,
//     auth: {
//         user: process.env.MAIL_USERNAME,
//         pass: process.env.MAIL_PASSWORD
//     }
// });

// const sendEmail = async (to, subject, text) => {
//     const mailOptions = {
//         from: process.env.MAIL_FROM_ADDRESS,
//         to,
//         subject,
//         text
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//     } catch (error) {
//         console
//         .log()
//         throw new ApiError(500, 'Error sending email',[error]);
//     }
// };

// export {
//     sendEmail
// };

import nodemailer from 'nodemailer';
import { ApiError } from './ApiError.js'; 
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in an ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Nodemailer transporter
// const transporter = nodemailer.createTransport({
//     host: process.env.MAIL_HOST,
//     port: process.env.MAIL_PORT,
//     auth: {
//         user: process.env.MAIL_USERNAME,
//         pass: process.env.MAIL_PASSWORD
//     }
// });


const transporter = nodemailer.createTransport({
    service: "SMTP",
    host: process.env.MAIL_HOST,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

// Function to replace placeholders in the template
const replaceTemplatePlaceholders = (template, variables) => {
    let output = template;
    console.log("variable ", variables)
    for (const key in variables) {
        const placeholder = `{{${key}}}`;
        output = output.replace(new RegExp(placeholder, 'g'), variables[key]);
    }
    return output;
};

const sendEmail = async (to, subject, variables) => {
    let template;
    try {
        const templatePath = path.join(__dirname, './templates.html');
        template = fs.readFileSync(templatePath, 'utf8');
    } catch (fileError) {
        throw new ApiError(500, 'Error loading email template', [fileError]);
    }

    try {
        // Replace placeholders with actual content
        const htmlContent = replaceTemplatePlaceholders(template, variables);
        const mailOptions = {
            from: process.env.MAIL_FROM_ADDRESS,
            to,
            subject,
            html: htmlContent
        };
        console.log(htmlContent)
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new ApiError(500, 'Error sending email', [error]);
    }
};

export {
    sendEmail
};

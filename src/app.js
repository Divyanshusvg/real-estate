import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import path from 'path'
import expressEjsLayouts from "express-ejs-layouts"
import { errorHandler } from "./utils/errorHandler.js"
import { fileURLToPath } from "url"
import AdminSeeder from "../seeders/AdminSeeder.js"
const app = express()

app.use(cors({
    origin: ['http://83.136.219.131' ,'http://localhost:3000'],
    credentials: true
}))

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set the views directory and engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.use(expressEjsLayouts);


app.use(express.json({limit: "24kb"}))
app.use(express.urlencoded({extended: true, limit: "24kb"}))
// app.use(express.static("public"))
app.use(cookieParser())
app.locals.siteUrl = process.env.SITE_URL;

//routes import
import userRouter from './routes/user.routes.js'

import adminRouter from './routes/admin.routes.js'

import otherRouter from './routes/other.routes.js'
//routes declaration

app.use("/api/v1/users", userRouter ,errorHandler)
app.use("/api/v1/users/other", otherRouter ,errorHandler)
app.use("/", adminRouter , errorHandler )


// http://localhost:8000/api/v1/users/register

export { app }
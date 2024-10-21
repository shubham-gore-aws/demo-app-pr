require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // To generate a reset token
const app = express();

app.use(bodyParser.json());
app.use(cors());

const connections = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connections.connect((err) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Database connected successfully!");
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password or app password
  },
});

// POST route to handle registration and send password via email
app.post("/Login", (req, res) => {
  const {
    first_name, middle_name, last_name, gender, graduation, mobile_number, alternate_mobile_no, email, permanent_address, temporary_address, district, state, student_id,
     course, passout_year, graduation_percentage, date_of_registration, dob, pincode,password,
  } = req.body;

  const sql = `
        INSERT INTO registrations
        (first_name, middle_name, last_name, gender, graduation, mobile_number, alternate_mobile_no,
         email, permanent_address, temporary_address, district, state, student_id, course, passout_year,
         graduation_percentage, date_of_registration, dob, pincode, password) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  connections.query(
    sql,
    [
      first_name,  middle_name,  last_name,  gender,  graduation,  mobile_number,  alternate_mobile_no,  email,  permanent_address,
      temporary_address,  district,  state,  student_id,  course,  passout_year,  graduation_percentage, date_of_registration, dob, pincode, password,
    ],
    (err) => {
      if (err) {
        console.log("Error inserting data:", err);
        return res.status(500).send("Error inserting data");
      }

      // Send email with the password
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email, // Send email to the registered email
        subject: "Your Registration Password",
        text: `Hello ${first_name},\n\nYour registration was successful. Your password is: ${password}\n\nPlease keep this password safe.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email:", error);
          return res.status(500).send("Error sending email");
        }
        console.log("Email sent:", info.response);
        res.send("Data inserted and email sent successfully");
      });
    }
  );
});

// Student login route to compare email and password
app.post("/studentlogin", (req, res) => {
  const { email, password } = req.body;
  const sql = `SELECT first_name, last_name FROM registrations WHERE email = ? AND password = ?`;

  connections.query(sql, [email, password], (err, results) => {
    if (err) {
      console.log("Error fetching data:", err);
      return res.status(500).send("Error during login");
    }

    if (results.length > 0) {
      console.log("Login successful");
      res.send({
        success: true,
        first_name: results[0].first_name,
        last_name: results[0].last_name,
      });
    } else {
      console.log("Invalid email or password");
      res.status(401).send("Invalid email or password");
    }
  });
});

// Forgot Password route
app.post("/forgotpassword", (req, res) => {
  const { email } = req.body;

  const sql = `SELECT * FROM registrations WHERE email = ?`;
  connections.query(sql, [email], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Server error");
    }

    if (result.length === 0) {
      return res.status(404).send("Email not found");
    }

    // Generate a reset token (you can store this in the database or generate a reset link)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store the reset token temporarily or implement your own token expiration logic.
    const resetLink = `http://localhost:4000/resetpassword?token=${resetToken}`;

    // Send reset email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `Hello,\n\nYou requested to reset your password. Please click the link below to reset it:\n${resetLink}\n\nIf you didn't request this, please ignore this email.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        return res.status(500).send("Error sending email");
      }

      console.log("Reset link sent:", info.response);
      res.status(200).send("Password reset link sent to your email");
    });
  });
});

app.get("/studentdbdata/:email", (req, res) => {
  const email = req.params.email;
  const sql = `SELECT first_name, last_name FROM registrations WHERE email = ?`;

  connections.query(sql, [email], (err, results) => {
    if (err) {
      console.log("Error fetching data:", err);
      return res.status(500).send("Error fetching data");
    }

    if (results.length > 0) {
      console.log("Data fetched successfully");
      res.send(results[0]); // Send the first student's data
    } else {
      res.status(404).send("Student not found");
    }
  });
});

// Use for fetching student data for student panel
app.get("/studentprofile/:email", (req, res) => {
  const email = req.params.email;
  const sql = `SELECT * FROM registrations WHERE email = ?`; // Use WHERE clause to filter by email

  connections.query(sql, [email], (err, results) => {
    if (err) {
      console.log("Error fetching data:", err);
      return res.status(500).send("Error fetching data");
    }

    if (results.length > 0) {
      console.log("Data fetched successfully");
      res.send(results[0]); // Send the first matching student
    } else {
      res.status(404).send("Student not found");
    }
  });
});

// Get all registrations for student panel
app.get("/bdinfo", (req, res) => {
  const sql = `SELECT * FROM registrations`; // Use SELECT * to fetch all columns
  connections.query(sql, (err, results) => {
    if (err) {
      console.log("Error fetching data:", err);
      return res.status(500).send("Error fetching data");
    }

    if (results.length > 0) {
      console.log("Data fetched successfully");
      res.status(200).json(results);
    } else {
      res.status(404).send("Student not found");
    }
  });
});

const PORT = 4000||5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

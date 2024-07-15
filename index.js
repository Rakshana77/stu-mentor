const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
dotenv.config();

const app = express();
app.use(bodyParser.json());

// MongoDB connection
mongoose
    .connect(
        `mongodb+srv://sonarakshana:${process.env.password}@cluster0.mn2mrge.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
    )
    .then(() =>
        app.listen(4000, () =>
            console.log("connected to database and server is running")
        )
    ).catch((e) => console.log(e));

// Define schemas
const mentorSchema = new mongoose.Schema({
  name: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
});

const studentSchema = new mongoose.Schema({
  name: String,
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor" },
  previousMentors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Mentor" }],
});

// Define models
const Mentor = mongoose.model("Mentor", mentorSchema);
const Student = mongoose.model("Student", studentSchema);

// API to create Mentor
app.post("/mentors", async (req, res) => {
  try {
    const mentor = new Mentor(req.body);
    await mentor.save();
    res.status(201).send(mentor);
  } catch (error) {
    res.status(400).send(error);
  }
});

// API to create Student
app.post("/students", async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).send(student);
  } catch (error) {
    res.status(400).send(error);
  }
});

// API to assign multiple students to a mentor
app.post("/mentors/:mentorId/students", async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.mentorId);
    if (!mentor) {
      return res.status(404).send("Mentor not found");
    }

    // Find student ObjectIds based on names
    const students = await Student.find({
      name: { $in: req.body.studentNames },
      mentor: { $exists: false },
    });

    if (students.length !== req.body.studentNames.length) {
      return res.status(400).send("One or more students already have a mentor or do not exist");
    }

    students.forEach((student) => {
      student.mentor = mentor._id;
    });
    await Student.bulkSave(students);

    mentor.students.push(...students.map((student) => student._id));
    await mentor.save();

    res.status(200).send(mentor);
  } catch (error) {
    res.status(400).send(error);
  }
});

// API to assign/change mentor for a particular student
app.post("/students/:studentId/mentor", async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    const mentor = await Mentor.findById(req.body.mentorId);

    if (!student || !mentor) {
      return res.status(404).send("Student or Mentor not found");
    }

    if (student.mentor) {
      student.previousMentors.push(student.mentor);
    }

    student.mentor = mentor._id;
    await student.save();

    res.status(200).send(student);
  } catch (error) {
    res.status(400).send(error);
  }
});

// API to show all students for a particular mentor
app.get("/mentors/:mentorId/students", async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.mentorId).populate(
      "students"
    );
    if (!mentor) {
      return res.status(404).send("Mentor not found");
    }

    res.status(200).send(mentor.students);
  } catch (error) {
    res.status(400).send(error);
  }
});

// API to show the previously assigned mentors for a particular student
app.get("/students/:studentId/previous-mentors", async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).populate(
      "previousMentors"
    );
    if (!student) {
      return res.status(404).send("Student not found");
    }

    res.status(200).send(student.previousMentors);
  } catch (error) {
    res.status(400).send(error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const  { Mongoose } = require("mongoose");
const mongoose = require('mongoose')

const Category = require("../models/Category");

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // created entry in Category in DB;
    const CategorysDetails = await Category.create({
      name: name,
      description: description,
    });

    return res.status(400).json({ success: true, message: "Categorys Created Successfully" });
  }
  catch (error) {
    return res.status(500).json({
      success: true,
      message: error.message,
    });
  }
};


exports.showAllCategories = async (req, res) => {
  try {

    const allCategories = await Category.find({});

    return res.status(200).json({ success: true, data: allCategories });
  }
  catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


//categoryPageDetails 
exports.categoryPageDetails = async (req, res) => {
  try {

    const { categoryId } = req.body

    if(!categoryId) { 
      return res.status(500).json({ message : "Missing Category id." , success : false})
    }

    // find and populate the category using categoryId and populate.
    const selectedCategory = await Category.findById(categoryId)
      .populate({
        path: "courses",
        match: { status: "Published" },
        populate: "ratingAndReviews",
      })
      .exec()

    if (!selectedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" })
    }

    if (selectedCategory.courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No courses found for the selected category.",
      })
    }

    // other categories than current
    const categoriesExceptSelected = await Category.find({ _id: { $ne: categoryId }, })

    // finding random category other than current

    const categoryIds = categoriesExceptSelected.flatMap(category => category._id)

    const randomCategory = categoryIds[getRandomInt(categoryIds.length)]

    const randomCategoryId = new mongoose.Types.ObjectId(randomCategory)

    let differentCategory = await Category.findOne(randomCategoryId)
      .populate({
        path: "courses",
        match: { status: "Published" },
      })
      .exec()

    console.log("THIS IS FOR TESTING DIFFERENT CATEGORY" , differentCategory)

    // find all categories
    const allCategories = await Category.find()
      .populate({
        path: "courses",
        match: { status: "Published" },
        populate: {
          path: "instructor",
        },
      })
      .exec()

    const allCourses = allCategories.flatMap((category) => category.courses)

    const mostSellingCourses = allCourses.sort((a, b) => b.sold - a.sold).slice(0, 10)

    return res.status(200).json({
      success: true,
      data: { selectedCategory, differentCategory, mostSellingCourses, },
    })
  }
  catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}
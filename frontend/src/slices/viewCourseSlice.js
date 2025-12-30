import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    course : null , courseId : null, courseSectionData: [], courseEntireData: [], completedLectures: [], totalDuration : null
}

const viewCourseSlice = createSlice({
    name: "viewCourse",
    initialState,
    reducers: {
        setCourseSectionData : (state , value) => { 
            state.courseSectionData = value.payload
        },
        setCourseEntireData : (state , value) => { 
            state.courseEntireData = value.payload
        }
        , setCompletedLecture : (state, value) => { 
            state.completedLectures = value.payload
        }
        , setTotalDuration : (state , value) => { 
            state.totalDuration = value.payload
        }
        , setCourseId : (state , value) => { 
            state.courseId = value.payload
        }, 
        setCourse : (state , value) => {
            state.course = value.payload
        }
    },
})

export const { setCourse , setCourseId, setCourseEntireData, setCompletedLecture, setCourseSectionData, setTotalDuration } = viewCourseSlice.actions


export default viewCourseSlice.reducer
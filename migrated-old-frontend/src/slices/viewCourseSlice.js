import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    courseId : null, courseSectionData: [], courseEntireData: [], completedLectures: [], totalDuration : null
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
    },
})

export const { setCourseId, setCourseEntireData, setCompletedLecture, setCourseSectionData, setTotalDuration } = viewCourseSlice.actions


export default viewCourseSlice.reducer
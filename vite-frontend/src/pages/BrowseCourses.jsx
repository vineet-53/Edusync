import { useEffect, useState } from "react"
import { getAllCourses } from "../services/operations/courseDetailsAPI"
import Course_Card from "../components/core/Catalog/Course_Card"

export default function BrowseCourses() {
    const [loading,setLoading] = useState(false)
    const [courses , setCourses] = useState(null)
    async function fetchCourses() { 
        const result = await getAllCourses(); 
        setCourses(result);
    }

    useEffect(() => {
        fetchCourses();
    }, [])


    if(courses?.length == 0) { 
        return <h1 className="text-white font-bold text-3xl mx-32 my-28">No Courses Are Found!</h1>
    }
    if(!courses)  
    { 
        return <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    }

    return <>
    <div className="flex gap-10 h-3/5 m-32">
        {courses?.map((course, ind) => { 
            return <Course_Card course={course} key={ind} />
        })}
    </div>
    </>
}
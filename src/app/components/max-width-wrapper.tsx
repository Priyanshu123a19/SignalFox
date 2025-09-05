import { cn } from "@/utils"
import { ReactNode } from "react"

interface MaxWidthWrapperProps {
    className?: string
    children: ReactNode
}

//a basic theory on how the cn thing of tailswind work
//basically if i want the div to have a default styling and when i pass it into some other thing or page or div or whatever then i want to overwrite or it to have some other styling i can just pass in a className prop and it will merge with the default ones
//in this way we dont confuse the tailswind with multiple classes and its gets to know what it has to use on what point where this function is being called

export const MaxWidthWrapper = ({
    className,
    children
}: MaxWidthWrapperProps)=> {
    return (
    <div 
        className={cn("h-full mx-auto w-full max-w-screen-xl px-2.5 md:px-20", className)}>
            {children}
    </div>)
}
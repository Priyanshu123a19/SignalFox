import { db } from "@/db"
import { j } from "./__internals/j"
import { currentUser } from "@clerk/nextjs/server"
import { HTTPException } from "hono/http-exception"


/**
 * Public (unauthenticated) procedures
 *
 * This is the base piece you use to build new queries and mutations on your API.
 */

const authMiddleware = j.middleware(async ({c,next})=>{
    const authHeader = c.req.header("Authorization")

    if(authHeader) {
        const apiKey=authHeader.split(" ")[1] //bearer <API_KEY> split because the header for authorization is alwayslike this ans we want the apikey to get the user now so we split it up

        const user = await db.user.findUnique({
            where : {
                apiKey
            }
        })
        //adding the user in the context so that the next function can get the user in the ctx
        if(user){
            return next({user})
        }
    }
    //if not by the authheader then we will find the user in the normal fashion
    const auth = await currentUser()

    if(!auth){
        throw new HTTPException(401 , {message: "Unauthorized"})
    }

    const user = await db.user.findUnique({
        where: {
            externalId: auth.id
        },
    })
    if(!user){
        throw new HTTPException(401 , {message: "Unauthorized"})
    }

    return next({user})
})


export const baseProcedure = j.procedure
export const publicProcedure = baseProcedure
export const privateProcedure = baseProcedure.use(authMiddleware)

import { currentUser } from "@clerk/nextjs/server"
import {router} from "../__internals/router"
import {privateProcedure, publicProcedure} from "../procedures"
import { db } from "@/db";


//this router over here what it does is that it fetches the database sync status
//so that the user also gets synced in out database and also gets signed in through clerk auth.

export const authRouter = router({
    getDatabaseSyncStatus: privateProcedure.query(async({c , ctx})=>{
        //the ctx over here is providing us the current user
        //why this happens
        //because the auth middleware runs
        //all this is because the route is private and in the procedures we have defined the middleware the runs and then only authenticates the user and sends back the user in the context ctx that we got over here
        //if this was a public route then this wouldnt have been possible because there would be no user in the context because the auth middleware doesnt run in the public procedures

        const auth = await currentUser();

        if(!auth){
            return c.json({isSynced: false})
        }

        const user = await db.user.findFirst({
            where: {
                externalId: auth.id
            }
        });

        if(!user){
            //if the user does not exist then we will create a new user and then add it to our database
            await db.user.create({
                data: {
                    quotaLimit:100,
                    email: auth.emailAddresses[0].emailAddress,
                    externalId: auth.id
                }
            });
            return c.json({isSynced: true})
        }

        return c.json({isSynced: true})
    }),
})





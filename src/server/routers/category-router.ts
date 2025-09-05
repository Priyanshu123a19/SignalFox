import { db } from "@/db";
import { router } from "../__internals/router";
import { privateProcedure } from "../procedures";
import {startOfDay, startOfMonth, startOfWeek} from "date-fns";
import z from "zod";
import { parseColor } from "@/lib/utils";
import { CATEGORY_NAME_VALIDATOR } from "@/lib/validators/category_validator";
import { HTTPException } from "hono/http-exception";


export const categoryRouter = router({
    getEventCategories: privateProcedure.query(async ({c,ctx})=>{
        //explaining a bit about ctx
        //it contains all the info that is passed down by the middlewares that were executed before this handler
        //and the c contains all the context that is specific to the current request the headers or any kinda thing that was passed down by the req the c has it all
        //eg the auth middleware called in the privateprocedure will pass the user so u can get the user from the ctx and suppose the i sent the username in the headers then i can get it from c

        const categories = await db.eventCategory.findMany({
            where: {userId: ctx.user.id},
            select: {
                id: true,
                name: true,
                emoji: true,
                color: true,
                updatedAt: true,
                createdAt: true
            },
            orderBy: {
                updatedAt: "desc"
            }
        })

        //geting the amount of events that were made recently 
        const categoriesWithCounts = await Promise.all(categories.map(async(category)=>{
            const now = new Date();
            //using the date.fns librarary to deal wth dates because the dates is a lot of pain in the typescript
            const firstDayOfMonth=startOfMonth(now);

            //now over here we have made the query in order to extract the main unique type of events,evnt count in them,also the latest / last signal that we have used aka the last event that we have signaled


            const [uniqueFieldCount,eventsCount, lastPing]= await Promise.all([
                db.event.findMany({
                    where: {
                        EventCategory: {id: category.id},
                        createdAt: {
                            gte: firstDayOfMonth,
                        }
                    },
                    select: {fields: true},
                    distinct: ["fields"]
                }).then((events)=> {
                    const fieldNames = new Set<string>();
                    events.forEach((event) => {
                        Object.keys(event.fields as object).forEach((fieldName)=>{
                            fieldNames.add(fieldName);
                        })
                    })
                    return fieldNames.size;
                }),
                db.event.count( {
                    where: {
                        EventCategory: {id: category.id},
                        createdAt: {
                            gte: firstDayOfMonth,
                        }
                    },
                }),
                db.event.findFirst({
                    where: {
                        EventCategory: {id: category.id}
                    },
                    orderBy: {
                        createdAt: "desc"
                    },
                    select: {
                        createdAt: true
                    }
                })
            ])
            return {
                ...category,
                uniqueFieldCount,
                eventsCount,
                lastPing: lastPing?.createdAt || null
            }
        }))

        //for more advanced data returns and more typing safety we use superjson thats all its just a super version of json that includes type information and more powerful
        return c.superjson({categories: categoriesWithCounts});    
    }),

    deleteCategory:privateProcedure
    .input(z.object({name: z.string()}))
    .mutation(async({c,input,ctx})=>{
        const {name} = input;
        //deleting the category from the database
        await db.eventCategory.delete({
            where: {
                name_userId: {
                    name,userId: ctx.user.id
                }
            }
        })

        return c.superjson({success: true});
    }),
    createEventCategory: privateProcedure
    .input(
      z.object({
        name: CATEGORY_NAME_VALIDATOR,
        color: z
          .string()
          .min(1, "Color is required")
          .regex(/^#[0-9A-F]{6}$/i, "Invalid color format."),
        emoji: z.string().emoji("Invalid emoji").optional(),
      })
    )
    .mutation(async ({ c, ctx, input }) => {
  const { user } = ctx
  const { color, name, emoji } = input

  try {
    console.log("Input values:", { color, name, emoji })
    console.log("Parsed color:", parseColor(color))
    
    const eventCategory = await db.eventCategory.create({
      data: {
        name: name.toLowerCase(),
        color: parseColor(color),
        emoji,
        userId: user.id,
      },
    })

    console.log("Created category:", eventCategory)
    return c.json({ eventCategory })
  } catch (error) {
    console.error("Error creating category:", error)
    throw error
  }
}),

insertQuickstartCategories: privateProcedure.mutation(async ({ ctx, c }) => {
    const categories = await db.eventCategory.createMany({
      data: [
        { name: "bug", emoji: "🐛", color: 0xff6b6b },
        { name: "sale", emoji: "💰", color: 0xffeb3b },
        { name: "question", emoji: "🤔", color: 0x6c5ce7 },
      ].map((category) => ({
        ...category,
        userId: ctx.user.id,
      })),
    })

    return c.json({ success: true, count: categories.count })
  }),

  pollCategory: privateProcedure
    .input(z.object({ name: CATEGORY_NAME_VALIDATOR }))
    .query(async ({ c, ctx, input }) => {
      const { name } = input

      const category = await db.eventCategory.findUnique({
        where: { name_userId: { name, userId: ctx.user.id } },
        include: {
          _count: {
            select: {
              events: true,
            },
          },
        },
      })

      if (!category) {
        throw new HTTPException(404, {
          message: `Category "${name}" not found`,
        })
      }

      const hasEvents = category._count.events > 0

      return c.json({ hasEvents })
    }),

    getEventsByCategoryName: privateProcedure
    .input(
      z.object({
        name: CATEGORY_NAME_VALIDATOR,
        page: z.number(),
        limit: z.number().max(50),
        timeRange: z.enum(["today", "week", "month"]),
      })
    )
    .query(async ({ c, ctx, input }) => {
      const { name, page, limit, timeRange } = input

      const now = new Date()
      let startDate: Date

      switch (timeRange) {
        case "today":
          startDate = startOfDay(now)
          break
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 0 })
          break
        case "month":
          startDate = startOfMonth(now)
          break
      }

      const [events, eventsCount, uniqueFieldCount] = await Promise.all([
        db.event.findMany({
          where: {
            EventCategory: { name, userId: ctx.user.id },
            createdAt: { gte: startDate },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        db.event.count({
          where: {
            EventCategory: { name, userId: ctx.user.id },
            createdAt: { gte: startDate },
          },
        }),
        db.event
          .findMany({
            where: {
              EventCategory: { name, userId: ctx.user.id },
              createdAt: { gte: startDate },
            },
            select: {
              fields: true,
            },
            distinct: ["fields"],
          })
          .then((events) => {
            const fieldNames = new Set<string>()
            events.forEach((event) => {
              Object.keys(event.fields as object).forEach((fieldName) => {
                fieldNames.add(fieldName)
              })
            })
            return fieldNames.size
          }),
      ])

      return c.superjson({
        events,
        eventsCount,
        uniqueFieldCount,
      })
    }),
    
})
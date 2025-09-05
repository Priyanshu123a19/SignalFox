import { db } from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardPage } from "../components/dashboard-page";
import { DashboardPageContent } from "./dashboard-page-content";
import { CreateEventCategoryModal } from "../components/create-event-category-modal";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { createCheckoutSession } from "../lib/stripe";
import { PaymentSuccessModal } from "../components/payment-success-modal";

interface PageProps {
  searchParams: {
    [key: string]: string | string[] | undefined
  }
}

const page= async ({searchParams}:PageProps) => {

    const auth = await currentUser();

    if(!auth){
        redirect("/sign-in");
    }

    const user = await db.user.findUnique({
        where: {
            externalId: auth.id
        }
    })

    if(!user){
        redirect("/sign-in");
    }

    //the concept taht we are using over here is that
    //firwst we have this server side page that is loading thing for us according to the thing that we need
    //suppose we are loading the apikey page in this dashboard page content...like this could be anything that we want to load in this wrapper like thing
    //so this will act as a wrapper that will fetch out the things like a server component then send out that data to the page that is being rendrered in this page if apikey page then its conent
    //if some other page then its content.
    const intent = searchParams.intent

  if (intent === "upgrade") {
    const session = await createCheckoutSession({
      userEmail: user.email,
      userId: user.id,
    })

    if (session.url) redirect(session.url)
  }

  const success = searchParams.success


    return <>
      {success ? <PaymentSuccessModal /> : null}

      <DashboardPage
        cta={
          <CreateEventCategoryModal>
            <Button className="w-full sm:w-fit">
              <PlusIcon className="size-4 mr-2" />
              Add Category
            </Button>
          </CreateEventCategoryModal>
        }
        title="Dashboard"
      >
        <DashboardPageContent />
      </DashboardPage>
    </>
}

export default page;
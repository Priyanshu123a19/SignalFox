"use client"

import { SignIn } from "@clerk/nextjs"

const Page = () => {
  
  const searchParams = new URLSearchParams();
  const intent = searchParams.get("intent");

  return (
    <div className="w-full flex-1 flex items-center justify-center">
      <SignIn forceRedirectUrl={intent ? `/dashboard?intent=${intent}` : "/dashboard"} />
    </div>
  )
}

export default Page
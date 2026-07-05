"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("tc_token") : null;
    router.push(token ? "/dashboard" : "/login");
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProjectResponse {
  id: string;
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const createProject = async () => {
      try {
        const response = await fetch(`/api/generate`, {
          method: "POST",
        });
        const data = (await response.json()) as ProjectResponse;
        router.push(`/${data.id}`);
      } catch (error) {
        console.error("Failed to create project:", error);
      }
    };

    createProject();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Creating your project...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}
